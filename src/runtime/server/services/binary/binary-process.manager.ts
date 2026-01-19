import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'

import { inject, injectable } from 'tsyringe'
import { v4 as uuid } from 'uuid'

import { IResourceInfo } from '../../../../adapters/contracts/IResourceInfo'
import { GLOBAL_CONTAINER } from '../../../../kernel/di/container'
import { AppError } from '../../../../kernel/error/app.error'
import { loggers } from '../../../../kernel/logger'
import { BinaryServiceOptions } from '../../decorators/binary-service'
import { METADATA_KEYS } from '../../system/metadata-server.keys'
import type { BinaryCallMetadata } from './binary.types'

const DEFAULT_TIMEOUT_MS = 15000

type BinaryStatus = 'online' | 'offline' | 'missing'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout?: ReturnType<typeof setTimeout>
}

interface BinaryResponse {
  id: string
  status: 'ok' | 'error'
  result?: unknown
  error?: unknown
}

interface BinaryServiceEntry {
  name: string
  binary: string
  timeoutMs: number
  status: BinaryStatus
  binaryPath?: string
  process?: ChildProcessWithoutNullStreams
  pending: Map<string, PendingRequest>
  buffer: string
  serviceClass: new (...args: any[]) => any
}

@injectable()
export class BinaryProcessManager {
  private services = new Map<string, BinaryServiceEntry>()

  constructor(@inject(IResourceInfo as any) private resourceInfo: IResourceInfo) {}

  register(options: BinaryServiceOptions, serviceClass: new (...args: any[]) => any): void {
    if (this.services.has(options.name)) {
      loggers.bootstrap.warn(`[BinaryService] Duplicate service name skipped`, {
        name: options.name,
      })
      return
    }

    const entry: BinaryServiceEntry = {
      name: options.name,
      binary: options.binary,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      status: 'offline',
      pending: new Map(),
      buffer: '',
      serviceClass,
    }

    this.services.set(options.name, entry)

    const instance = this.resolveServiceInstance(serviceClass)
    this.applyBinaryProxies(instance, options)

    const binaryPath = this.resolveBinaryPath(options.binary)
    if (!binaryPath) {
      entry.status = 'missing'
      loggers.bootstrap.error(`[BinaryService] Binary not found`, {
        name: options.name,
        binary: options.binary,
      })
      return
    }

    entry.binaryPath = binaryPath
    this.spawnProcess(entry)
  }

  async call(serviceName: string, action: string, params: unknown[], timeoutMs?: number) {
    const entry = this.services.get(serviceName)
    if (!entry || entry.status !== 'online' || !entry.process) {
      throw new AppError(
        'COMMON:UNKNOWN',
        `[OpenCore] BinaryService '${serviceName}' is not available`,
        'server',
      )
    }

    const id = uuid()
    const payload = JSON.stringify({ id, action, params })

    await this.writeLine(entry, payload)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        entry.pending.delete(id)
        reject(
          new AppError(
            'COMMON:UNKNOWN',
            `[OpenCore] BinaryService '${serviceName}' call timeout`,
            'server',
          ),
        )
      }, timeoutMs ?? entry.timeoutMs)

      entry.pending.set(id, {
        resolve,
        reject,
        timeout,
      })
    })
  }

  private resolveServiceInstance(serviceClass: new (...args: any[]) => any) {
    return GLOBAL_CONTAINER.resolve(serviceClass)
  }

  private applyBinaryProxies(instance: any, options: BinaryServiceOptions): void {
    const proto = Object.getPrototypeOf(instance)
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor' && typeof instance[name] === 'function',
    )

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(METADATA_KEYS.BINARY_CALL, proto, methodName) as
        | BinaryCallMetadata
        | undefined

      if (!metadata) continue

      const serviceName = metadata.service ?? options.name

      instance[methodName] = async (...args: unknown[]) => {
        return this.call(
          serviceName,
          metadata.action,
          args,
          metadata.timeoutMs ?? options.timeoutMs,
        )
      }
    }
  }

  private resolveBinaryPath(binary: string): string | null {
    const resourceRoot = this.resourceInfo.getCurrentResourcePath()
    const platform = process.platform
    const filename = platform === 'win32' ? `${binary}.exe` : binary

    const platformPath = path.join(resourceRoot, 'bin', platform, filename)
    if (fs.existsSync(platformPath)) return platformPath

    const flatPath = path.join(resourceRoot, 'bin', filename)
    if (fs.existsSync(flatPath)) return flatPath

    return null
  }

  private spawnProcess(entry: BinaryServiceEntry): void {
    if (!entry.binaryPath) {
      entry.status = 'missing'
      return
    }

    const child = spawn(entry.binaryPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    entry.process = child
    entry.status = 'online'

    child.stdout.on('data', (chunk: Buffer) => this.handleStdout(entry, chunk))
    child.stderr.on('data', (chunk: Buffer) => {
      loggers.bootstrap.warn(`[BinaryService] ${entry.name} stderr`, {
        message: chunk.toString(),
      })
    })

    child.on('exit', (code, signal) => {
      entry.status = 'offline'
      this.failPending(entry, `Process exited (code=${code}, signal=${signal})`)
      loggers.bootstrap.error(`[BinaryService] ${entry.name} exited`, {
        code,
        signal,
      })
    })

    child.on('error', (error) => {
      entry.status = 'offline'
      this.failPending(entry, error.message)
      loggers.bootstrap.error(`[BinaryService] ${entry.name} process error`, {
        error: error.message,
      })
    })

    loggers.bootstrap.info(`[BinaryService] ${entry.name} started`, {
      binary: entry.binaryPath,
    })
  }

  private handleStdout(entry: BinaryServiceEntry, chunk: Buffer): void {
    entry.buffer += chunk.toString()

    let newlineIndex = entry.buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = entry.buffer.slice(0, newlineIndex)
      entry.buffer = entry.buffer.slice(newlineIndex + 1)
      const trimmed = line.trim()
      if (trimmed) {
        this.handleResponse(entry, trimmed)
      }
      newlineIndex = entry.buffer.indexOf('\n')
    }
  }

  private handleResponse(entry: BinaryServiceEntry, rawLine: string): void {
    let response: BinaryResponse | null = null

    try {
      response = JSON.parse(rawLine) as BinaryResponse
    } catch (error: unknown) {
      if (error instanceof Error) {
        loggers.bootstrap.warn(`[BinaryService] ${entry.name} invalid JSON response`, {
          line: rawLine,
          error: error.message,
        })
      } else {
        loggers.bootstrap.warn(`[BinaryService] ${entry.name} invalid JSON response`, {
          line: rawLine,
          error: `unknown error: ${error}`,
        })
      }
      return
    }

    if (!response?.id) {
      loggers.bootstrap.warn(`[BinaryService] ${entry.name} response missing id`, {
        response,
      })
      return
    }

    const pending = entry.pending.get(response.id)
    if (!pending) {
      loggers.bootstrap.warn(`[BinaryService] ${entry.name} response without pending request`, {
        id: response.id,
      })
      return
    }

    entry.pending.delete(response.id)
    if (pending.timeout) clearTimeout(pending.timeout)

    if (response.status === 'ok') {
      pending.resolve(response.result)
      return
    }

    const message =
      response.error instanceof Error
        ? response.error.message
        : typeof response.error === 'string'
          ? response.error
          : 'Binary call failed'

    pending.reject(new AppError('COMMON:UNKNOWN', message, 'external', response.error))
  }

  private failPending(entry: BinaryServiceEntry, reason: string): void {
    for (const [id, pending] of entry.pending) {
      if (pending.timeout) clearTimeout(pending.timeout)
      pending.reject(new AppError('COMMON:UNKNOWN', reason, 'external'))
      entry.pending.delete(id)
    }
  }

  private async writeLine(entry: BinaryServiceEntry, payload: string): Promise<void> {
    const stdin = entry.process?.stdin
    if (!stdin) return

    const line = `${payload}\n`
    if (!stdin.write(line)) {
      await once(stdin, 'drain')
    }
  }
}
