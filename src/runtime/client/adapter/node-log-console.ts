import { injectable } from 'tsyringe'
import {
  IClientLogConsole,
  type ClientLogConsoleCapabilities,
} from '../../../adapters/contracts/client/IClientLogConsole'
import { setClientLogConsole } from '../../../kernel/logger'

const NODE_CLIENT_LOG_CAPABILITIES: ClientLogConsoleCapabilities = {
  supportsColors: false,
  supportsStructuredData: true,
  supportsRichFormatting: false,
}

@injectable()
export class NodeClientLogConsole extends IClientLogConsole {
  getCapabilities(): ClientLogConsoleCapabilities {
    return NODE_CLIENT_LOG_CAPABILITIES
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

export function installNodeClientLogConsole(logConsole: IClientLogConsole): void {
  setClientLogConsole(logConsole)
}
