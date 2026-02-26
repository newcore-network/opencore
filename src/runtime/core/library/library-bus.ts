import { LibraryBus, LibraryEventHandler, LibraryEventName } from './types'

/**
 * Creates a lightweight library-local event bus.
 *
 * @remarks
 * This is a pure TypeScript event bus intended for internal library events.
 * It does not use FiveM, network events, or Node core modules.
 */
export function createLibraryBus(): LibraryBus {
  const handlers = new Map<LibraryEventName, Set<LibraryEventHandler>>()

  const on: LibraryBus['on'] = (event, handler) => {
    const eventHandlers = handlers.get(event) ?? new Set<LibraryEventHandler>()
    eventHandlers.add(handler as LibraryEventHandler)
    handlers.set(event, eventHandlers)
  }

  const off: LibraryBus['off'] = (event, handler) => {
    const eventHandlers = handlers.get(event)
    if (!eventHandlers) return

    eventHandlers.delete(handler as LibraryEventHandler)
    if (eventHandlers.size === 0) {
      handlers.delete(event)
    }
  }

  const once: LibraryBus['once'] = (event, handler) => {
    const onceHandler: LibraryEventHandler = (payload) => {
      off(event, onceHandler)
      const typedHandler = handler as LibraryEventHandler
      typedHandler(payload)
    }

    on(event, onceHandler)
  }

  const emit: LibraryBus['emit'] = (event, payload) => {
    const eventHandlers = handlers.get(event)
    if (!eventHandlers || eventHandlers.size === 0) return

    for (const handler of [...eventHandlers]) {
      handler(payload)
    }
  }

  return {
    on,
    once,
    off,
    emit,
  }
}
