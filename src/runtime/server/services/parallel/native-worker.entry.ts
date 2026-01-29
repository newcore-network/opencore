import { parentPort } from 'node:worker_threads'
import type { WorkerMessage } from '../../types/parallel.types'
import { processMessage } from './worker'

const port = parentPort

if (!port) {
  throw new Error('native-worker.entry.ts must be executed inside a Worker thread')
}

port.on('message', (message: WorkerMessage) => {
  const response = processMessage(message)
  port.postMessage(response)
})
