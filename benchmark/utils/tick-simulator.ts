/**
 * Simulador de ticks para benchmarks
 */

export interface TickHandler {
  name: string
  handler: () => void | Promise<void>
  executionCount: number
  totalTime: number
  minTime: number
  maxTime: number
}

export class TickSimulator {
  private handlers: Map<string, TickHandler> = new Map()
  private isRunning = false
  private tickInterval: NodeJS.Timeout | null = null
  private tickCount = 0

  /**
   * Registra un handler de tick
   */
  register(name: string, handler: () => void | Promise<void>): () => void {
    const tickHandler: TickHandler = {
      name,
      handler,
      executionCount: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
    }

    this.handlers.set(name, tickHandler)

    // Retorna función para desregistrar
    return () => {
      this.handlers.delete(name)
    }
  }

  /**
   * Ejecuta un solo tick de todos los handlers registrados
   */
  async executeTick(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const handler of this.handlers.values()) {
      const start = performance.now()
      try {
        const result = handler.handler()
        if (result instanceof Promise) {
          promises.push(
            result.then(() => {
              const end = performance.now()
              const duration = end - start
              this.updateHandlerMetrics(handler, duration)
            }),
          )
        } else {
          const end = performance.now()
          const duration = end - start
          this.updateHandlerMetrics(handler, duration)
        }
      } catch (error) {
        const end = performance.now()
        const duration = end - start
        this.updateHandlerMetrics(handler, duration)
        // En producción, aquí se manejaría el error
      }
    }

    await Promise.all(promises)
    this.tickCount++
  }

  /**
   * Ejecuta N ticks secuencialmente
   */
  async executeTicks(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.executeTick()
    }
  }

  /**
   * Ejecuta N ticks en paralelo (simulando múltiples ticks simultáneos)
   */
  async executeTicksParallel(count: number): Promise<void> {
    const promises: Promise<void>[] = []
    for (let i = 0; i < count; i++) {
      promises.push(this.executeTick())
    }
    await Promise.all(promises)
  }

  /**
   * Inicia un loop de ticks con un intervalo específico
   */
  start(intervalMs: number = 0): void {
    if (this.isRunning) return

    this.isRunning = true
    this.tickInterval = setInterval(() => {
      this.executeTick().catch((error) => {
        console.error('Error in tick loop:', error)
      })
    }, intervalMs)
  }

  /**
   * Detiene el loop de ticks
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  /**
   * Obtiene métricas de un handler específico
   */
  getHandlerMetrics(name: string): TickHandler | null {
    return this.handlers.get(name) ?? null
  }

  /**
   * Obtiene métricas de todos los handlers
   */
  getAllMetrics(): TickHandler[] {
    return Array.from(this.handlers.values())
  }

  /**
   * Resetea todas las métricas
   */
  resetMetrics(): void {
    for (const handler of this.handlers.values()) {
      handler.executionCount = 0
      handler.totalTime = 0
      handler.minTime = Infinity
      handler.maxTime = 0
    }
    this.tickCount = 0
  }

  /**
   * Limpia todos los handlers
   */
  clear(): void {
    this.stop()
    this.handlers.clear()
    this.tickCount = 0
  }

  /**
   * Obtiene el número total de ticks ejecutados
   */
  getTickCount(): number {
    return this.tickCount
  }

  private updateHandlerMetrics(handler: TickHandler, duration: number): void {
    handler.executionCount++
    handler.totalTime += duration
    handler.minTime = Math.min(handler.minTime, duration)
    handler.maxTime = Math.max(handler.maxTime, duration)
  }
}

/**
 * Crea un simulador de ticks con múltiples handlers de prueba
 */
export function createTestTickSimulator(handlerCount: number, workLoad: 'light' | 'medium' | 'heavy' = 'light'): TickSimulator {
  const simulator = new TickSimulator()

  for (let i = 0; i < handlerCount; i++) {
    const handler = createWorkloadHandler(workLoad)
    simulator.register(`handler-${i}`, handler)
  }

  return simulator
}

/**
 * Crea un handler con diferentes cargas de trabajo
 */
function createWorkloadHandler(workLoad: 'light' | 'medium' | 'heavy'): () => void {
  switch (workLoad) {
    case 'light':
      return () => {
        // Operación muy ligera
        const sum = 1 + 1
      }

    case 'medium':
      return () => {
        // Operación media: iterar sobre un array pequeño
        const arr = Array.from({ length: 100 }, (_, i) => i)
        arr.reduce((acc, val) => acc + val, 0)
      }

    case 'heavy':
      return () => {
        // Operación pesada: iterar sobre un array grande y hacer cálculos
        const arr = Array.from({ length: 1000 }, (_, i) => i)
        arr.map((val) => val * 2).reduce((acc, val) => acc + val, 0)
      }

    default:
      return () => {}
  }
}

