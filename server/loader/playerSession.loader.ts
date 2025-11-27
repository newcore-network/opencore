import { container } from 'tsyringe';
import { PlayerManager } from '../player.manager';
import { emitPlayerSessionCreated } from '../lifecycle';

export const playerSessionLoader = () => {
  const playerManager = container.resolve(PlayerManager);

  on('playerJoining', (source: string) => {
    const src = Number(source);

    const license = GetPlayerIdentifier(src.toString(), 0) ?? null;
    const Player = playerManager.bind(src, license ?? `temp-${src}-${Date.now()}`);

    console.log(`1. Binding player session for client ${src} with license ${license}`);

    emitPlayerSessionCreated({
      clientId: src,
      license: license,
    });
  });

  on('playerDropped', () => {
    const src = Number(global.source);
    playerManager.unbindByClient(src);
    emit('core:playerSessionDestroyed', src);
    console.log(`Player session destroyed for client ${src}`);
  });
};
