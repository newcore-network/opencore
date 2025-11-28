import { Vector3 } from '@core/utils/vector3';

interface PlayerSessionMeta {
  playerId?: string;
  [key: string]: unknown;
}

class Player {
  private meta: PlayerSessionMeta = {};

  get ped(): number {
    return PlayerPedId();
  }
  get coords(): Vector3 {
    const [x, y, z] = GetEntityCoords(this.ped, false);
    return { x, y, z };
  }

  setCoords(vector3: Vector3, heading?: number) {
    SetEntityCoordsNoOffset(this.ped, vector3.x, vector3.y, vector3.z, false, false, false);
    if (heading !== undefined) {
      SetEntityHeading(this.ped, heading);
    }
  }

  async playAnimation(dict: string, name: string, duration = -1) {
    RequestAnimDict(dict);
    while (!HasAnimDictLoaded(dict)) {
      await new Promise((r) => setTimeout(r, 0));
    }

    TaskPlayAnim(this.ped, dict, name, 8.0, -8.0, duration, 1, 0.0, false, false, false);
  }

  setMeta(key: string, value: unknown) {
    this.meta[key] = value;
  }

  getMeta<T = unknown>(key: string): T | undefined {
    return this.meta[key] as T | undefined;
  }
}

export const ClientPlayer = new Player();
