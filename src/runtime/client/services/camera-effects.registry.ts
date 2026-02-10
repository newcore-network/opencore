import { injectable } from 'tsyringe'
import { Camera } from './camera'

/**
 * Reason reported when an effect instance is finalized.
 */
export type EffectTeardownReason = 'completed' | 'cancelled' | 'interrupted'

/**
 * Shared context delivered to effect handlers.
 */
export interface CameraEffectContext {
  /** Low-level camera API instance used by the cinematic runtime. */
  camera: Camera
  /** Active camera handle for the running cinematic. */
  camHandle: number
  /** Absolute elapsed time in milliseconds within the current shot. */
  elapsedMs: number
  /** Normalized [0..1] progress inside the active effect window. */
  normalized: number
  /** Delta time since previous frame in milliseconds. */
  deltaMs: number
  /** Draws a subtitle line on screen for one frame. */
  drawSubtitle(text: string): void
  /** Draws cinematic bars for one frame. */
  drawLetterbox(top: number, bottom: number, alpha?: number): void
}

/**
 * A reusable effect implementation.
 */
export interface CameraEffectDefinition<TParams = Record<string, unknown>> {
  /** Unique effect id. */
  id: string
  /** Optional default params merged with user params. */
  defaults?: Partial<TParams>
  /** Called when the effect enters its active window. */
  setup?: (ctx: CameraEffectContext, params: TParams) => void | Promise<void>
  /** Called every frame while active. */
  update?: (ctx: CameraEffectContext, params: TParams) => void | Promise<void>
  /** Called when the effect leaves its active window. */
  teardown?: (
    ctx: CameraEffectContext,
    params: TParams,
    reason: EffectTeardownReason,
  ) => void | Promise<void>
}

/**
 * Effect reference used inside a cinematic definition.
 */
export interface CameraEffectReference<TParams = Record<string, unknown>> {
  /** Effect id to load from registry. */
  id: string
  /** Optional runtime params merged over effect defaults. */
  params?: Partial<TParams>
  /** Optional local start timestamp in milliseconds. */
  fromMs?: number
  /** Optional local end timestamp in milliseconds. */
  toMs?: number
}

/**
 * Named collection of effects that can be reused in multiple cinematics.
 */
export interface CameraEffectPreset {
  id: string
  effects: CameraEffectReference[]
}

/**
 * Registry for built-in and custom cinematic camera effects.
 */
@injectable()
export class CameraEffectsRegistry {
  private effects = new Map<string, CameraEffectDefinition>()
  private presets = new Map<string, CameraEffectPreset>()

  /**
   * Registers a single effect definition.
   */
  register<TParams = Record<string, unknown>>(definition: CameraEffectDefinition<TParams>): void {
    this.effects.set(definition.id, definition as CameraEffectDefinition)
  }

  /**
   * Registers a reusable effect preset.
   */
  definePreset(preset: CameraEffectPreset): void {
    this.presets.set(preset.id, preset)
  }

  /**
   * Returns an effect by id.
   */
  get(effectId: string): CameraEffectDefinition | undefined {
    return this.effects.get(effectId)
  }

  /**
   * Returns a cloned effect list from a preset id.
   */
  usePreset(presetId: string): CameraEffectReference[] {
    const preset = this.presets.get(presetId)
    if (!preset) return []
    return preset.effects.map((effect) => ({ ...effect }))
  }

  /**
   * Returns true when an effect id exists in the registry.
   */
  has(effectId: string): boolean {
    return this.effects.has(effectId)
  }

  /**
   * Registers the framework default effect set.
   */
  registerBuiltins(): void {
    this.register({
      id: 'fadeIn',
      defaults: { ms: 500 },
      setup: (_ctx, params) => {
        const ms = Number((params as Record<string, unknown>).ms ?? 500)
        DoScreenFadeIn(ms)
      },
    })

    this.register({
      id: 'fadeOut',
      defaults: { ms: 500 },
      setup: (_ctx, params) => {
        const ms = Number((params as Record<string, unknown>).ms ?? 500)
        DoScreenFadeOut(ms)
      },
    })

    this.register({
      id: 'camShake',
      defaults: { type: 'HAND_SHAKE', amplitude: 0.35 },
      setup: (ctx, params) => {
        const p = params as Record<string, unknown>
        const type = String(p.type ?? 'HAND_SHAKE')
        const amplitude = Number(p.amplitude ?? 0.35)
        ctx.camera.shake(ctx.camHandle, { type, amplitude })
      },
      teardown: (ctx) => {
        ctx.camera.stopShaking(ctx.camHandle, true)
      },
    })

    this.register({
      id: 'timecycle',
      defaults: { name: 'default', strength: 1 },
      setup: (_ctx, params) => {
        const p = params as Record<string, unknown>
        const name = String(p.name ?? 'default')
        const strength = Number(p.strength ?? 1)
        SetTimecycleModifier(name)
        SetTimecycleModifierStrength(strength)
      },
      teardown: () => {
        ClearTimecycleModifier()
      },
    })

    this.register({
      id: 'letterbox',
      defaults: { top: 0.1, bottom: 0.1, alpha: 230 },
      update: (ctx, params) => {
        const p = params as Record<string, unknown>
        ctx.drawLetterbox(Number(p.top ?? 0.1), Number(p.bottom ?? 0.1), Number(p.alpha ?? 230))
      },
    })

    this.register({
      id: 'subtitle',
      defaults: { text: '', durationMs: 1000 },
      update: (ctx, params) => {
        const p = params as Record<string, unknown>
        if (!p.text) return
        ctx.drawSubtitle(String(p.text))
      },
    })
  }
}
