import type {
  CreateNpcServerRequest,
  CreateNpcServerResult,
  DeleteNpcServerRequest,
} from './types'

export abstract class INpcLifecycleServer {
  abstract create(request: CreateNpcServerRequest): Promise<CreateNpcServerResult> | CreateNpcServerResult
  abstract delete(request: DeleteNpcServerRequest): Promise<void> | void
}
