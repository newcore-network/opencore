export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export class Vec3 {
  static create(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
  }

  static clone(v: Vector3): Vector3 {
    return { x: v.x, y: v.y, z: v.z };
  }

  static add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  static sub(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  static distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  static equals(a: Vector3, b: Vector3): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }
}
