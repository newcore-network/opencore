export type OpenCoreRuntimeKind = 'node' | 'fivem' | 'redm' | 'ragemp'

export interface OpenCoreRuntimeSideHints {
  platform?: 'node' | 'neutral' | 'browser'
  target?: string
  format?: 'cjs' | 'esm' | 'iife'
  outFileName?: string
  outputRoot?: 'resource' | 'packages' | 'client_packages'
}

export interface OpenCoreRuntimeManifestHints {
  kind?: 'fxmanifest' | 'none'
}

export interface OpenCoreRuntimeHints {
  runtime: OpenCoreRuntimeKind
  server?: OpenCoreRuntimeSideHints
  client?: OpenCoreRuntimeSideHints
  manifest?: OpenCoreRuntimeManifestHints
}

export function defineRuntimeHints(hints: OpenCoreRuntimeHints): OpenCoreRuntimeHints {
  return hints
}
