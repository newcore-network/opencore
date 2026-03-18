import { injectable } from 'tsyringe'
import {
  IClientBlipBridge,
  type ClientBlipDefinition,
} from '../../../adapters/contracts/client/ui/IClientBlipBridge'

@injectable()
export class NodeClientBlipBridge extends IClientBlipBridge {
  private readonly blips = new Map<string, ClientBlipDefinition>()

  create(id: string, definition: ClientBlipDefinition): void {
    this.blips.set(id, { ...definition })
  }

  update(id: string, patch: Partial<ClientBlipDefinition>): boolean {
    const existing = this.blips.get(id)
    if (!existing) return false
    this.blips.set(id, { ...existing, ...patch })
    return true
  }

  exists(id: string): boolean {
    return this.blips.has(id)
  }

  remove(id: string): boolean {
    return this.blips.delete(id)
  }

  clear(): void {
    this.blips.clear()
  }
}
