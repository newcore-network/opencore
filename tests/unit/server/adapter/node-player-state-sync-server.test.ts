import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import { NodePlayerStateSyncServer } from '../../../../src/runtime/server/adapter/node-player-state-sync-server'

describe('NodePlayerStateSyncServer', () => {
  it('writes health and armor to the entity state bag', () => {
    const state = new Map<string, unknown>()
    const entityServer = {
      getHealth: vi.fn(() => 200),
      setHealth: vi.fn(),
      getArmor: vi.fn(() => 0),
      setArmor: vi.fn(),
      getStateBag: vi.fn(() => ({
        set: (key: string, value: unknown) => state.set(key, value),
        get: (key: string) => state.get(key),
      })),
    }

    const playerServer = {
      getPed: vi.fn(() => 77),
    }

    const service = new NodePlayerStateSyncServer(playerServer as any, entityServer as any)

    service.setHealth('1', 175)
    service.setArmor('1', 80)

    expect(entityServer.setHealth).toHaveBeenCalledWith(77, 175)
    expect(entityServer.setArmor).toHaveBeenCalledWith(77, 80)
    expect(state.get('health')).toBe(175)
    expect(state.get('armor')).toBe(80)
  })
})
