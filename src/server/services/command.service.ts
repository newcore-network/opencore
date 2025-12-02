import { injectable } from 'tsyringe'
import type { CommandMetadata } from '../decorators/command'
import { AppError, SecurityError } from '../../utils'
import { Server } from '../..'
import z from 'zod'
import { SecurityHandlerContract } from '../templates/security/security-handler.contract'

@injectable()
export class CommandService {
  constructor(private securityHandler: SecurityHandlerContract) {}

  private commands = new Map<string, { meta: CommandMetadata; handler: Function }>()

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
        if (error instanceof AppError) {
          throw error
        }
        if (error instanceof SecurityError) {
          this.securityHandler.handleViolation(player, error)
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
    }))
  }
}
