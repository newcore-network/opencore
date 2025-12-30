import { loggers } from '../../../kernel/shared/logger'
import { CoreEventMap } from '../types/core-events'

type CoreEventName = keyof CoreEventMap
type CoreEventHandler<E extends CoreEventName> = (payload: CoreEventMap[E]) => void

const handlers: {
  [E in CoreEventName]?: CoreEventHandler<E>[]
} = {}

export function onFrameworkEvent<E extends CoreEventName>(
  event: E,
  handler: CoreEventHandler<E>,
): () => void {
  const list = (handlers[event] ??= []) as CoreEventHandler<E>[]
  list.push(handler)

  return () => {
    const index = list.indexOf(handler)
    if (index !== -1) list.splice(index, 1)
  }
}

export function emitFrameworkEvent<E extends CoreEventName>(event: E, payload: CoreEventMap[E]) {
  const list = handlers[event] as CoreEventHandler<E>[] | undefined
  if (!list) return

  for (const handler of list) {
    try {
      handler(payload)
    } catch (error) {
      loggers.eventBus.error(
        `Handler error for event`,
        {
          event,
        },
        error as Error,
      )
    }
  }
}
