import { loggers } from '../../../kernel/logger'
import { FrameworkEventsMap } from '../types/framework-events.types'

type InternalEventName = keyof FrameworkEventsMap
type InternalEventHandler<E extends InternalEventName> = (payload: FrameworkEventsMap[E]) => void

const handlers: Partial<Record<InternalEventName, InternalEventHandler<any>[]>> = {}

export function onFrameworkEvent<E extends InternalEventName>(
  event: E,
  handler: InternalEventHandler<E>,
): () => void {
  let list = handlers[event] as InternalEventHandler<E>[] | undefined
  if (!list) {
    list = [] as InternalEventHandler<E>[]
    handlers[event] = list as InternalEventHandler<any>[]
  }
  list.push(handler)

  return () => {
    const index = list.indexOf(handler)
    if (index !== -1) list.splice(index, 1)
  }
}

export function emitFrameworkEvent<E extends InternalEventName>(
  event: E,
  payload: FrameworkEventsMap[E],
) {
  const list = handlers[event] as InternalEventHandler<E>[] | undefined
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
