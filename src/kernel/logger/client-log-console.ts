import {
  IClientLogConsole,
  type ClientLogConsoleCapabilities,
} from '../../adapters/contracts/client/IClientLogConsole'

const DEFAULT_CLIENT_LOG_CONSOLE_CAPABILITIES: ClientLogConsoleCapabilities = {
  supportsColors: false,
  supportsStructuredData: true,
  supportsRichFormatting: false,
}

class DefaultClientLogConsole extends IClientLogConsole {
  getCapabilities(): ClientLogConsoleCapabilities {
    return DEFAULT_CLIENT_LOG_CONSOLE_CAPABILITIES
  }

  trace(message: string, details?: unknown): void {
    this.write(console.debug, message, details)
  }

  debug(message: string, details?: unknown): void {
    this.write(console.debug, message, details)
  }

  info(message: string, details?: unknown): void {
    this.write(console.info, message, details)
  }

  warn(message: string, details?: unknown): void {
    this.write(console.warn, message, details)
  }

  error(message: string, details?: unknown): void {
    this.write(console.error, message, details)
  }

  private write(method: (...args: unknown[]) => void, message: string, details?: unknown): void {
    if (details === undefined) {
      method(message)
      return
    }

    method(message, details)
  }
}

let activeClientLogConsole: IClientLogConsole = new DefaultClientLogConsole()

export function getClientLogConsole(): IClientLogConsole {
  return activeClientLogConsole
}

export function setClientLogConsole(logConsole: IClientLogConsole): void {
  activeClientLogConsole = logConsole
}

export function resetClientLogConsoleForTests(): void {
  activeClientLogConsole = new DefaultClientLogConsole()
}
