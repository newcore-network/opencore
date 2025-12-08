import { injectable } from 'tsyringe'

export interface ProgressOptions {
  /** Progress label/title */
  label: string
  /** Duration in milliseconds */
  duration: number
  /** Whether to use a circular indicator */
  useCircular?: boolean
  /** Whether the player can cancel (usually with a key) */
  canCancel?: boolean
  /** Disable player controls during progress */
  disableControls?: boolean
  /** Disable player movement */
  disableMovement?: boolean
  /** Disable combat actions */
  disableCombat?: boolean
  /** Animation to play during progress */
  animation?: {
    dict: string
    anim: string
    flags?: number
  }
  /** Prop to attach during progress */
  prop?: {
    model: string
    bone: number
    offset: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
  }
}

export interface ProgressState {
  active: boolean
  progress: number
  label: string
  startTime: number
  duration: number
  options: ProgressOptions
}

type ProgressCallback = (completed: boolean) => void

/**
 * Service for displaying progress bars/indicators.
 */
@injectable()
export class ProgressService {
  private state: ProgressState | null = null
  private tickHandle: number | null = null
  private callback: ProgressCallback | null = null
  private propHandle: number | null = null

  /**
   * Start a progress action.
   *
   * @param options - Progress options
   * @returns Promise that resolves with true if completed, false if cancelled
   */
  async start(options: ProgressOptions): Promise<boolean> {
    if (this.state?.active) {
      return false
    }

    return new Promise((resolve) => {
      this.state = {
        active: true,
        progress: 0,
        label: options.label,
        startTime: GetGameTimer(),
        duration: options.duration,
        options,
      }

      this.callback = resolve
      this.startProgress()
    })
  }

  /**
   * Cancel the current progress.
   */
  cancel(): void {
    if (!this.state?.active) return

    this.cleanup(false)
  }

  /**
   * Check if a progress is currently active.
   */
  isActive(): boolean {
    return this.state?.active ?? false
  }

  /**
   * Get current progress percentage (0-100).
   */
  getProgress(): number {
    return this.state?.progress ?? 0
  }

  /**
   * Get current progress state.
   */
  getState(): ProgressState | null {
    return this.state
  }

  private async startProgress(): Promise<void> {
    if (!this.state) return

    const { options } = this.state
    const ped = PlayerPedId()

    // Load and play animation if specified
    if (options.animation) {
      await this.loadAnimDict(options.animation.dict)
      TaskPlayAnim(
        ped,
        options.animation.dict,
        options.animation.anim,
        8.0,
        -8.0,
        options.duration,
        options.animation.flags ?? 1,
        0.0,
        false,
        false,
        false,
      )
    }

    // Attach prop if specified
    if (options.prop) {
      await this.loadModel(options.prop.model)
      const propHash = GetHashKey(options.prop.model)
      const coords = GetEntityCoords(ped, true)
      this.propHandle = CreateObject(propHash, coords[0], coords[1], coords[2], true, true, true)
      AttachEntityToEntity(
        this.propHandle,
        ped,
        GetPedBoneIndex(ped, options.prop.bone),
        options.prop.offset.x,
        options.prop.offset.y,
        options.prop.offset.z,
        options.prop.rotation.x,
        options.prop.rotation.y,
        options.prop.rotation.z,
        true,
        true,
        false,
        true,
        1,
        true,
      )
    }

    // Start the tick
    this.tickHandle = setTick(() => {
      if (!this.state) return

      const elapsed = GetGameTimer() - this.state.startTime
      this.state.progress = Math.min((elapsed / this.state.duration) * 100, 100)

      // Handle controls
      if (options.disableControls) {
        DisableAllControlActions(0)
      } else {
        if (options.disableMovement) {
          DisableControlAction(0, 30, true) // Move LR
          DisableControlAction(0, 31, true) // Move UD
          DisableControlAction(0, 21, true) // Sprint
          DisableControlAction(0, 22, true) // Jump
        }
        if (options.disableCombat) {
          DisableControlAction(0, 24, true) // Attack
          DisableControlAction(0, 25, true) // Aim
          DisableControlAction(0, 47, true) // Weapon
          DisableControlAction(0, 58, true) // Weapon
          DisableControlAction(0, 263, true) // Melee
          DisableControlAction(0, 264, true) // Melee
        }
      }

      // Check for cancel
      if (options.canCancel && IsControlJustPressed(0, 200)) {
        // ESC key
        this.cancel()
        return
      }

      // Draw progress bar (native style)
      this.drawProgressBar()

      // Check completion
      if (elapsed >= this.state.duration) {
        this.cleanup(true)
      }
    })
  }

  private drawProgressBar(): void {
    if (!this.state) return

    const { label, progress, options } = this.state

    if (options.useCircular) {
      // Circular progress indicator
      BeginTextCommandBusyspinnerOn('STRING')
      AddTextComponentString(label)
      EndTextCommandBusyspinnerOn(4)
    } else {
      // Bar style progress
      const barWidth = 0.15
      const barHeight = 0.015
      const x = 0.5 - barWidth / 2
      const y = 0.88

      // Background
      DrawRect(0.5, y + barHeight / 2, barWidth, barHeight, 0, 0, 0, 180)

      // Progress fill
      const fillWidth = (barWidth * progress) / 100
      DrawRect(x + fillWidth / 2, y + barHeight / 2, fillWidth, barHeight, 255, 255, 255, 255)

      // Label
      SetTextFont(4)
      SetTextScale(0.35, 0.35)
      SetTextColour(255, 255, 255, 255)
      SetTextCentre(true)
      BeginTextCommandDisplayText('STRING')
      AddTextComponentString(`${label} (${Math.floor(progress)}%)`)
      EndTextCommandDisplayText(0.5, y - 0.03)
    }
  }

  private cleanup(completed: boolean): void {
    const ped = PlayerPedId()

    // Stop animation
    if (this.state?.options.animation) {
      StopAnimTask(ped, this.state.options.animation.dict, this.state.options.animation.anim, 1.0)
    }

    // Remove prop
    if (this.propHandle) {
      DeleteEntity(this.propHandle)
      this.propHandle = null
    }

    // Clear tick
    if (this.tickHandle !== null) {
      clearTick(this.tickHandle)
      this.tickHandle = null
    }

    // Clear busy spinner
    if (this.state?.options.useCircular) {
      BusyspinnerOff()
    }

    // Reset state
    this.state = null

    // Invoke callback
    if (this.callback) {
      this.callback(completed)
      this.callback = null
    }
  }

  private async loadAnimDict(dict: string): Promise<void> {
    RequestAnimDict(dict)
    while (!HasAnimDictLoaded(dict)) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  private async loadModel(model: string): Promise<void> {
    const hash = GetHashKey(model)
    RequestModel(hash)
    while (!HasModelLoaded(hash)) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }
}
