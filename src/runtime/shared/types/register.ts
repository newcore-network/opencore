/**
 * Event names reserved by the framework itself.
 *
 * @remarks
 * Strict mode admits these so that emitting a framework event stays legal even though no
 * resource declares one. Written as a namespace pattern rather than reusing `SystemEventName`,
 * because the values in `SYSTEM_EVENTS` are template literal types (`opencore:${string}`) built
 * by helper functions, so an exact union would not match them anyway.
 */
type FrameworkEventName = `opencore:${string}` | `_systemcore:${string}`

/**
 * Type-level registry augmented by the generated `.opencore/opencore.gen.ts` files.
 *
 * @remarks
 * This interface is intentionally empty. The OpenCore CLI scans controller decorators and
 * emits a `.gen.ts` per resource that augments it via declaration merging:
 *
 * ```ts
 * declare module '@open-core/framework/register' {
 *   interface Register {
 *     'resource:resources/bank': {
 *       serverEvents: { 'bank:deposit': [amount: number] }
 *     }
 *   }
 * }
 * ```
 *
 * Each resource contributes its **own key**, never a shared one: declaration merging rejects two
 * declarations of a property with different types (TS2717) and every resource of a project lands
 * in the same program, so a file claiming `serverEvents` outright would make the second resource
 * with events a compile error. {@link MapOf} merges the entries back together on read.
 *
 * When no generated file is part of the program, `Register` stays empty and every helper below
 * falls back to its loose form. That fallback *is* the on/off switch: disabling typegen requires
 * no changes to user code.
 *
 * @see {@link NameOf} for how names narrow, {@link ArgsOf} for how payloads narrow.
 */
// biome-ignore lint/suspicious/noEmptyInterface: declaration merging requires an interface
export interface Register {}

/** The keys generated files contribute to a registry, one per resource. */
type ResourceKeysOf<R> = Extract<keyof R, `resource:${string}`>

/** Collapses a union into an intersection. */
type UnionToIntersection<U> = (U extends unknown ? (probe: U) => void : never) extends (
  probe: infer I,
) => void
  ? I
  : never

/**
 * The map one resource entry registers under `K`, or `never` when that resource declares none.
 *
 * @remarks
 * A conditional rather than an indexed access, so an entry lacking `K` yields `never` and drops
 * out of the union instead of erroring.
 */
type MapIn<Entry, K extends string> = Entry extends { [P in K]: infer M } ? M : never

/**
 * Resolves the map registered under `K` across every resource of a registry, or `Fallback` when
 * none did.
 *
 * @remarks
 * Parameterised over the registry rather than reading {@link Register} directly, so the merging
 * can be asserted against a hand-written registry. Augmenting the real one is global to the
 * program, which would collide with the assertions covering the *inactive* state.
 *
 * Only the requested member of each entry is resolved. Writing this as
 * `Register extends Record<K, infer M> ? M : Fallback` would force TypeScript to resolve *every*
 * member at once, which is circular in real projects: resolving `serverEvents` pulls in a server
 * controller, which imports `Player`, whose `emit()` references `ClientEvents` — back here.
 *
 * The `[…] extends [never]` probes are tuple-wrapped so they test the union as a whole rather
 * than distributing over it.
 */
export type ResolveMap<R, K extends string, Fallback> = [ResourceKeysOf<R>] extends [never]
  ? Fallback
  : [MapIn<R[ResourceKeysOf<R>], K>] extends [never]
    ? Fallback
    : UnionToIntersection<MapIn<R[ResourceKeysOf<R>], K>>

/** {@link ResolveMap} applied to the live registry. */
type MapOf<K extends string, Fallback> = ResolveMap<Register, K, Fallback>

/** Loose shape used whenever a specific map has not been generated. */
type LooseEventMap = Record<string, unknown[]>
/** Loose shape used whenever a specific RPC map has not been generated. */
type LooseRpcMap = Record<string, { args: unknown[]; result: unknown }>
/**
 * Loose shape used whenever a specific view map has not been generated.
 *
 * @remarks
 * Deliberately `any` rather than `unknown`: `WebViewBridge` previously defaulted its generics
 * to `Record<string, any>`, and widening WebView payloads to `unknown` would break existing
 * `on()` handlers that read fields off `data` without narrowing first.
 */
type LooseViewMap = Record<string, any>

/** Events the server may emit to clients — sourced from `@Client.OnNet` handlers. */
export type ClientEvents = MapOf<'clientEvents', LooseEventMap>
/** Events a client may emit to the server — sourced from `@Server.OnNet` handlers. */
export type ServerEvents = MapOf<'serverEvents', LooseEventMap>
/** RPCs a client may call on the server — sourced from `@Server.OnRPC` handlers. */
export type ServerRpc = MapOf<'serverRpc', LooseRpcMap>
/** RPCs the server may call on clients — sourced from `@Client.OnRPC` handlers. */
export type ClientRpc = MapOf<'clientRpc', LooseRpcMap>
/** Chat commands — sourced from `@Server.Command` handlers. */
export type Commands = MapOf<'commands', Record<string, unknown>>
/** Messages the client sends to a WebView — sourced from `WebView.send` calls. */
export type ViewSend = MapOf<'viewSend', LooseViewMap>
/** Messages a WebView sends to the client — sourced from `@Client.OnView` handlers. */
export type ViewReceive = MapOf<'viewReceive', LooseViewMap>

/**
 * True when a registry opted into strict mode (`build.typegen.strict`).
 *
 * @remarks
 * Strict mode turns unknown event names into compile errors. It is off by default so that
 * enabling typegen cannot break code that compiles today: a resource legitimately emits names
 * that no handler in the project declares, such as the framework's own `SYSTEM_EVENTS`.
 *
 * Parameterised for the same reason as {@link ResolveMap}.
 */
export type IsStrictIn<R> = [Extract<keyof R, 'strict'>] extends [never]
  ? false
  : R[Extract<keyof R, 'strict'>] extends true
    ? true
    : false

type IsStrict = IsStrictIn<Register>

/**
 * Narrows to the registered keys of `M`, or stays `string` when `M` is the loose fallback.
 *
 * @remarks
 * The `string extends keyof M & string` probe distinguishes a generated map (finite literal
 * keys) from a loose `Record<string, …>` (whose key type absorbs all of `string`).
 *
 * Outside strict mode the result unions `string & {}`, which keeps editor autocomplete on the
 * known names while still accepting any other string — so enabling typegen can never break
 * code that compiles today.
 *
 * Strict mode drops that escape hatch so a mistyped name is a compile error, but still admits
 * {@link FrameworkEventName}: the framework's own `opencore:*` events are legitimate targets
 * that no resource declares itself, and rejecting them would make strict mode unusable.
 */
export type NameOf<M> = string extends keyof M & string
  ? string
  : IsStrict extends true
    ? (keyof M & string) | FrameworkEventName
    : (keyof M & string) | (string & {})

/** Like {@link NameOf} but always narrow, ignoring the strict-mode flag. */
export type StrictNameOf<M> = string extends keyof M & string ? string : keyof M & string

/** Extracts the argument tuple registered for event `K`, defaulting to `unknown[]`. */
export type ArgsOf<M, K extends PropertyKey> = K extends keyof M
  ? M[K] extends unknown[]
    ? M[K]
    : unknown[]
  : unknown[]

/** Extracts the argument tuple of RPC `K`, defaulting to `unknown[]`. */
export type RpcArgsOf<M, K extends PropertyKey> = K extends keyof M
  ? M[K] extends { args: infer A }
    ? A extends unknown[]
      ? A
      : unknown[]
    : unknown[]
  : unknown[]

/** Extracts the resolved result of RPC `K`, defaulting to `unknown`. */
export type RpcResultOf<M, K extends PropertyKey> = K extends keyof M
  ? M[K] extends { result: infer R }
    ? R
    : unknown
  : unknown

/** Extracts the payload registered for view message `K`, defaulting to `unknown`. */
export type PayloadOf<M, K extends PropertyKey> = K extends keyof M ? M[K] : unknown

/**
 * Drops the leading parameter of a tuple.
 *
 * @remarks
 * Server handlers receive `Player` as their first argument; the wire payload is everything
 * after it. Generated files use this to turn `Parameters<Handler>` into the emit signature.
 */
export type DropFirst<T extends unknown[]> = T extends [unknown, ...infer R] ? R : unknown[]

/**
 * True when typegen is active for the given map — useful for conditional helper types.
 */
export type IsRegistered<M> = string extends keyof M & string ? false : true
