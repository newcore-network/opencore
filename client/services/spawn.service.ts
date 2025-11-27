import { Vector3 } from '@core/utils/vector3';
import { injectable } from 'tsyringe';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@injectable()
export class Spawner {
  private spawned = false;

  async init(): Promise<void> {
    console.log('[Core] SpawnService Check');
  }

  async spawnAt(position: Vector3, model: string, heading = 0.0): Promise<void> {
    console.log('[Core] Petición de spawn:', JSON.stringify(position), 'model:', model);

    let a = 0;
    let spawned = false;
  }
}
