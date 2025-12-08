import { type BootstrapOptions, initServer } from './bootstrap'

export async function init(resourceType: 'CORE' | 'RESOURCE' = 'CORE') {
  let op: BootstrapOptions = { mode: resourceType }
  if (resourceType == 'CORE') initServer(op)
  if (resourceType == 'RESOURCE') initServer(op)
}
