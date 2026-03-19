import { injectable } from 'tsyringe'
import { IClientSpawnPort } from '../../../adapters/contracts/client/spawn/IClientSpawnPort'
import type {
  RespawnRequest,
  SpawnExecutionResult,
  SpawnRequest,
  TeleportRequest,
} from '../../../adapters/contracts/client/spawn/types'

@injectable()
export class NodeClientSpawnBridge extends IClientSpawnPort {
  async waitUntilReady(_timeoutMs?: number): Promise<void> {}

  async spawn(_request: SpawnRequest): Promise<SpawnExecutionResult> {
    return {}
  }

  async respawn(_request: RespawnRequest): Promise<SpawnExecutionResult> {
    return {}
  }

  async teleport(_request: TeleportRequest): Promise<void> {}
}
