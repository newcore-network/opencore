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
    this.write('debug', message, details)
  }

  debug(message: string, details?: unknown): void {
    this.write('debug', message, details)
  }

  info(message: string, details?: unknown): void {
    this.write('info', message, details)
  }

  warn(message: string, details?: unknown): void {
    this.write('warn', message, details)
  }

  error(message: string, details?: unknown): void {
    this.write('error', message, details)
  }

  private write(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    details?: unknown,
  ): void {
    if (details === undefined) {
      console[level](message)
      return
    }

    console[level](message, details)
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
