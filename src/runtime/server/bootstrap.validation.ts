import { z } from 'zod'
import { loggers } from '../../kernel/shared/logger'

export type BootstrapValidator = () => string[] | Promise<string[]>

const validators = new Map<string, BootstrapValidator>()
/**
 * Register a bootstrap validator.
 *  This is only used for cases of custom validators or resources that require validation,
 *  like Driver resources.
 *
 * @param name - The name of the validator.
 * @param validator - The validator function.
 */
export function registerBootstrapValidator(name: string, validator: BootstrapValidator) {
  if (validators.has(name)) {
    throw new Error(`[NewCore] Bootstrap validator '${name}' is already registered`)
  }
  validators.set(name, validator)
}

export async function runBootstrapValidatorsOrThrow(): Promise<void> {
  const allErrors: string[] = []

  for (const [name, validator] of validators.entries()) {
    const errors = await validator()
    for (const err of errors) allErrors.push(`[${name}] ${err}`)
  }

  if (allErrors.length === 0) return

  const message = ['Invalid configuration detected during bootstrap:', ...allErrors].join('\n')
  loggers.bootstrap.fatal(message)
  throw new Error(`[NewCore] CRITICAL: ${message}`)
}

function getBooleanConvar(name: string, defaultValue = false): boolean {
  const raw = GetConvar(name, defaultValue ? 'true' : 'false')
    .toLowerCase()
    .trim()
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'y'
}

function getOptionalStringConvar(name: string): string | undefined {
  const raw = GetConvar(name, '').trim()
  return raw.length > 0 ? raw : undefined
}

function zodIssuesToLines(prefix: string, error: z.ZodError): string[] {
  return error.issues.map((i) => {
    const path = i.path.length ? `${prefix}.${i.path.join('.')}` : prefix
    return `${path}: ${i.message}`
  })
}

const PersistenceSchema = z
  .object({
    enabled: z.boolean(),
    adapter: z.string().min(1).optional(),
    resourceName: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.enabled) return

    if (!val.adapter) {
      ctx.addIssue({
        code: 'custom',
        path: ['adapter'],
        message: 'Required when newcore_persistence_enabled=true (set newcore_db_adapter)',
      })
      return
    }

    if (val.adapter === 'resource' && !val.resourceName) {
      ctx.addIssue({
        code: 'custom',
        path: ['resourceName'],
        message: 'Required when newcore_db_adapter=resource (set newcore_db_resource)',
      })
    }
  })

function validatePersistence(): string[] {
  const enabled = getBooleanConvar('newcore_persistence_enabled', false)
  if (!enabled) return []

  const adapter = getOptionalStringConvar('newcore_db_adapter')
  const resourceName = getOptionalStringConvar('newcore_db_resource')

  const parsed = PersistenceSchema.safeParse({ enabled, adapter, resourceName })
  if (!parsed.success) return zodIssuesToLines('persistence', parsed.error)

  if (adapter === 'resource') {
    const db = (exports as any)[resourceName!]
    if (!db) {
      return [
        `persistence.resource: Database resource '${resourceName}' is not available. Start it before this resource.`,
      ]
    }
  }

  return []
}

let defaultsRegistered = false

export function registerDefaultBootstrapValidators(): void {
  if (defaultsRegistered) return
  registerBootstrapValidator('persistence', validatePersistence)
  defaultsRegistered = true
}
