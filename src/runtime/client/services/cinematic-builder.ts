import { Vector3 } from '../../../kernel/utils/vector3'
import { type CameraEffectReference } from './camera-effects.registry'
import { type CameraRotation } from './camera'
import {
  type CameraNodeInput,
  type CinematicDefinition,
  type CinematicEase,
  type CinematicEventName,
  type CinematicEventPayloadMap,
  type CinematicHandle,
  type CinematicShot,
  type CinematicStartOptions,
  type LookAtInput,
  type PositionInput,
} from './cinematic'

type EffectLike = CameraEffectReference | EffectBuilder
type NodeLike = CameraNodeInput | NodeBuilder
type LookAtLike = LookAtInput | NodeBuilder
type SceneStartFn = (scene: SceneBuildable, options?: CinematicStartOptions) => CinematicHandle

export interface SceneDefaults {
  ease?: CinematicEase
  rotation?: CameraRotation
  fov?: number
  lookAt?: LookAtLike | LookAtLike[]
  effects?: EffectLike[]
}

export interface SceneFlags {
  skippable?: boolean
  freezePlayer?: boolean
  invinciblePlayer?: boolean
  hideHud?: boolean
  hideRadar?: boolean
}

export interface SceneBuildable {
  build(): CinematicDefinition
}

interface SceneBuilderOptions {
  id?: string
  start?: SceneStartFn
}

function cloneVector3(vector: Vector3): Vector3 {
  return { x: vector.x, y: vector.y, z: vector.z }
}

function clonePosition(input: PositionInput): PositionInput {
  switch (input.type) {
    case 'coords':
      return { type: 'coords', x: input.x, y: input.y, z: input.z }
    case 'entity':
      return {
        type: 'entity',
        entity: input.entity,
        offset: input.offset ? cloneVector3(input.offset) : undefined,
      }
    case 'entityBone':
      return {
        type: 'entityBone',
        entity: input.entity,
        bone: input.bone,
        offset: input.offset ? cloneVector3(input.offset) : undefined,
      }
    case 'anchor':
      return {
        type: 'anchor',
        name: input.name,
        offset: input.offset ? cloneVector3(input.offset) : undefined,
      }
    case 'resolver':
      return {
        type: 'resolver',
        resolve: input.resolve,
      }
  }
}

function cloneNode(input: CameraNodeInput): CameraNodeInput {
  return {
    ...clonePosition(input),
    rotation: input.rotation ? { ...input.rotation } : undefined,
    fov: input.fov,
  }
}

function toPosition(input: LookAtLike): PositionInput {
  if (input instanceof NodeBuilder) {
    return input.toPosition()
  }
  return clonePosition(input)
}

function toNode(input: NodeLike): CameraNodeInput {
  if (input instanceof NodeBuilder) {
    return input.build()
  }
  return cloneNode(input)
}

function toEffect(input: EffectLike): CameraEffectReference {
  if (input instanceof EffectBuilder) {
    return input.build()
  }
  return {
    ...input,
    params: input.params ? { ...input.params } : undefined,
  }
}

export class EffectBuilder {
  constructor(private readonly value: CameraEffectReference) {}

  window(fromMs: number, toMs: number): EffectBuilder {
    return new EffectBuilder({ ...this.value, fromMs, toMs })
  }

  from(fromMs: number): EffectBuilder {
    return new EffectBuilder({ ...this.value, fromMs })
  }

  to(toMs: number): EffectBuilder {
    return new EffectBuilder({ ...this.value, toMs })
  }

  build(): CameraEffectReference {
    return {
      ...this.value,
      params: this.value.params ? { ...this.value.params } : undefined,
    }
  }
}

export const Fx = {
  effect(id: string, params?: Record<string, unknown>): EffectBuilder {
    return new EffectBuilder({ id, params })
  },

  fadeIn(ms = 500): EffectBuilder {
    return new EffectBuilder({ id: 'fadeIn', params: { ms } })
  },

  fadeOut(ms = 500): EffectBuilder {
    return new EffectBuilder({ id: 'fadeOut', params: { ms } })
  },

  camShake(type = 'HAND_SHAKE', amplitude = 0.35): EffectBuilder {
    return new EffectBuilder({ id: 'camShake', params: { type, amplitude } })
  },

  timecycle(name = 'default', strength = 1): EffectBuilder {
    return new EffectBuilder({ id: 'timecycle', params: { name, strength } })
  },

  letterbox(top = 0.1, bottom = 0.1, alpha = 230): EffectBuilder {
    return new EffectBuilder({ id: 'letterbox', params: { top, bottom, alpha } })
  },

  subtitle(text: string, durationMs = 1000): EffectBuilder {
    return new EffectBuilder({ id: 'subtitle', params: { text, durationMs } })
  },
}

export class NodeBuilder {
  private rotationValue: CameraRotation | undefined
  private fovValue: number | undefined

  constructor(private readonly value: PositionInput) {}

  offset(x: number, y: number, z: number): NodeBuilder {
    const apply = (source: PositionInput): PositionInput => {
      switch (source.type) {
        case 'coords':
          return {
            type: 'coords',
            x: source.x + x,
            y: source.y + y,
            z: source.z + z,
          }
        case 'entity':
          return {
            ...source,
            offset: {
              x: (source.offset?.x ?? 0) + x,
              y: (source.offset?.y ?? 0) + y,
              z: (source.offset?.z ?? 0) + z,
            },
          }
        case 'entityBone':
          return {
            ...source,
            offset: {
              x: (source.offset?.x ?? 0) + x,
              y: (source.offset?.y ?? 0) + y,
              z: (source.offset?.z ?? 0) + z,
            },
          }
        case 'anchor':
          return {
            ...source,
            offset: {
              x: (source.offset?.x ?? 0) + x,
              y: (source.offset?.y ?? 0) + y,
              z: (source.offset?.z ?? 0) + z,
            },
          }
        case 'resolver':
          return {
            type: 'resolver',
            resolve: async () => {
              const resolved = await source.resolve()
              return { x: resolved.x + x, y: resolved.y + y, z: resolved.z + z }
            },
          }
      }
    }

    const next = new NodeBuilder(apply(this.value))
    next.rotationValue = this.rotationValue ? { ...this.rotationValue } : undefined
    next.fovValue = this.fovValue
    return next
  }

  rot(x: number, y: number, z: number): NodeBuilder {
    const next = new NodeBuilder(clonePosition(this.value))
    next.rotationValue = { x, y, z }
    next.fovValue = this.fovValue
    return next
  }

  fov(value: number): NodeBuilder {
    const next = new NodeBuilder(clonePosition(this.value))
    next.rotationValue = this.rotationValue ? { ...this.rotationValue } : undefined
    next.fovValue = value
    return next
  }

  build(): CameraNodeInput {
    return {
      ...clonePosition(this.value),
      rotation: this.rotationValue ? { ...this.rotationValue } : undefined,
      fov: this.fovValue,
    }
  }

  toPosition(): PositionInput {
    return clonePosition(this.value)
  }
}

export const Pos = {
  coords(x: number, y: number, z: number): NodeBuilder {
    return new NodeBuilder({ type: 'coords', x, y, z })
  },

  entity(entity: number, offset?: Vector3): NodeBuilder {
    return new NodeBuilder({ type: 'entity', entity, offset })
  },

  entityBone(entity: number, bone: number, offset?: Vector3): NodeBuilder {
    return new NodeBuilder({ type: 'entityBone', entity, bone, offset })
  },

  anchor(name: string, offset?: Vector3): NodeBuilder {
    return new NodeBuilder({ type: 'anchor', name, offset })
  },

  resolver(resolve: () => Vector3 | Promise<Vector3>): NodeBuilder {
    return new NodeBuilder({ type: 'resolver', resolve })
  },
}

export class ShotBuilder {
  private shot: CinematicShot

  constructor(private readonly id?: string) {
    this.shot = {
      id,
      effects: [],
    }
  }

  duration(durationMs: number): ShotBuilder {
    this.shot.durationMs = durationMs
    return this
  }

  ease(ease: CinematicEase): ShotBuilder {
    this.shot.ease = ease
    return this
  }

  from(node: NodeLike): ShotBuilder {
    this.shot.from = toNode(node)
    return this
  }

  to(node: NodeLike): ShotBuilder {
    this.shot.to = toNode(node)
    return this
  }

  path(...nodes: NodeLike[]): ShotBuilder {
    this.shot.path = nodes.map(toNode)
    return this
  }

  lookAt(target: LookAtLike, ...targets: LookAtLike[]): ShotBuilder {
    const all = [target, ...targets]
    if (all.length === 1) {
      this.shot.lookAt = toPosition(all[0])
      return this
    }
    this.shot.lookAt = all.map(toPosition)
    return this
  }

  effect(effect: EffectLike): ShotBuilder {
    if (!this.shot.effects) {
      this.shot.effects = []
    }
    this.shot.effects.push(toEffect(effect))
    return this
  }

  effects(...effects: EffectLike[]): ShotBuilder {
    for (const effect of effects) {
      this.effect(effect)
    }
    return this
  }

  build(defaults?: SceneDefaults): CinematicShot {
    const base = this.shot
    const resolvedEffects = [...(defaults?.effects?.map(toEffect) ?? []), ...(base.effects ?? [])]

    const shot: CinematicShot = {
      id: base.id,
      durationMs: base.durationMs,
      waitMs: base.waitMs,
      from: base.from ? cloneNode(base.from) : undefined,
      to: base.to ? cloneNode(base.to) : undefined,
      path: base.path ? base.path.map(cloneNode) : undefined,
      lookAt: Array.isArray(base.lookAt)
        ? base.lookAt.map((target) => clonePosition(target))
        : base.lookAt
          ? clonePosition(base.lookAt)
          : defaults?.lookAt
            ? Array.isArray(defaults.lookAt)
              ? defaults.lookAt.map((target) => toPosition(target))
              : toPosition(defaults.lookAt)
            : undefined,
      ease: base.ease ?? defaults?.ease,
      effects: resolvedEffects.length > 0 ? resolvedEffects : undefined,
    }

    if (typeof defaults?.fov === 'number') {
      if (shot.from && typeof shot.from.fov !== 'number') {
        shot.from.fov = defaults.fov
      }
      if (shot.to && typeof shot.to.fov !== 'number') {
        shot.to.fov = defaults.fov
      }
      if (shot.path) {
        shot.path = shot.path.map((entry) => ({
          ...entry,
          fov: typeof entry.fov === 'number' ? entry.fov : defaults.fov,
        }))
      }
    }

    if (defaults?.rotation) {
      if (shot.from && !shot.from.rotation) {
        shot.from.rotation = { ...defaults.rotation }
      }
      if (shot.to && !shot.to.rotation) {
        shot.to.rotation = { ...defaults.rotation }
      }
      if (shot.path) {
        shot.path = shot.path.map((entry) => ({
          ...entry,
          rotation: entry.rotation ? { ...entry.rotation } : { ...defaults.rotation! },
        }))
      }
    }

    return shot
  }
}

export class SceneBuilder implements SceneBuildable {
  private definition: CinematicDefinition
  private defaultsValue: SceneDefaults = {}
  private startFn?: SceneStartFn
  private listeners = new Map<CinematicEventName, Set<(payload: unknown) => void>>()

  constructor(options: SceneBuilderOptions = {}) {
    this.definition = {
      id: options.id,
      shots: [],
    }
    this.startFn = options.start
  }

  id(id: string): SceneBuilder {
    this.definition.id = id
    return this
  }

  flags(flags: SceneFlags): SceneBuilder {
    this.definition.skippable = flags.skippable ?? this.definition.skippable
    this.definition.freezePlayer = flags.freezePlayer ?? this.definition.freezePlayer
    this.definition.invinciblePlayer = flags.invinciblePlayer ?? this.definition.invinciblePlayer
    this.definition.hideHud = flags.hideHud ?? this.definition.hideHud
    this.definition.hideRadar = flags.hideRadar ?? this.definition.hideRadar
    return this
  }

  skippable(value = true): SceneBuilder {
    this.definition.skippable = value
    return this
  }

  freezePlayer(value = true): SceneBuilder {
    this.definition.freezePlayer = value
    return this
  }

  invinciblePlayer(value = true): SceneBuilder {
    this.definition.invinciblePlayer = value
    return this
  }

  hideHud(value = true): SceneBuilder {
    this.definition.hideHud = value
    return this
  }

  hideRadar(value = true): SceneBuilder {
    this.definition.hideRadar = value
    return this
  }

  defaults(defaults: SceneDefaults): SceneBuilder {
    this.defaultsValue = {
      ...this.defaultsValue,
      ...defaults,
      rotation: defaults.rotation ?? this.defaultsValue.rotation,
      lookAt: defaults.lookAt ?? this.defaultsValue.lookAt,
      effects: defaults.effects ?? this.defaultsValue.effects,
      fov: defaults.fov ?? this.defaultsValue.fov,
      ease: defaults.ease ?? this.defaultsValue.ease,
    }
    return this
  }

  anchor(name: string, position: Vector3): SceneBuilder {
    if (!this.definition.anchors) {
      this.definition.anchors = {}
    }
    this.definition.anchors[name] = cloneVector3(position)
    return this
  }

  anchors(anchors: Record<string, Vector3>): SceneBuilder {
    for (const [name, position] of Object.entries(anchors)) {
      this.anchor(name, position)
    }
    return this
  }

  effect(effect: EffectLike): SceneBuilder {
    if (!this.definition.effects) {
      this.definition.effects = []
    }
    this.definition.effects.push(toEffect(effect))
    return this
  }

  effects(...effects: EffectLike[]): SceneBuilder {
    for (const effect of effects) {
      this.effect(effect)
    }
    return this
  }

  preset(id: string): SceneBuilder {
    if (!this.definition.effectPresets) {
      this.definition.effectPresets = []
    }
    this.definition.effectPresets.push(id)
    return this
  }

  presets(...ids: string[]): SceneBuilder {
    for (const id of ids) {
      this.preset(id)
    }
    return this
  }

  shot(id: string, configure: (shot: ShotBuilder) => ShotBuilder | void): SceneBuilder
  shot(configure: (shot: ShotBuilder) => ShotBuilder | void): SceneBuilder
  shot(
    idOrConfigure: string | ((shot: ShotBuilder) => ShotBuilder | void),
    configure?: (shot: ShotBuilder) => ShotBuilder | void,
  ): SceneBuilder {
    const id = typeof idOrConfigure === 'string' ? idOrConfigure : undefined
    const buildFn = typeof idOrConfigure === 'function' ? idOrConfigure : configure
    if (!buildFn) {
      return this
    }

    const builder = new ShotBuilder(id)
    const configured = buildFn(builder)
    const shotBuilder = configured instanceof ShotBuilder ? configured : builder
    this.definition.shots.push(shotBuilder.build(this.defaultsValue))
    return this
  }

  wait(id: string, waitMs: number): SceneBuilder
  wait(waitMs: number): SceneBuilder
  wait(idOrMs: string | number, waitMs?: number): SceneBuilder {
    const id = typeof idOrMs === 'string' ? idOrMs : undefined
    const duration = typeof idOrMs === 'number' ? idOrMs : waitMs ?? 0
    this.definition.shots.push({ id, waitMs: duration })
    return this
  }

  on<TEventName extends CinematicEventName>(
    eventName: TEventName,
    handler: (payload: CinematicEventPayloadMap[TEventName]) => void,
  ): SceneBuilder {
    const handlers = this.listeners.get(eventName) ?? new Set<(payload: unknown) => void>()
    handlers.add(handler as (payload: unknown) => void)
    this.listeners.set(eventName, handlers)
    return this
  }

  build(): CinematicDefinition {
    return {
      ...this.definition,
      anchors: this.definition.anchors
        ? Object.fromEntries(
            Object.entries(this.definition.anchors).map(([name, vector]) => [name, cloneVector3(vector)]),
          )
        : undefined,
      effects: this.definition.effects?.map((effect) => toEffect(effect)),
      effectPresets: this.definition.effectPresets ? [...this.definition.effectPresets] : undefined,
      shots: this.definition.shots.map((shot) => ({
        ...shot,
        from: shot.from ? cloneNode(shot.from) : undefined,
        to: shot.to ? cloneNode(shot.to) : undefined,
        path: shot.path?.map(cloneNode),
        lookAt: Array.isArray(shot.lookAt)
          ? shot.lookAt.map((target) => clonePosition(target))
          : shot.lookAt
            ? clonePosition(shot.lookAt)
            : undefined,
        effects: shot.effects?.map((effect) => toEffect(effect)),
      })),
    }
  }

  start(options: CinematicStartOptions = {}): CinematicHandle {
    if (!this.startFn) {
      throw new Error('SceneBuilder cannot start without a cinematic context. Use cinematic.scene().')
    }

    const handle = this.startFn(this, options)
    for (const [eventName, handlers] of this.listeners.entries()) {
      for (const handler of handlers) {
        handle.on(eventName, handler as never)
      }
    }
    return handle
  }
}
