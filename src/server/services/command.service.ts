import { injectable } from 'tsyringe'
import type { CommandMetadata } from '../decorators/command'
import { AppError } from '../../utils'
import { AccessControlService } from './access-control.service'
import { Server } from '../..'
import z from 'zod'

@injectable()
export class CommandService {
  private commands = new Map<string, { meta: CommandMetadata; handler: Function }>()

  constructor(private readonly accessControlService: AccessControlService) {}

  register(meta: CommandMetadata, handler: Function) {
    this.commands.set(meta.name.toLowerCase(), { meta, handler })
    console.log(`[CORE] Command registered: ${meta.name} ${meta.schema ? '[Validated]' : ''}`)
  }

  async execute(player: Server.Player, commandName: string, args: string[], raw: string) {
    const entry = this.commands.get(commandName.toLowerCase())

    if (!entry) {
      return
    }
    const { meta, handler } = entry

    if (meta.permission) {
      const hasPerm = await this.accessControlService.hasPermission(player, meta.permission)
      if (!hasPerm) {
        throw new AppError(
          'PERMISSION_DENIED',
          `You don't have permission: ${meta.permission}`,
          'core',
        )
      }
    }

    let validatedArgs: any[] = args

    if (meta.schema) {
      try {
        const result = await meta.schema.parseAsync(args)

        validatedArgs = Array.isArray(result) ? result : [result]
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new AppError('VALIDATION_ERROR', `Incorrect usage: ${error.message}`, 'client', {
            usage: meta.usage,
          })
        }
        throw error
      }
    }
    await handler(player, validatedArgs, raw)
  }

  getAllCommands() {
    return Array.from(this.commands.values()).map((c) => ({
      name: c.meta.name,
      description: c.meta.description ?? '',
      usage: c.meta.usage ?? '',
      permission: c.meta.permission,
    }))
  }
}
