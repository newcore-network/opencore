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

    return () => {
      this.handlers.delete(name)
    }
  }

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

  async executeTicks(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.executeTick()
    }
  }

  async executeTicksParallel(count: number): Promise<void> {
    const promises: Promise<void>[] = []
    for (let i = 0; i < count; i++) {
      promises.push(this.executeTick())
    }
    await Promise.all(promises)
  }

  start(intervalMs: number = 0): void {
    if (this.isRunning) return

    this.isRunning = true
    this.tickInterval = setInterval(() => {
      this.executeTick().catch((error) => {
        console.error('Error in tick loop:', error)
      })
    }, intervalMs)
  }

  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  getHandlerMetrics(name: string): TickHandler | null {
    return this.handlers.get(name) ?? null
  }

  getAllMetrics(): TickHandler[] {
    return Array.from(this.handlers.values())
  }

  resetMetrics(): void {
    for (const handler of this.handlers.values()) {
      handler.executionCount = 0
      handler.totalTime = 0
      handler.minTime = Infinity
      handler.maxTime = 0
    }
    this.tickCount = 0
  }

  clear(): void {
    this.stop()
    this.handlers.clear()
    this.tickCount = 0
  }

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

export function createTestTickSimulator(
  handlerCount: number,
  workLoad: 'light' | 'medium' | 'heavy' = 'light',
): TickSimulator {
  const simulator = new TickSimulator()

  for (let i = 0; i < handlerCount; i++) {
    const handler = createWorkloadHandler(workLoad)
    simulator.register(`handler-${i}`, handler)
  }

  return simulator
}

function createWorkloadHandler(workLoad: 'light' | 'medium' | 'heavy'): () => void {
  switch (workLoad) {
    case 'light':
      return () => {
        const sum = 1 + 1
      }

    case 'medium':
      return () => {
        const arr = Array.from({ length: 100 }, (_, i) => i)
        arr.reduce((acc, val) => acc + val, 0)
      }

    case 'heavy':
      return () => {
        const arr = Array.from({ length: 1000 }, (_, i) => i)
        arr.map((val) => val * 2).reduce((acc, val) => acc + val, 0)
      }

    default:
      return () => {}
  }
}
