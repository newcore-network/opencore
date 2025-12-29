import type { BridgeMessage } from '../types'

/**
 * Contract for the WebSocket bridge between framework and CLI.
 *
 * Enables real-time communication for log streaming, event monitoring,
 * and remote commands during development.
 */
export abstract class IDevModeBridge {
  /**
   * Connects to the CLI WebSocket server.
   * @param url - WebSocket URL to connect to
   */
  abstract connect(url: string): Promise<void>

  /**
   * Disconnects from the CLI.
   */
  abstract disconnect(): void

  /**
   * Sends a message to the CLI.
   * @param message - Message to send
   */
  abstract send(message: BridgeMessage): void

  /**
   * Registers a message handler.
   * @param handler - Function to handle incoming messages
   */
  abstract onMessage(handler: (message: BridgeMessage) => void): void

  /**
   * Checks if currently connected.
   */
  abstract isConnected(): boolean

  /**
   * Gets the current connection URL.
   */
  abstract getUrl(): string | null
}
