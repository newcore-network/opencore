export const loadClientExports = () => {
  exports('core:sendcommand', (commandName: string, args: string[] = []) => {
    const rawCommand = `/${commandName} ${args.join(' ')}`
    emitNet('core:internal:executeCommand', commandName, args, rawCommand)
  })

  console.log('[CORE CLIENT] Exports cargados: SendCommand')
}
