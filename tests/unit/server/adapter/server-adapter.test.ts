import 'reflect-metadata'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMockPlayerAdapters } from '../../../helpers/player.helper'
import { resetContainer } from '../../../helpers/di.helper'
import {
  createLocalServerPlayer,
  createRemoteServerPlayer,
  defineRuntimeHints,
  defineServerAdapter,
  installServerAdapter,
  serializeServerPlayerData,
} from '../../../../src/runtime/server/adapter'
import { Player } from '../../../../src/runtime/server/entities/player'
import type { PlayerSession } from '../../../../src/runtime/server/types/player-session.types'
import type { SerializedPlayerData } from '../../../../src/runtime/server/types/core-exports.types'

class ExtendedPlayer extends Player {
  get adapterKind(): string | undefined {
    return this.getMeta<string>('adapterKind')
  }
}

describe('server adapter registry', () => {
  beforeEach(() => {
    resetContainer()
  })

  it('creates and hydrates Player subclasses through the active adapter', async () => {
    const adapter = defineServerAdapter({
      name: 'custom',
      register(ctx) {
        ctx.usePlayerAdapter({
          createLocal(session, deps) {
            const player = new ExtendedPlayer(session, deps)
            player.setMeta('adapterKind', 'local')
            return player
          },
          createRemote(data, deps) {
            const player = new ExtendedPlayer(
              {
                clientID: data.clientID,
                accountID: data.accountID,
                identifiers: data.identifiers,
                meta: data.meta,
              },
              deps,
            )

            for (const state of data.states) {
              player.addState(state)
            }

            return player
          },
          serialize(player) {
            return {
              adapterKind: (player as ExtendedPlayer).adapterKind,
            }
          },
          hydrate(player, payload) {
            if (payload?.adapterKind) {
              player.setMeta('adapterKind', payload.adapterKind)
            }
          },
        })
      },
    })

    await installServerAdapter(adapter)

    const session: PlayerSession = {
      clientID: 10,
      meta: {},
    }

    const localPlayer = createLocalServerPlayer(session, createMockPlayerAdapters())
    expect(localPlayer).toBeInstanceOf(Player)
    expect(localPlayer).toBeInstanceOf(ExtendedPlayer)
    expect((localPlayer as ExtendedPlayer).adapterKind).toBe('local')

    const serialized = serializeServerPlayerData(localPlayer)
    expect(serialized.adapter).toEqual({
      name: 'custom',
      payload: { adapterKind: 'local' },
    })

    const remoteData: SerializedPlayerData = {
      clientID: 10,
      meta: {},
      states: ['ready'],
      adapter: serialized.adapter,
    }

    const remotePlayer = createRemoteServerPlayer(remoteData, createMockPlayerAdapters())
    expect(remotePlayer).toBeInstanceOf(Player)
    expect(remotePlayer).toBeInstanceOf(ExtendedPlayer)
    expect(remotePlayer.hasState('ready')).toBe(true)
    expect((remotePlayer as ExtendedPlayer).adapterKind).toBe('local')
  })

  it('keeps shared runtime hints on adapter definitions', () => {
    const runtime = defineRuntimeHints({
      runtime: 'ragemp',
      server: {
        target: 'node14',
        outputRoot: 'packages',
        outFileName: 'index.js',
      },
      client: {
        outputRoot: 'client_packages',
        outFileName: 'index.js',
      },
      manifest: {
        kind: 'none',
      },
    })

    const adapter = defineServerAdapter({
      name: 'ragemp',
      runtime,
      register() {},
    })

    expect(adapter.runtime).toEqual(runtime)
  })
})
