import { injectable } from 'tsyringe'
import { IDevModeInterceptor } from './contracts/IDevModeInterceptor'
import { DevEvent, InterceptorOptions } from './types'

/**
 * Fixed-capacity circular buffer. Unlike `Array.push()` + `Array.shift()`,
 * eviction of the oldest entry is O(1) instead of O(n).
 */
class RingBuffer<T> {
  private buffer: T[] = []
  private start = 0
  private capacity: number

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity)
  }

  push(item: T): void {
    if (this.buffer.length < this.capacity) {
      this.buffer.push(item)
      return
    }
    this.buffer[this.start] = item
    this.start = (this.start + 1) % this.capacity
  }

  toArray(): T[] {
    if (this.buffer.length < this.capacity) return [...this.buffer]
    return [...this.buffer.slice(this.start), ...this.buffer.slice(0, this.start)]
  }

  clear(): void {
    this.buffer = []
    this.start = 0
  }

  setCapacity(capacity: number): void {
    const newCapacity = Math.max(1, capacity)
    if (newCapacity === this.capacity) return
    const current = this.toArray()
    this.capacity = newCapacity
    this.buffer = current.slice(-newCapacity)
    this.start = 0
  }
}

/**
 * Implementation of the DevMode event interceptor.
 *
 * Captures and records all framework events for debugging and analysis.
 * Events are stored in a circular buffer with configurable size.
 */
@injectable()
export class EventInterceptorService extends IDevModeInterceptor {
  private static readonly MAX_PENDING_AGE_MS = 5 * 60 * 1000

  private enabled = false
  private historyBuffer: RingBuffer<DevEvent>
  private pendingEvents = new Map<string, DevEvent>()
  private options: InterceptorOptions
  private eventCounter = 0
  private listeners: Array<(event: DevEvent) => void> = []

  constructor() {
    super()
    this.options = {
      enabled: true,
      recordHistory: true,
      maxHistorySize: 1000,
    }
    this.historyBuffer = new RingBuffer(this.options.maxHistorySize)
  }

  /**
   * Configures the interceptor options.
   */
  configure(options: Partial<InterceptorOptions>): void {
    this.options = { ...this.options, ...options }
    this.enabled = this.options.enabled
    this.historyBuffer.setCapacity(this.options.maxHistorySize)
  }

  onEventBefore(event: Omit<DevEvent, 'result' | 'duration'>): void {
    if (!this.enabled) return

    const fullEvent: DevEvent = {
      ...event,
      id: this.generateEventId(),
    }

    this.notifyListeners(fullEvent)
  }

  onEventAfter(event: DevEvent): void {
    if (!this.enabled) return

    if (this.options.recordHistory) {
      this.addToHistory(event)
    }

    this.notifyListeners(event)
  }

  onEventError(event: DevEvent): void {
    if (!this.enabled) return

    if (this.options.recordHistory) {
      this.addToHistory(event)
    }

    this.notifyListeners(event)
  }

  getEventHistory(): DevEvent[] {
    return this.historyBuffer.toArray()
  }

  clearHistory(): void {
    this.historyBuffer.clear()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Creates an event ID for tracking.
   */
  createEventId(): string {
    return this.generateEventId()
  }

  /**
   * Records a net event.
   */
  recordNetEvent(
    name: string,
    direction: 'in' | 'out',
    args: unknown[],
    source?: { clientId?: number },
  ): string {
    const id = this.generateEventId()
    const event: DevEvent = {
      id,
      timestamp: Date.now(),
      type: 'net',
      name,
      direction,
      args,
      source,
    }
    this.prunePendingEvents()
    this.pendingEvents.set(id, event)
    this.onEventBefore(event)
    return id
  }

  /**
   * Records a command execution.
   */
  recordCommand(name: string, args: string[], source?: { clientId?: number }): string {
    const id = this.generateEventId()
    const event: DevEvent = {
      id,
      timestamp: Date.now(),
      type: 'command',
      name,
      direction: 'in',
      args,
      source,
    }
    this.prunePendingEvents()
    this.pendingEvents.set(id, event)
    this.onEventBefore(event)
    return id
  }

  /**
   * Records an export call.
   */
  recordExport(name: string, args: unknown[]): string {
    const id = this.generateEventId()
    const event: DevEvent = {
      id,
      timestamp: Date.now(),
      type: 'export',
      name,
      direction: 'in',
      args,
    }
    this.prunePendingEvents()
    this.pendingEvents.set(id, event)
    this.onEventBefore(event)
    return id
  }

  /**
   * Completes an event with result.
   */
  completeEvent(id: string, result: unknown, startTime: number): void {
    const event = this.pendingEvents.get(id)
    if (event) {
      event.result = result
      event.duration = Date.now() - startTime
      this.pendingEvents.delete(id)
      this.onEventAfter(event)
    }
  }

  /**
   * Fails an event with error.
   */
  failEvent(id: string, error: string, startTime: number): void {
    const event = this.pendingEvents.get(id)
    if (event) {
      event.error = error
      event.duration = Date.now() - startTime
      this.pendingEvents.delete(id)
      this.onEventError(event)
    }
  }

  /**
   * Adds a listener for events.
   */
  addListener(listener: (event: DevEvent) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Gets events filtered by type.
   */
  getEventsByType(type: DevEvent['type']): DevEvent[] {
    return this.historyBuffer.toArray().filter((e) => e.type === type)
  }

  /**
   * Gets events within a time range.
   */
  getEventsByTimeRange(startTime: number, endTime: number): DevEvent[] {
    return this.historyBuffer
      .toArray()
      .filter((e) => e.timestamp >= startTime && e.timestamp <= endTime)
  }

  /**
   * Gets statistics about recorded events.
   */
  getStatistics(): {
    total: number
    byType: Record<string, number>
    avgDuration: number
    errors: number
  } {
    const byType: Record<string, number> = {}
    let totalDuration = 0
    let durationCount = 0
    let errors = 0

    const history = this.historyBuffer.toArray()
    for (const event of history) {
      byType[event.type] = (byType[event.type] || 0) + 1
      if (event.duration !== undefined) {
        totalDuration += event.duration
        durationCount++
      }
      if (event.error) {
        errors++
      }
    }

    return {
      total: history.length,
      byType,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      errors,
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventCounter}`
  }

  private addToHistory(event: DevEvent): void {
    this.historyBuffer.push(event)
  }

  /**
   * Drops pending events that never reached `completeEvent`/`failEvent` (e.g. because
   * the surrounding call threw before either was invoked), so `pendingEvents` can't
   * grow unbounded over the lifetime of a long-running server.
   */
  private prunePendingEvents(): void {
    const now = Date.now()
    for (const [id, event] of this.pendingEvents) {
      if (now - event.timestamp > EventInterceptorService.MAX_PENDING_AGE_MS) {
        this.pendingEvents.delete(id)
      }
    }
  }

  private notifyListeners(event: DevEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        // Ignore listener errors
      }
    }
  }
}
