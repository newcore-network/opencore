import { coreLogger, LogDomain } from '../../shared/logger'

const clientExports = coreLogger.child('Exports', LogDomain.CLIENT)

export const loadClientExports = () => {
  exports('core:sendcommand', (commandName: string, args: string[] = []) => {
    const rawCommand = `/${commandName} ${args.join(' ')}`
    emitNet('core:internal:executeCommand', commandName, args, rawCommand)
  })

  clientExports.debug('Client exports loaded: SendCommand')
}
