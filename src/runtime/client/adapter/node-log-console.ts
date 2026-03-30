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

export function installNodeClientLogConsole(logConsole: IClientLogConsole): void {
  setClientLogConsole(logConsole)
}
