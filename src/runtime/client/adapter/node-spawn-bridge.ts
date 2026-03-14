import { injectable } from 'tsyringe'
import { IClientSpawnBridge } from '../../../adapters/contracts/client/spawn/IClientSpawnBridge'
import type {
  RespawnRequest,
  SpawnRequest,
  TeleportRequest,
} from '../../../adapters/contracts/client/spawn/types'

@injectable()
export class NodeClientSpawnBridge extends IClientSpawnBridge {
  async waitUntilReady(_timeoutMs?: number): Promise<void> {}

  async spawn(_request: SpawnRequest): Promise<void> {}

  async respawn(_request: RespawnRequest): Promise<void> {}

  async teleport(_request: TeleportRequest): Promise<void> {}
}
