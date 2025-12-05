import { di } from '../container'
import { DatabaseService } from '../database'
import { ChatService } from './chat.service'
import { CommandService } from './command.service'
import { HttpService } from './http/http.service'
import { PlayerService } from './player.service'

export function registerServicesServer() {
  di.registerSingleton(PlayerService, PlayerService)
  di.registerSingleton(CommandService, CommandService)
  di.registerSingleton(HttpService, HttpService)
  di.registerSingleton(ChatService, ChatService)
  di.registerSingleton(DatabaseService, DatabaseService)
}
