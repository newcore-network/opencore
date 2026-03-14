export interface ClientLogConsoleCapabilities {
  supportsColors: boolean
  supportsStructuredData: boolean
  supportsRichFormatting: boolean
}

export abstract class IClientLogConsole {
  abstract getCapabilities(): ClientLogConsoleCapabilities
  abstract trace(message: string, details?: unknown): void
  abstract debug(message: string, details?: unknown): void
  abstract info(message: string, details?: unknown): void
  abstract warn(message: string, details?: unknown): void
  abstract error(message: string, details?: unknown): void
}
