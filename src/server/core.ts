import { initServer } from './bootstrap'
import type { FrameworkMode, ServerRuntimeOptions } from './runtime'

export let _mode: FrameworkMode

export async function init(options: ServerRuntimeOptions) {
  _mode = options.mode
  await initServer(options)
}
