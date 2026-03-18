import { injectable } from 'tsyringe'
import {
  IClientMarkerBridge,
  type ClientMarkerDefinition,
} from '../../../adapters/contracts/client/ui/IClientMarkerBridge'

@injectable()
export class NodeClientMarkerBridge extends IClientMarkerBridge {
  private readonly markers = new Map<string, ClientMarkerDefinition>()

  create(id: string, definition: ClientMarkerDefinition): void {
    this.markers.set(id, { ...definition })
  }

  update(id: string, patch: Partial<ClientMarkerDefinition>): boolean {
    const existing = this.markers.get(id)
    if (!existing) return false
    this.markers.set(id, { ...existing, ...patch })
    return true
  }

  remove(id: string): boolean {
    return this.markers.delete(id)
  }

  exists(id: string): boolean {
    return this.markers.has(id)
  }

  clear(): void {
    this.markers.clear()
  }

  draw(_definition: ClientMarkerDefinition): void {}
}
