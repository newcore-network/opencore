import { di } from '../container'
import { ChatService } from './chat.service'
import { CommandService } from './command.service'
import { HttpService } from './http/http.service'
import { PlayerService } from './player.service'

export function registerServicesServer() {
  di.registerSingleton(PlayerService, PlayerService)
  di.registerSingleton(CommandService, CommandService)
  di.registerSingleton(HttpService, HttpService)
  di.registerSingleton(ChatService, ChatService)
}
