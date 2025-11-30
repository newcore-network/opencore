// import { di } from '../container'
// import { CommandService } from '../services/command.service'
// import { handleCommandError } from '../error-handler'

// export const exportsLoader = () => {
//   const commandService = di.resolve(CommandService)

//   exports('core:ExecuteCommand', async (src: number, name: string, args: string[], raw: string) => {
//     try {
//       await commandService.execute(Number(src), name, args, raw)
//       return { ok: true }
//     } catch (error) {
//       handleCommandError(
//         error,
//         { name, methodName: 'ExportExecution', target: Object },
//         Number(src),
//       )
//       return { ok: false }
//     }
//   })

//   exports('core:GetCommands', () => {
//     return commandService.getDefinitions()
//   })
// }
