/**
 * Worker Script
 *
 * This file is reserved for future native worker thread support.
 * Currently, the WorkerPool uses virtual workers that execute
 * tasks asynchronously on the main thread with yielding.
 *
 * When FiveM or the target environment supports native worker threads,
 * this script can be used as the worker entry point.
 */

import { WorkerMessage, WorkerResponse } from './types'

/**
 * Execute a compute function from its string body
 */
export function executeCompute(functionBody: string, input: unknown): unknown {
  const fn = new Function('input', `return (${functionBody})(input)`)
  return fn(input)
}

/**
 * Process a worker message and return a response
 */
export function processMessage(message: WorkerMessage): WorkerResponse {
  const startTime = performance.now()

  try {
    const result = executeCompute(message.functionBody, message.input)
    const executionTime = performance.now() - startTime

    return {
      id: message.id,
      success: true,
      result,
      executionTime,
    }
  } catch (error) {
    const executionTime = performance.now() - startTime

    return {
      id: message.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    }
  }
}

// Note: Native worker thread initialization would go here
// when the runtime supports it. For now, this module exports
// utilities that can be used by the virtual worker implementation.
