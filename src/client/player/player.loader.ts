import { Vec3 } from '@opencore/utils/vector3'
import { ClientPlayer } from './player'

export const playerClientLoader = () => {
  on('onClientResourceStart', (resourceName: string) => {
    if (resourceName !== GetCurrentResourceName()) return
    console.log('[Core] Client player loader inicializado')
  })
  onNet('core:playerSessionInit', (data: { playerId: string }) => {
    ClientPlayer.setMeta('playerId', data.playerId)
  })
  onNet('core:teleportTo', (x: number, y: number, z: number, heading?: number) => {
    ClientPlayer.setCoords(Vec3.create(x, y, z), heading)
  })
}
