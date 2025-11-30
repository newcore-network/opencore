import { injectable } from 'tsyringe'
import type { CommandMeta } from '../decorators/command'
import { AppError } from '../../utils'
import { AccessControlService } from './access-control.service'
import { Server } from '../..'

@injectable()
export class CommandService {
  private commands = new Map<string, { meta: CommandMeta; handler: Function }>()

  constructor(private readonly accessControlService: AccessControlService) {}

  register(meta: CommandMeta, handler: Function) {
    this.commands.set(meta.name.toLowerCase(), { meta, handler })
    console.log(`[CORE] Command registered: ${meta.name}`)
  }

  async execute(player: Server.Player, commandName: string, args: string[], raw: string) {
    const entry = this.commands.get(commandName.toLowerCase())

    if (!entry) {
      throw new AppError('VALIDATION_ERROR', `Command /${commandName} do not exist`, 'core')
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

    await handler(player, args, raw)
  }

  getDefinitions() {
    return Array.from(this.commands.values()).map((c) => ({
      name: c.meta.name,
      description: c.meta.description ?? '',
      usage: c.meta.usage ?? '',
      permission: c.meta.permission,
    }))
  }
}
