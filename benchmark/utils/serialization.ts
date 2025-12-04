/**
 * Utilidades para medir serialización/deserialización y simular latencia de red
 */

export interface SerializationMetrics {
  serializeTime: number
  deserializeTime: number
  serializedSize: number
  totalTime: number
}

export type PayloadSize = 'small' | 'medium' | 'large' | 'xlarge'

/**
 * Genera datos de prueba de diferentes tamaños para benchmarks de serialización
 */
export function generatePayload(size: PayloadSize): any {
  switch (size) {
    case 'small':
      return {
        action: 'test',
        value: 123,
        timestamp: Date.now(),
      }

    case 'medium':
      return {
        playerId: 123,
        action: 'transfer',
        amount: 5000,
        targetId: 456,
        metadata: {
          timestamp: Date.now(),
          source: 'bank',
          verified: true,
        },
        items: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          quantity: Math.floor(Math.random() * 100),
        })),
      }

    case 'large':
      return {
        players: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Player${i}`,
          position: { x: Math.random() * 1000, y: Math.random() * 1000, z: 72.0 },
          health: 100,
          armor: 50,
          weapons: Array.from({ length: 5 }, (_, j) => ({
            hash: j * 1000,
            ammo: Math.floor(Math.random() * 500),
          })),
          inventory: Array.from({ length: 20 }, (_, k) => ({
            id: k,
            name: `Item${k}`,
            quantity: Math.floor(Math.random() * 10),
          })),
        })),
        timestamp: Date.now(),
        serverId: 'server-123',
      }

    case 'xlarge':
      return {
        players: Array.from({ length: 200 }, (_, i) => ({
          id: i,
          name: `Player${i}`,
          accountId: `acc-${i}`,
          position: { x: Math.random() * 1000, y: Math.random() * 1000, z: 72.0 },
          rotation: { x: 0, y: 0, z: Math.random() * 360 },
          health: Math.floor(Math.random() * 100) + 50,
          armor: Math.floor(Math.random() * 100),
          vehicle: i % 10 === 0 ? { model: 'adder', plate: `ABC${i}` } : null,
          weapons: Array.from({ length: 10 }, (_, j) => ({
            hash: j * 1000,
            ammo: Math.floor(Math.random() * 500),
            attachments: Array.from({ length: 3 }, (_, k) => `attachment-${k}`),
          })),
          inventory: Array.from({ length: 50 }, (_, k) => ({
            id: k,
            name: `Item${k}`,
            quantity: Math.floor(Math.random() * 100),
            metadata: {
              durability: Math.random() * 100,
              custom: { prop: `value-${k}` },
            },
          })),
          stats: {
            kills: Math.floor(Math.random() * 1000),
            deaths: Math.floor(Math.random() * 500),
            money: Math.floor(Math.random() * 1000000),
          },
        })),
        server: {
          id: 'server-123',
          name: 'Test Server',
          maxPlayers: 500,
          currentPlayers: 200,
        },
        timestamp: Date.now(),
        metadata: {
          version: '1.0.0',
          build: 12345,
          uptime: Date.now(),
        },
      }

    default:
      return {}
  }
}

/**
 * Mide el tiempo de serialización y deserialización de un objeto
 */
export function measureSerialization(data: any): SerializationMetrics {
  // Serialización
  const serializeStart = performance.now()
  const serialized = JSON.stringify(data)
  const serializeEnd = performance.now()
  const serializeTime = serializeEnd - serializeStart

  // Medir tamaño
  const serializedSize = new Blob([serialized]).size

  // Deserialización
  const deserializeStart = performance.now()
  JSON.parse(serialized)
  const deserializeEnd = performance.now()
  const deserializeTime = deserializeEnd - deserializeStart

  return {
    serializeTime,
    deserializeTime,
    serializedSize,
    totalTime: serializeTime + deserializeTime,
  }
}

/**
 * Simula latencia de red añadiendo un delay
 */
export async function simulateNetworkLatency(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mide serialización con latencia de red simulada
 */
export async function measureSerializationWithLatency(
  data: any,
  latencyMs: number = 10,
): Promise<SerializationMetrics & { networkLatency: number }> {
  const serializationMetrics = measureSerialization(data)

  const networkStart = performance.now()
  await simulateNetworkLatency(latencyMs)
  const networkEnd = performance.now()
  const networkLatency = networkEnd - networkStart

  return {
    ...serializationMetrics,
    networkLatency,
  }
}

/**
 * Genera múltiples payloads para tests de carga
 */
export function generatePayloads(count: number, size: PayloadSize): any[] {
  return Array.from({ length: count }, () => generatePayload(size))
}

/**
 * Formatea el tamaño en bytes a formato legible
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

