import { injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import {
  type CameraEffectContext,
  type CameraEffectDefinition,
  type CameraEffectReference,
  CameraEffectsRegistry,
  type EffectTeardownReason,
} from './camera-effects.registry'
import { type CameraRotation, Camera } from './camera'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Supported easing names for timeline interpolation.
 */
export type CinematicEase =
  | 'linear'
  | 'inSine'
  | 'outSine'
  | 'inOutSine'
  | 'inCubic'
  | 'outCubic'
  | 'inOutCubic'

/**
 * Position source resolved at runtime.
 */
export type PositionInput =
  | { type: 'coords'; x: number; y: number; z: number }
  | { type: 'entity'; entity: number; offset?: Vector3 }
  | { type: 'entityBone'; entity: number; bone: number; offset?: Vector3 }
  | { type: 'anchor'; name: string; offset?: Vector3 }
  | { type: 'resolver'; resolve: () => Vector3 | Promise<Vector3> }

/**
 * Camera node input used by shot from/to/path definitions.
 */
export type CameraNodeInput = PositionInput & {
  rotation?: CameraRotation
  fov?: number
}

/**
 * Look-at target source resolved at runtime.
 */
export type LookAtInput = PositionInput

/**
 * A single cinematic timeline shot.
 */
export interface CinematicShot {
  /** Optional stable shot id for runtime edits. */
  id?: string
  /** Shot duration. Required for camera movement shots. */
  durationMs?: number
  /** Wait step duration without camera transform changes. */
  waitMs?: number
  /** Start camera node used when path is omitted. */
  from?: CameraNodeInput
  /** End camera node used when path is omitted. */
  to?: CameraNodeInput
  /** Multi-point path that may mix different position source types. */
  path?: CameraNodeInput[]
  /** Optional look target or look target path. */
  lookAt?: LookAtInput | LookAtInput[]
  /** Interpolation easing. Defaults to linear. */
  ease?: CinematicEase
  /** Effects applied only during this shot. */
  effects?: CameraEffectReference[]
}

/**
 * Full cinematic timeline definition.
 */
export interface CinematicDefinition {
  /** Optional timeline id used for logs/debugging. */
  id?: string
  /** Whether player can skip with skipControlId. */
  skippable?: boolean
  /** Freeze player while running. */
  freezePlayer?: boolean
  /** Set player invincible while running. */
  invinciblePlayer?: boolean
  /** Hide HUD while running. */
  hideHud?: boolean
  /** Hide radar while running. */
  hideRadar?: boolean
  /** Global effects active across all shots. */
  effects?: CameraEffectReference[]
  /** Effect presets to expand into global effects. */
  effectPresets?: string[]
  /** Reusable named anchors for this timeline. */
  anchors?: Record<string, Vector3>
  /** Ordered timeline shots. */
  shots: CinematicShot[]
}

/**
 * Runtime options for playback.
 */
export interface CinematicStartOptions {
  /** Control id used to skip when skippable is true. */
  skipControlId?: number
  /** Camera name used for CreateCam. */
  cameraName?: string
}

/**
 * Final status of a cinematic timeline.
 */
export type CinematicResultStatus = 'completed' | 'cancelled' | 'interrupted'

/**
 * Completion payload returned by play() and handle.result.
 */
export interface CinematicResult {
  status: CinematicResultStatus
  definitionId?: string
}

/**
 * Structured validation error thrown when a cinematic definition is invalid.
 */
export class CinematicValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      [
        'Invalid cinematic definition:',
        ...issues.map((issue, index) => `  ${index + 1}. ${issue}`),
      ].join('\n'),
    )
    this.name = 'CinematicValidationError'
  }
}

/**
 * Payload for shot lifecycle events.
 */
export interface CinematicShotEventPayload {
  shotIndex: number
  totalShots: number
  shotId?: string
  kind: 'wait' | 'motion'
  plannedDurationMs: number
}

/**
 * Payload for effect activation events.
 */
export interface CinematicEffectEventPayload {
  effectId: string
  shotIndex: number
  shotId?: string
}

/**
 * Event payload mapping for strongly typed subscriptions.
 */
export interface CinematicEventPayloadMap {
  shotStart: CinematicShotEventPayload
  shotEnd: CinematicShotEventPayload
  effectApplied: CinematicEffectEventPayload
  paused: undefined
  resumed: undefined
  completed: CinematicResult
  cancelled: CinematicResult
  interrupted: CinematicResult
}

/**
 * Runtime events emitted by cinematic handles.
 */
export type CinematicEventName =
  | 'shotStart'
  | 'shotEnd'
  | 'effectApplied'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'cancelled'
  | 'interrupted'

type CinematicEventHandler<TPayload> = (payload: TPayload) => void

interface ResolvedNode {
  position: Vector3
  rotation?: CameraRotation
  fov?: number
}

interface RuntimeEffect {
  ref: CameraEffectReference
  definition: CameraEffectDefinition
  params: Record<string, unknown>
  active: boolean
}

interface CinematicRuntimeState {
  definition: CinematicDefinition
  options: Required<CinematicStartOptions>
  camHandle: number
  cancelled: boolean
  paused: boolean
  pauseStartedAt: number | null
  interruptStatus: CinematicResultStatus | null
}

/**
 * Mutable control handle for a running cinematic.
 */
export class CinematicHandle {
  private listeners = new Map<CinematicEventName, Set<CinematicEventHandler<unknown>>>()

  constructor(
    private runtime: CinematicRuntimeState,
    /** Promise resolved when the cinematic finishes. */
    public readonly result: Promise<CinematicResult>,
  ) {}

  /**
   * Pauses timeline progression.
   */
  pause(): void {
    if (this.runtime.paused) return
    this.runtime.paused = true
    this.runtime.pauseStartedAt = GetGameTimer()
    this.emit('paused', undefined)
  }

  /**
   * Resumes timeline progression.
   */
  resume(): void {
    if (!this.runtime.paused) return
    this.runtime.paused = false
    this.runtime.pauseStartedAt = null
    this.emit('resumed', undefined)
  }

  /**
   * Cancels timeline execution.
   */
  cancel(): void {
    this.runtime.cancelled = true
    this.runtime.interruptStatus = 'cancelled'
  }

  /**
   * Requests skip as a cancellation with completed cleanup.
   */
  skip(): void {
    this.cancel()
  }

  /**
   * Applies an in-place patch to the live definition object.
   */
  edit(mutator: (definition: CinematicDefinition) => void): void {
    mutator(this.runtime.definition)
  }

  /**
   * Inserts a shot at a specific index.
   */
  insertShot(index: number, shot: CinematicShot): void {
    this.runtime.definition.shots.splice(Math.max(0, index), 0, shot)
  }

  /**
   * Replaces a shot by id or no-ops when not found.
   */
  replaceShot(shotId: string, shot: CinematicShot): void {
    const index = this.runtime.definition.shots.findIndex((entry) => entry.id === shotId)
    if (index === -1) return
    this.runtime.definition.shots[index] = shot
  }

  /**
   * Replaces global effects for the running definition.
   */
  setEffects(effects: CameraEffectReference[]): void {
    this.runtime.definition.effects = effects
  }

  /**
   * Adds a global effect to the running definition.
   */
  addEffect(effect: CameraEffectReference): void {
    if (!this.runtime.definition.effects) {
      this.runtime.definition.effects = []
    }
    this.runtime.definition.effects.push(effect)
  }

  /**
   * Removes all global effects with a matching id.
   */
  removeEffect(effectId: string): void {
    const current = this.runtime.definition.effects ?? []
    this.runtime.definition.effects = current.filter((effect) => effect.id !== effectId)
  }

  /**
   * Subscribes to runtime handle events.
   */
  on<TEventName extends CinematicEventName>(
    eventName: TEventName,
    handler: CinematicEventHandler<CinematicEventPayloadMap[TEventName]>,
  ): () => void {
    const handlers = this.listeners.get(eventName) ?? new Set<CinematicEventHandler<unknown>>()
    handlers.add(handler as CinematicEventHandler<unknown>)
    this.listeners.set(eventName, handlers)
    return () => {
      handlers.delete(handler as CinematicEventHandler<unknown>)
    }
  }

  /**
   * Emits an event to handle subscribers.
   */
  emit<TEventName extends CinematicEventName>(
    eventName: TEventName,
    payload: CinematicEventPayloadMap[TEventName],
  ): void {
    const handlers = this.listeners.get(eventName)
    if (!handlers || handlers.size === 0) return
    for (const handler of handlers.values()) {
      ;(handler as CinematicEventHandler<CinematicEventPayloadMap[TEventName]>)(payload)
    }
  }
}

/**
 * High-level cinematic timeline API built on top of Camera.
 */
@injectable()
export class Cinematic {
  /**
   * Exposes the registry so consumers can add custom effects and presets.
   */
  public readonly effects: CameraEffectsRegistry

  private activeRuntime: CinematicRuntimeState | null = null

  constructor(
    private readonly camera: Camera,
    effectsRegistry: CameraEffectsRegistry,
  ) {
    this.effects = effectsRegistry
    if (!this.effects.has('fadeIn')) {
      this.effects.registerBuiltins()
    }

    const currentResource = GetCurrentResourceName()
    on('onClientResourceStop', (resourceName: string) => {
      if (resourceName !== currentResource) return
      this.cancel()
      this.camera.reset({ ease: false, easeTimeMs: 0 })
    })
  }

  /**
   * Starts a cinematic and returns a mutable runtime handle immediately.
   */
  start(definition: CinematicDefinition, options: CinematicStartOptions = {}): CinematicHandle {
    this.validateDefinition(definition)

    if (this.activeRuntime) {
      this.activeRuntime.cancelled = true
      this.activeRuntime.interruptStatus = 'interrupted'
    }

    const runtime: CinematicRuntimeState = {
      definition,
      options: {
        skipControlId: options.skipControlId ?? 200,
        cameraName: options.cameraName ?? 'DEFAULT_SCRIPTED_CAMERA',
      },
      camHandle: this.camera.create({
        camName: options.cameraName ?? 'DEFAULT_SCRIPTED_CAMERA',
        active: true,
      }),
      cancelled: false,
      paused: false,
      pauseStartedAt: null,
      interruptStatus: null,
    }

    this.activeRuntime = runtime
    this.camera.setActive(runtime.camHandle, true)
    this.camera.render(true, { ease: true, easeTimeMs: 250 })

    let resolveResult: ((result: CinematicResult) => void) | null = null
    let rejectResult: ((error: unknown) => void) | null = null

    const resultPromise = new Promise<CinematicResult>((resolve, reject) => {
      resolveResult = resolve
      rejectResult = reject
    })

    const handle = new CinematicHandle(runtime, resultPromise)

    void this.run(runtime, handle)
      .then((result) => {
        if (result.status === 'completed') {
          handle.emit('completed', result)
        } else if (result.status === 'interrupted') {
          handle.emit('interrupted', result)
        } else {
          handle.emit('cancelled', result)
        }

        resolveResult?.(result)
      })
      .catch((error) => {
        rejectResult?.(error)
      })

    return handle
  }

  /**
   * Starts and awaits a cinematic timeline until completion.
   */
  async play(
    definition: CinematicDefinition,
    options: CinematicStartOptions = {},
  ): Promise<CinematicResult> {
    const handle = this.start(definition, options)
    return handle.result
  }

  /**
   * Returns true when a cinematic timeline is running.
   */
  isRunning(): boolean {
    return this.activeRuntime !== null
  }

  /**
   * Cancels the active cinematic if one exists.
   */
  cancel(): void {
    if (!this.activeRuntime) return
    this.activeRuntime.cancelled = true
    this.activeRuntime.interruptStatus = 'cancelled'
  }

  /**
   * Registers a custom effect.
   */
  registerEffect<TParams = Record<string, unknown>>(effect: CameraEffectDefinition<TParams>): void {
    this.effects.register(effect)
  }

  private async run(
    runtime: CinematicRuntimeState,
    handle: CinematicHandle,
  ): Promise<CinematicResult> {
    const ped = PlayerPedId()

    try {
      this.applyRuntimeFlags(runtime.definition, ped)

      let shotIndex = 0
      while (shotIndex < runtime.definition.shots.length) {
        if (runtime.cancelled) {
          break
        }

        const shot = runtime.definition.shots[shotIndex]
        const plannedDurationMs = shot.waitMs ?? shot.durationMs ?? 0
        const shotPayload: CinematicShotEventPayload = {
          shotIndex,
          totalShots: runtime.definition.shots.length,
          shotId: shot.id,
          kind: shot.waitMs ? 'wait' : 'motion',
          plannedDurationMs,
        }
        handle.emit('shotStart', shotPayload)

        if (shot.waitMs && shot.waitMs > 0) {
          await this.waitStep(runtime, shot.waitMs)
          handle.emit('shotEnd', shotPayload)
          shotIndex += 1
          continue
        }

        const durationMs = shot.durationMs ?? 0
        if (durationMs <= 0) {
          handle.emit('shotEnd', shotPayload)
          shotIndex += 1
          continue
        }

        const nodes = await this.resolveShotNodes(shot, runtime.definition.anchors ?? {})
        if (nodes.length === 0) {
          handle.emit('shotEnd', shotPayload)
          shotIndex += 1
          continue
        }

        const globalEffects = this.resolveGlobalEffects(runtime.definition)
        const shotEffects = shot.effects ?? []
        const effects = this.buildRuntimeEffects([...globalEffects, ...shotEffects])

        await this.runShot(runtime, handle, shotIndex, shot, nodes, effects, durationMs)
        handle.emit('shotEnd', shotPayload)
        shotIndex += 1
      }

      if (runtime.cancelled) {
        return {
          status: runtime.interruptStatus ?? 'cancelled',
          definitionId: runtime.definition.id,
        }
      }

      return {
        status: 'completed',
        definitionId: runtime.definition.id,
      }
    } finally {
      this.cleanupRuntime(runtime, ped)
      if (this.activeRuntime === runtime) {
        this.activeRuntime = null
      }
    }
  }

  private applyRuntimeFlags(definition: CinematicDefinition, ped: number): void {
    if (definition.freezePlayer) {
      FreezeEntityPosition(ped, true)
    }
    if (definition.invinciblePlayer) {
      SetEntityInvincible(ped, true)
    }
    if (definition.hideHud) {
      DisplayHud(false)
    }
    if (definition.hideRadar) {
      DisplayRadar(false)
    }
  }

  private cleanupRuntime(runtime: CinematicRuntimeState, ped: number): void {
    this.camera.stopPointing(runtime.camHandle)
    this.camera.stopShaking(runtime.camHandle, true)
    this.camera.render(false, { ease: true, easeTimeMs: 250 })
    this.camera.destroy(runtime.camHandle, false)

    if (runtime.definition.freezePlayer) {
      FreezeEntityPosition(ped, false)
    }
    if (runtime.definition.invinciblePlayer) {
      SetEntityInvincible(ped, false)
    }
    if (runtime.definition.hideHud) {
      DisplayHud(true)
    }
    if (runtime.definition.hideRadar) {
      DisplayRadar(true)
    }

    ClearTimecycleModifier()
  }

  private resolveGlobalEffects(definition: CinematicDefinition): CameraEffectReference[] {
    const direct = definition.effects ?? []
    const presetRefs = (definition.effectPresets ?? []).flatMap((presetId) =>
      this.effects.usePreset(presetId),
    )
    return [...presetRefs, ...direct]
  }

  private buildRuntimeEffects(effectRefs: CameraEffectReference[]): RuntimeEffect[] {
    const effects: RuntimeEffect[] = []

    for (const ref of effectRefs) {
      const definition = this.effects.get(ref.id)
      if (!definition) continue
      const params = {
        ...(definition.defaults as Record<string, unknown> | undefined),
        ...(ref.params as Record<string, unknown> | undefined),
      }
      effects.push({
        ref,
        definition,
        params,
        active: false,
      })
    }

    return effects
  }

  private async runShot(
    runtime: CinematicRuntimeState,
    handle: CinematicHandle,
    shotIndex: number,
    shot: CinematicShot,
    nodes: ResolvedNode[],
    effects: RuntimeEffect[],
    durationMs: number,
  ): Promise<void> {
    const start = GetGameTimer()
    let previousTime = start

    while (true) {
      if (runtime.cancelled) {
        await this.finalizeEffects(runtime, effects, 'cancelled', durationMs)
        return
      }

      if (runtime.paused) {
        previousTime = GetGameTimer()
        await delay(0)
        continue
      }

      if (runtime.definition.skippable && IsControlJustPressed(0, runtime.options.skipControlId)) {
        runtime.cancelled = true
        runtime.interruptStatus = 'cancelled'
        await this.finalizeEffects(runtime, effects, 'cancelled', durationMs)
        return
      }

      const now = GetGameTimer()
      const elapsedMs = now - start
      const deltaMs = now - previousTime
      previousTime = now
      const normalized = this.applyEase(Math.min(elapsedMs / durationMs, 1), shot.ease ?? 'linear')

      const node = this.sampleNode(nodes, normalized)
      this.camera.setTransform(runtime.camHandle, {
        position: node.position,
        rotation: node.rotation,
        fov: node.fov,
      })

      if (shot.lookAt) {
        const lookTarget = await this.resolveLookAtTarget(
          shot.lookAt,
          runtime.definition.anchors ?? {},
          normalized,
        )
        this.camera.pointAtCoords(runtime.camHandle, lookTarget)
      } else {
        this.camera.stopPointing(runtime.camHandle)
      }

      await this.updateEffects(
        runtime,
        handle,
        shotIndex,
        shot.id,
        effects,
        elapsedMs,
        deltaMs,
        durationMs,
      )

      if (elapsedMs >= durationMs) {
        await this.finalizeEffects(runtime, effects, 'completed', durationMs)
        return
      }

      await delay(0)
    }
  }

  private async waitStep(runtime: CinematicRuntimeState, waitMs: number): Promise<void> {
    const started = GetGameTimer()
    while (GetGameTimer() - started < waitMs) {
      if (runtime.cancelled) return

      if (runtime.paused) {
        await delay(0)
        continue
      }

      if (runtime.definition.skippable && IsControlJustPressed(0, runtime.options.skipControlId)) {
        runtime.cancelled = true
        runtime.interruptStatus = 'cancelled'
        return
      }

      await delay(0)
    }
  }

  private async updateEffects(
    runtime: CinematicRuntimeState,
    handle: CinematicHandle,
    shotIndex: number,
    shotId: string | undefined,
    effects: RuntimeEffect[],
    elapsedMs: number,
    deltaMs: number,
    totalDurationMs: number,
  ): Promise<void> {
    for (const effect of effects) {
      const fromMs = effect.ref.fromMs ?? 0
      const toMs = effect.ref.toMs ?? totalDurationMs
      const isActive = elapsedMs >= fromMs && elapsedMs <= toMs
      const windowDuration = Math.max(1, toMs - fromMs)
      const normalized = Math.min(Math.max((elapsedMs - fromMs) / windowDuration, 0), 1)
      const ctx = this.createEffectContext(runtime, elapsedMs, normalized, deltaMs)

      if (isActive && !effect.active && effect.definition.setup) {
        await effect.definition.setup(ctx, effect.params)
        handle.emit('effectApplied', {
          effectId: effect.ref.id,
          shotIndex,
          shotId,
        })
      }

      if (isActive && effect.definition.update) {
        await effect.definition.update(ctx, effect.params)
      }

      if (!isActive && effect.active && effect.definition.teardown) {
        await effect.definition.teardown(ctx, effect.params, 'completed')
      }

      effect.active = isActive
    }
  }

  private async finalizeEffects(
    runtime: CinematicRuntimeState,
    effects: RuntimeEffect[],
    reason: EffectTeardownReason,
    elapsedMs: number,
  ): Promise<void> {
    for (const effect of effects) {
      if (!effect.active || !effect.definition.teardown) continue
      const ctx = this.createEffectContext(runtime, elapsedMs, 1, 0)
      await effect.definition.teardown(ctx, effect.params, reason)
      effect.active = false
    }
  }

  private createEffectContext(
    runtime: CinematicRuntimeState,
    elapsedMs: number,
    normalized: number,
    deltaMs: number,
  ): CameraEffectContext {
    return {
      camera: this.camera,
      camHandle: runtime.camHandle,
      elapsedMs,
      normalized,
      deltaMs,
      drawSubtitle: (text: string) => {
        BeginTextCommandDisplayText('STRING')
        AddTextComponentSubstringPlayerName(text)
        EndTextCommandDisplayText(0.5, 0.92)
      },
      drawLetterbox: (top: number, bottom: number, alpha = 230) => {
        const topHeight = Math.max(0, Math.min(0.5, top))
        const bottomHeight = Math.max(0, Math.min(0.5, bottom))
        DrawRect(0.5, topHeight / 2, 1.0, topHeight, 0, 0, 0, alpha)
        DrawRect(0.5, 1 - bottomHeight / 2, 1.0, bottomHeight, 0, 0, 0, alpha)
      },
    }
  }

  private async resolveShotNodes(
    shot: CinematicShot,
    anchors: Record<string, Vector3>,
  ): Promise<ResolvedNode[]> {
    if (shot.path && shot.path.length > 0) {
      const nodes: ResolvedNode[] = []
      for (const pathNode of shot.path) {
        nodes.push(await this.resolveCameraNode(pathNode, anchors))
      }
      return nodes
    }

    if (shot.from && shot.to) {
      return [
        await this.resolveCameraNode(shot.from, anchors),
        await this.resolveCameraNode(shot.to, anchors),
      ]
    }

    if (shot.from) {
      return [await this.resolveCameraNode(shot.from, anchors)]
    }

    return []
  }

  private async resolveCameraNode(
    node: CameraNodeInput,
    anchors: Record<string, Vector3>,
  ): Promise<ResolvedNode> {
    const position = await this.resolvePosition(node, anchors)
    return {
      position,
      rotation: node.rotation,
      fov: node.fov,
    }
  }

  private async resolveLookAtTarget(
    input: LookAtInput | LookAtInput[],
    anchors: Record<string, Vector3>,
    normalized: number,
  ): Promise<Vector3> {
    if (!Array.isArray(input)) {
      return this.resolvePosition(input, anchors)
    }

    if (input.length === 0) {
      return { x: 0, y: 0, z: 0 }
    }

    if (input.length === 1) {
      return this.resolvePosition(input[0], anchors)
    }

    const positions: Vector3[] = []
    for (const target of input) {
      positions.push(await this.resolvePosition(target, anchors))
    }

    return this.samplePosition(positions, normalized)
  }

  private async resolvePosition(
    input: PositionInput,
    anchors: Record<string, Vector3>,
  ): Promise<Vector3> {
    switch (input.type) {
      case 'coords':
        return { x: input.x, y: input.y, z: input.z }
      case 'entity': {
        const [x, y, z] = GetEntityCoords(input.entity, true)
        return {
          x: x + (input.offset?.x ?? 0),
          y: y + (input.offset?.y ?? 0),
          z: z + (input.offset?.z ?? 0),
        }
      }
      case 'entityBone': {
        const [x, y, z] = GetWorldPositionOfEntityBone(input.entity, input.bone)
        return {
          x: x + (input.offset?.x ?? 0),
          y: y + (input.offset?.y ?? 0),
          z: z + (input.offset?.z ?? 0),
        }
      }
      case 'anchor': {
        const anchor = anchors[input.name]
        if (!anchor) {
          throw new Error(`Unknown cinematic anchor "${input.name}"`)
        }
        return {
          x: anchor.x + (input.offset?.x ?? 0),
          y: anchor.y + (input.offset?.y ?? 0),
          z: anchor.z + (input.offset?.z ?? 0),
        }
      }
      case 'resolver':
        return input.resolve()
    }
  }

  private validateDefinition(definition: CinematicDefinition): void {
    const issues: string[] = []

    if (!Array.isArray(definition.shots) || definition.shots.length === 0) {
      issues.push('`shots` must contain at least one shot.')
    }

    const seenShotIds = new Set<string>()

    for (let index = 0; index < definition.shots.length; index += 1) {
      const shot = definition.shots[index]
      const label = `Shot #${index + 1}`

      if (shot.id) {
        if (seenShotIds.has(shot.id)) {
          issues.push(`${label} has duplicated id "${shot.id}".`)
        }
        seenShotIds.add(shot.id)
      }

      const isWait = typeof shot.waitMs === 'number'
      const hasMotion =
        typeof shot.durationMs === 'number' || !!shot.from || !!shot.to || !!shot.path

      if (!isWait && !hasMotion) {
        issues.push(`${label} must define either waitMs or camera motion data.`)
      }

      if (isWait) {
        if (!Number.isFinite(shot.waitMs) || (shot.waitMs ?? 0) <= 0) {
          issues.push(`${label} waitMs must be a positive number.`)
        }
        if (shot.from || shot.to || shot.path || shot.durationMs) {
          issues.push(`${label} cannot mix waitMs with from/to/path/durationMs.`)
        }
      } else {
        if (!Number.isFinite(shot.durationMs) || (shot.durationMs ?? 0) <= 0) {
          issues.push(`${label} durationMs must be a positive number for motion shots.`)
        }

        const hasPath = !!shot.path && shot.path.length > 0
        const hasFromTo = !!shot.from || !!shot.to

        if (!hasPath && !hasFromTo) {
          issues.push(`${label} must define path or from/to.`)
        }

        if (shot.path && shot.path.length === 0) {
          issues.push(`${label} path cannot be empty.`)
        }

        if (shot.path && hasFromTo) {
          issues.push(`${label} cannot define both path and from/to.`)
        }
      }

      if (shot.lookAt && Array.isArray(shot.lookAt) && shot.lookAt.length === 0) {
        issues.push(`${label} lookAt array cannot be empty.`)
      }

      this.validatePositionNode(shot.from, definition.anchors ?? {}, `${label}.from`, issues)
      this.validatePositionNode(shot.to, definition.anchors ?? {}, `${label}.to`, issues)
      for (let pathIndex = 0; pathIndex < (shot.path?.length ?? 0); pathIndex += 1) {
        this.validatePositionNode(
          shot.path?.[pathIndex],
          definition.anchors ?? {},
          `${label}.path[${pathIndex}]`,
          issues,
        )
      }

      const lookTargets = shot.lookAt
        ? Array.isArray(shot.lookAt)
          ? shot.lookAt
          : [shot.lookAt]
        : []
      for (let lookIndex = 0; lookIndex < lookTargets.length; lookIndex += 1) {
        this.validatePositionNode(
          lookTargets[lookIndex],
          definition.anchors ?? {},
          `${label}.lookAt[${lookIndex}]`,
          issues,
        )
      }

      this.validateEffects(shot.effects ?? [], `${label}.effects`, issues)
    }

    const presets = definition.effectPresets ?? []
    for (const preset of presets) {
      if (!this.effects.hasPreset(preset)) {
        issues.push(`Unknown effect preset "${preset}".`)
      }
    }

    this.validateEffects(definition.effects ?? [], 'effects', issues)

    if (issues.length > 0) {
      throw new CinematicValidationError(issues)
    }
  }

  private validateEffects(effects: CameraEffectReference[], scope: string, issues: string[]): void {
    for (let index = 0; index < effects.length; index += 1) {
      const effect = effects[index]
      const label = `${scope}[${index}]`

      if (!effect.id || typeof effect.id !== 'string') {
        issues.push(`${label}.id must be a non-empty string.`)
        continue
      }

      if (!this.effects.has(effect.id)) {
        issues.push(`${label} references unknown effect "${effect.id}".`)
      }

      if (effect.fromMs !== undefined && (!Number.isFinite(effect.fromMs) || effect.fromMs < 0)) {
        issues.push(`${label}.fromMs must be a number >= 0.`)
      }

      if (effect.toMs !== undefined && (!Number.isFinite(effect.toMs) || effect.toMs < 0)) {
        issues.push(`${label}.toMs must be a number >= 0.`)
      }

      if (
        effect.fromMs !== undefined &&
        effect.toMs !== undefined &&
        Number.isFinite(effect.fromMs) &&
        Number.isFinite(effect.toMs) &&
        effect.toMs < effect.fromMs
      ) {
        issues.push(`${label}.toMs must be greater than or equal to fromMs.`)
      }
    }
  }

  private validatePositionNode(
    node: PositionInput | undefined,
    anchors: Record<string, Vector3>,
    scope: string,
    issues: string[],
  ): void {
    if (!node) return

    if (node.type === 'anchor' && !anchors[node.name]) {
      issues.push(`${scope} references unknown anchor "${node.name}".`)
    }

    if (node.type === 'coords') {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) {
        issues.push(`${scope} coords must be finite numbers.`)
      }
    }

    if (node.type === 'entity' || node.type === 'entityBone') {
      if (!Number.isFinite(node.entity) || node.entity < 0) {
        issues.push(`${scope}.entity must be a valid entity handle number.`)
      }
    }

    if (node.type === 'entityBone') {
      if (!Number.isFinite(node.bone)) {
        issues.push(`${scope}.bone must be a finite number.`)
      }
    }

    if (node.type === 'resolver' && typeof node.resolve !== 'function') {
      issues.push(`${scope}.resolve must be a function.`)
    }
  }

  private sampleNode(nodes: ResolvedNode[], normalized: number): ResolvedNode {
    if (nodes.length === 1) {
      return nodes[0]
    }

    const segmentCount = nodes.length - 1
    const scaled = Math.min(Math.max(normalized, 0), 1) * segmentCount
    const index = Math.min(Math.floor(scaled), segmentCount - 1)
    const localT = scaled - index

    const current = nodes[index]
    const next = nodes[index + 1]

    return {
      position: {
        x: this.lerp(current.position.x, next.position.x, localT),
        y: this.lerp(current.position.y, next.position.y, localT),
        z: this.lerp(current.position.z, next.position.z, localT),
      },
      rotation: this.interpolateRotation(current.rotation, next.rotation, localT),
      fov: this.interpolateFov(current.fov, next.fov, localT),
    }
  }

  private samplePosition(positions: Vector3[], normalized: number): Vector3 {
    if (positions.length === 1) {
      return positions[0]
    }

    const segmentCount = positions.length - 1
    const scaled = Math.min(Math.max(normalized, 0), 1) * segmentCount
    const index = Math.min(Math.floor(scaled), segmentCount - 1)
    const localT = scaled - index

    const current = positions[index]
    const next = positions[index + 1]
    return {
      x: this.lerp(current.x, next.x, localT),
      y: this.lerp(current.y, next.y, localT),
      z: this.lerp(current.z, next.z, localT),
    }
  }

  private interpolateRotation(
    current: CameraRotation | undefined,
    next: CameraRotation | undefined,
    t: number,
  ): CameraRotation | undefined {
    if (!current && !next) {
      return undefined
    }

    const from = current ?? next
    const to = next ?? current

    if (!from || !to) {
      return undefined
    }

    return {
      x: this.lerp(from.x, to.x, t),
      y: this.lerp(from.y, to.y, t),
      z: this.lerp(from.z, to.z, t),
    }
  }

  private interpolateFov(
    current: number | undefined,
    next: number | undefined,
    t: number,
  ): number | undefined {
    if (typeof current !== 'number' && typeof next !== 'number') {
      return undefined
    }

    const from = typeof current === 'number' ? current : next
    const to = typeof next === 'number' ? next : current

    if (typeof from !== 'number' || typeof to !== 'number') {
      return undefined
    }

    return this.lerp(from, to, t)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private applyEase(t: number, ease: CinematicEase): number {
    const clamped = Math.min(Math.max(t, 0), 1)

    switch (ease) {
      case 'inSine':
        return 1 - Math.cos((clamped * Math.PI) / 2)
      case 'outSine':
        return Math.sin((clamped * Math.PI) / 2)
      case 'inOutSine':
        return -(Math.cos(Math.PI * clamped) - 1) / 2
      case 'inCubic':
        return clamped ** 3
      case 'outCubic':
        return 1 - (1 - clamped) ** 3
      case 'inOutCubic':
        return clamped < 0.5 ? 4 * clamped ** 3 : 1 - (-2 * clamped + 2) ** 3 / 2
      default:
        return clamped
    }
  }
}
