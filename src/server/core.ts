import { type BootstrapOptions, initServer } from './bootstrap'
export let _mode: 'CORE' | 'RESOURCE'

export async function init(resourceType: 'CORE' | 'RESOURCE' = 'CORE') {
  let op: BootstrapOptions = { mode: resourceType }
  _mode = resourceType
  if (resourceType == 'CORE') await initServer(op)
  if (resourceType == 'RESOURCE') await initServer(op)
}
