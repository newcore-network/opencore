import { coreLogger, LogDomain } from '../../../kernel/shared/logger'
import { Vec3 } from '../../../kernel/utils'
import { ClientPlayer } from './player'

const clientSession = coreLogger.child('Session', LogDomain.CLIENT)

export const playerClientLoader = () => {
  on('onClientResourceStart', (resourceName: string) => {
    if (resourceName !== GetCurrentResourceName()) return
    clientSession.debug('Client player loader initialized')
  })
  onNet('core:playerSessionInit', (data: { playerId: string }) => {
    ClientPlayer.setMeta('playerId', data.playerId)
    clientSession.info('Player session initialized', { playerId: data.playerId })
  })
  onNet('core:teleportTo', (x: number, y: number, z: number, heading?: number) => {
    ClientPlayer.setCoords(Vec3.create(x, y, z), heading)
  })
}
