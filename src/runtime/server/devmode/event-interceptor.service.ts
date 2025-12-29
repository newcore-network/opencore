import { injectable } from 'tsyringe'
import { IDevModeInterceptor } from './contracts/IDevModeInterceptor'
import type { DevEvent, InterceptorOptions } from './types'

/**
 * Implementation of the DevMode event interceptor.
 *
 * Captures and records all framework events for debugging and analysis.
 * Events are stored in a circular buffer with configurable size.
 */
@injectable()
export class EventInterceptorService extends IDevModeInterceptor {
  private enabled = false
  private history: DevEvent[] = []
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
  }

  /**
   * Configures the interceptor options.
   */
  configure(options: Partial<InterceptorOptions>): void {
    this.options = { ...this.options, ...options }
    this.enabled = this.options.enabled
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
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
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
    return this.history.filter((e) => e.type === type)
  }

  /**
   * Gets events within a time range.
   */
  getEventsByTimeRange(startTime: number, endTime: number): DevEvent[] {
    return this.history.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime)
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

    for (const event of this.history) {
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
      total: this.history.length,
      byType,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      errors,
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventCounter}`
  }

  private addToHistory(event: DevEvent): void {
    this.history.push(event)
    if (this.history.length > this.options.maxHistorySize) {
      this.history.shift()
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
