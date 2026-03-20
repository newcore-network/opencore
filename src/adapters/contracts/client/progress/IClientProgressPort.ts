import type { Vector3 } from '../../../../kernel/utils/vector3'

/**
 * Progress task options used by client adapters.
 */
export interface ClientProgressOptions {
  label: string
  duration: number
  useCircular?: boolean
  canCancel?: boolean
  disableControls?: boolean
  disableMovement?: boolean
  disableCombat?: boolean
  animation?: {
    dict: string
    anim: string
    flags?: number
  }
  prop?: {
    model: string
    bone: number
    offset: Vector3
    rotation: Vector3
  }
}

/**
 * Runtime snapshot for an active progress task.
 */
export interface ClientProgressState {
  active: boolean
  progress: number
  label: string
  startTime: number
  duration: number
  options: ClientProgressOptions
}

/**
 * Intent-oriented client progress port.
 *
 * Adapters own the platform-specific implementation for task animations,
 * props, controls, and HUD rendering while the framework exposes a stable API.
 */
export abstract class IClientProgressPort {
  /** Starts a progress task and resolves to true when completed. */
  abstract start(options: ClientProgressOptions): Promise<boolean>
  /** Cancels the active task if one exists. */
  abstract cancel(): void
  /** Returns whether a task is active. */
  abstract isActive(): boolean
  /** Returns the current progress percentage. */
  abstract getProgress(): number
  /** Returns the active task snapshot. */
  abstract getState(): ClientProgressState | null
}
