import { inject, injectable } from 'tsyringe'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { IClientRuntimeBridge } from '../adapter/runtime-bridge'
import { IClientLocalPlayerBridge } from '../adapter/local-player-bridge'

export interface ProgressOptions {
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

@injectable()
export class ProgressService {
  private state: ProgressState | null = null
  private tickHandle: unknown = null
  private callback: ProgressCallback | null = null
  private propHandle: number | null = null

  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
    @inject(IClientLocalPlayerBridge as any) private readonly localPlayer: IClientLocalPlayerBridge,
  ) {}

  async start(options: ProgressOptions): Promise<boolean> {
    if (this.state?.active) return false
    return new Promise((resolve) => {
      this.state = {
        active: true,
        progress: 0,
        label: options.label,
        startTime: this.runtime.getGameTimer(),
        duration: options.duration,
        options,
      }
      this.callback = resolve
      void this.startProgress()
    })
  }

  cancel(): void {
    if (!this.state?.active) return
    this.cleanup(false)
  }

  isActive(): boolean {
    return this.state?.active ?? false
  }
  getProgress(): number {
    return this.state?.progress ?? 0
  }
  getState(): ProgressState | null {
    return this.state
  }

  private async startProgress(): Promise<void> {
    if (!this.state) return
    const { options } = this.state
    const ped = this.localPlayer.getHandle()

    if (options.animation) {
      await this.loadAnimDict(options.animation.dict)
      this.platform.taskPlayAnim(
        ped,
        options.animation.dict,
        options.animation.anim,
        8.0,
        -8.0,
        options.duration,
        options.animation.flags ?? 1,
        0.0,
      )
    }

    if (options.prop) {
      await this.loadModel(options.prop.model)
      const propHash = this.platform.getHashKey(options.prop.model)
      const coords = this.localPlayer.getPosition()
      this.propHandle = this.platform.createObject(propHash, coords, true, true, true)
      this.platform.attachEntityToEntity(
        this.propHandle,
        ped,
        this.platform.getPedBoneIndex(ped, options.prop.bone),
        options.prop.offset,
        options.prop.rotation,
      )
    }

    this.tickHandle = this.runtime.setTick(() => {
      if (!this.state) return

      const elapsed = this.runtime.getGameTimer() - this.state.startTime
      this.state.progress = Math.min((elapsed / this.state.duration) * 100, 100)

      if (options.disableControls) {
        this.platform.disableAllControlActions(0)
      } else {
        if (options.disableMovement) {
          this.platform.disableControlAction(0, 30, true)
          this.platform.disableControlAction(0, 31, true)
          this.platform.disableControlAction(0, 21, true)
          this.platform.disableControlAction(0, 22, true)
        }
        if (options.disableCombat) {
          this.platform.disableControlAction(0, 24, true)
          this.platform.disableControlAction(0, 25, true)
          this.platform.disableControlAction(0, 47, true)
          this.platform.disableControlAction(0, 58, true)
          this.platform.disableControlAction(0, 263, true)
          this.platform.disableControlAction(0, 264, true)
        }
      }

      if (options.canCancel && this.platform.isControlJustPressed(0, 200)) {
        this.cancel()
        return
      }

      this.drawProgressBar()

      if (elapsed >= this.state.duration) this.cleanup(true)
    })
  }

  private drawProgressBar(): void {
    if (!this.state) return
    const { label, progress, options } = this.state

    if (options.useCircular) {
      this.platform.beginTextCommandBusyspinnerOn('STRING')
      this.platform.addTextComponentString(label)
      this.platform.endTextCommandBusyspinnerOn(4)
      return
    }

    const barWidth = 0.15
    const barHeight = 0.015
    const x = 0.5 - barWidth / 2
    const y = 0.88
    this.platform.drawRect(0.5, y + barHeight / 2, barWidth, barHeight, 0, 0, 0, 180)
    const fillWidth = (barWidth * progress) / 100
    this.platform.drawRect(
      x + fillWidth / 2,
      y + barHeight / 2,
      fillWidth,
      barHeight,
      255,
      255,
      255,
      255,
    )
    this.platform.setTextFont(4)
    this.platform.setTextScale(0.35)
    this.platform.setTextColour({ r: 255, g: 255, b: 255, a: 255 })
    this.platform.setTextCentre(true)
    this.platform.beginTextCommandDisplayText('STRING')
    this.platform.addTextComponentString(`${label} (${Math.floor(progress)}%)`)
    this.platform.endTextCommandDisplayText(0.5, y - 0.03)
  }

  private cleanup(completed: boolean): void {
    const ped = this.localPlayer.getHandle()
    if (this.state?.options.animation) {
      this.platform.stopAnimTask(
        ped,
        this.state.options.animation.dict,
        this.state.options.animation.anim,
        1.0,
      )
    }
    if (this.propHandle) {
      this.platform.deleteEntity(this.propHandle)
      this.propHandle = null
    }
    if (this.tickHandle !== null) {
      this.runtime.clearTick(this.tickHandle)
      this.tickHandle = null
    }
    if (this.state?.options.useCircular) this.platform.busyspinnerOff()
    this.state = null
    if (this.callback) {
      this.callback(completed)
      this.callback = null
    }
  }

  private async loadAnimDict(dict: string): Promise<void> {
    this.platform.requestAnimDict(dict)
    while (!this.platform.hasAnimDictLoaded(dict)) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  private async loadModel(model: string): Promise<void> {
    const hash = this.platform.getHashKey(model)
    this.platform.requestModel(hash)
    while (!this.platform.hasModelLoaded(hash)) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }
}
