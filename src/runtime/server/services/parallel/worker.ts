/**
 * Worker Script
 *
 * Utilities used by the native worker thread entrypoint.
 *
 * The worker pool executes user-provided compute functions by serializing the
 * function body (`Function#toString()`) and evaluating it with `new Function`.
 *
 * Requirements/limitations:
 * - The compute function must be pure (no closures / no external references).
 * - Inputs/outputs must be structured-cloneable.
 * - Do not pass untrusted code as compute functions.
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
