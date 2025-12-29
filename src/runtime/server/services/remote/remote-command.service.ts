import { injectable, inject } from 'tsyringe'
import { CommandMetadata } from '../../decorators/command'
import { getRuntimeContext } from '../../runtime'
import { CommandExecutionPort, type CommandInfo } from '../ports/command-execution.port'
import type { CoreCommandsExports } from '../../types/core-exports'
import { Player } from '../../entities'
import { loggers } from '../../../../kernel/shared/logger'
import { IExports } from '../../../../adapters/contracts/IExports'
import { AppError } from '../../../../kernel/utils'
import { generateSchemaFromTypes } from '../../system/schema-generator'
import z from 'zod'

/**
 * Stored command entry with full metadata for local validation.
 */
interface CommandEntry {
  meta: CommandMetadata
  handler: Function
}

/**
 * Remote command service for RESOURCE mode.
 *
 * @remarks
 * In RESOURCE mode, this service:
 * - Stores command handlers and metadata locally in the resource
 * - Registers command metadata with CORE via exports
 * - Executes handlers when invoked by CORE via net event
 * - Validates arguments using Zod schemas (same as CommandService)
 *
 * Flow:
 * 1. Resource declares @Command → metadata registered with CORE
 * 2. Player executes command → CORE validates security and emits event to resource
 * 3. Resource receives event → validates schema → executes handler
 *
 * Security validation is split:
 * - CORE validates: @Guard (rank/permission), @Throttle (rate limit), @RequiresState
 * - RESOURCE validates: Zod schema (not serializable, must be local)
 */
@injectable()
export class RemoteCommandService extends CommandExecutionPort {
  private commands = new Map<string, CommandEntry>()

  constructor(@inject(IExports as any) private exportsService: IExports) {
    super()
  }

  /**
   * Gets typed access to CORE resource exports.
   */
  private get core(): CoreCommandsExports {
    const { coreResourceName } = getRuntimeContext()
    const coreExports = this.exportsService.getResource<CoreCommandsExports>(coreResourceName)

    if (!coreExports) {
      throw new Error(
        `[OpenCore] CORE resource '${coreResourceName}' exports not found. ` +
          `Ensure the CORE resource is started BEFORE RESOURCE mode resources. ` +
          `Add 'ensure ${coreResourceName}' before this resource in server.cfg`,
      )
    }

    return coreExports
  }

  /**
   * Registers a command handler locally and with CORE.
   *
   * @remarks
   * The handler and full metadata are stored locally for schema validation.
   * Only serializable metadata is sent to CORE for security validation.
   */
  register(metadata: CommandMetadata, handler: Function): void {
    const commandKey = metadata.command.toLowerCase()

    // Store handler with full metadata locally (for schema validation)
    this.commands.set(commandKey, {
      meta: metadata,
      handler,
    })

    // Register metadata with CORE (security only, schema is not serializable)
    this.core.registerCommand({
      command: metadata.command,
      description: metadata.description,
      usage: metadata.usage,
      isPublic: metadata.isPublic ?? false,
      resourceName: GetCurrentResourceName(),
      security: metadata.security,
    })

    const publicFlag = metadata.isPublic ? ' [Public]' : ''
    const schemaFlag = metadata.schema ? ' [Validated]' : ''
    const securityFlags = []
    if (metadata.security?.guard) securityFlags.push('Guard')
    if (metadata.security?.throttle) securityFlags.push('Throttle')
    if (metadata.security?.requiresState) securityFlags.push('RequiresState')
    const securityInfo = securityFlags.length > 0 ? ` (${securityFlags.join(', ')})` : ''

    loggers.command.debug(
      `Registered remote command: /${metadata.command}${publicFlag}${schemaFlag}${securityInfo} (delegated to CORE)`,
    )
  }

  /**
   * Executes a command handler stored in this resource.
   *
   * @remarks
   * Called by the resource's command execution controller when CORE
   * emits a command execution event to this resource.
   *
   * CORE has already validated:
   * - @Guard (rank/permission requirements)
   * - @Throttle (rate limiting)
   * - @RequiresState (player state)
   * - @Public (authentication - if not public, player must be authenticated)
   *
   * This method validates:
   * - Zod schema (argument types and structure)
   *
   * @throws AppError - If schema validation fails or command not found
   */
  async execute(player: Player, commandName: string, args: string[]): Promise<void> {
    const entry = this.commands.get(commandName.toLowerCase())
    if (!entry) {
      loggers.command.error(`Handler not found for remote command: ${commandName}`, {
        command: commandName,
        resource: GetCurrentResourceName(),
      })
      throw new AppError('COMMAND:NOT_FOUND', `Command not found: ${commandName}`, 'server')
    }

    const { meta, handler } = entry

    // ═══════════════════════════════════════════════════════════════
    // Schema Validation (same logic as CommandService)
    // ═══════════════════════════════════════════════════════════════

    // Delete Player from args, player is the first argument by convention
    const paramNames = meta.expectsPlayer ? meta.paramNames.slice(1) : meta.paramNames
    let schema: z.ZodTypeAny | undefined = meta.schema

    // If handler doesn't expect player, no arguments expected
    if (!meta.expectsPlayer) {
      if (args.length > 0) {
        throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
          usage: meta.usage,
        })
      }
      return await handler()
    }

    if (!schema) {
      // CASE 1 — No schema provided by user → try autogenerate
      schema = generateSchemaFromTypes(meta.paramTypes)

      // CASE 2 — Autogeneration failed
      if (!schema) {
        // If handler expects args but no schema exists → ERROR
        if (paramNames.length > 0) {
          throw new AppError(
            'SCHEMA:MISMATCH',
            `Command '${meta.command}' has parameters ${paramNames.join(
              ', ',
            )} but no schema was provided.`,
            'core',
          )
        }
        // No params expected, just execute
        return await handler(player)
      }
    }

    // CASE 3 — Schema provided by user (Object Schema)
    if (schema instanceof z.ZodObject) {
      const keys = Object.keys(schema.shape)

      // Validate missing keys
      for (const p of paramNames) {
        if (!keys.includes(p)) {
          throw new AppError(
            'SCHEMA:MISMATCH',
            `Command '${meta.command}' is missing schema for parameter '${p}'.`,
            'core',
          )
        }
      }

      // Validate extra keys
      for (const key of keys) {
        if (!paramNames.includes(key)) {
          throw new AppError(
            'SCHEMA:MISMATCH',
            `Schema for command '${meta.command}' defines '${key}', but handler does not.`,
            'core',
          )
        }
      }

      // Build input object
      const inputObj: Record<string, unknown> = {}
      for (let i = 0; i < paramNames.length; i++) {
        inputObj[paramNames[i]] = args[i]
      }

      // Validate
      const validated = await schema.parseAsync(inputObj).catch(() => {
        throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
          usage: meta.usage,
        })
      })

      const obj = validated as Record<string, any>
      const finalArgs = paramNames.map((name) => obj[name])
      return await handler(player, ...finalArgs)
    }

    // CASE 4 — Tuple schema (auto-generated)
    if (schema instanceof z.ZodTuple) {
      const validated = await schema.parseAsync(args).catch(() => {
        throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
          usage: meta.usage,
        })
      })

      return await handler(player, ...(validated as unknown[]))
    }

    // Fallback (rarely used)
    return await handler(player)
  }

  /**
   * Returns all commands registered in CORE (local + remote).
   */
  getAllCommands(): CommandInfo[] {
    return this.core.getAllCommands()
  }
}
