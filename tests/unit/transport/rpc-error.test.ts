import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import {
  PUBLIC_RPC_ERROR_MESSAGE,
  RpcPublicError,
  serializeRpcError,
} from '../../../src/adapters/contracts/transport/rpc-error'

describe('serializeRpcError', () => {
  it('should sanitize unexpected Error instances', () => {
    expect(serializeRpcError(new Error('database credentials leaked'))).toEqual({
      message: PUBLIC_RPC_ERROR_MESSAGE,
    })
  })

  it('should preserve message and name for RpcPublicError', () => {
    const error = new RpcPublicError('Character not found', 'CharacterLookupError')

    expect(serializeRpcError(error)).toEqual({
      message: 'Character not found',
      name: 'CharacterLookupError',
    })
  })

  it('should preserve message for exposed structural errors', () => {
    expect(
      serializeRpcError({
        message: 'Inventory full',
        name: 'InventoryError',
        expose: true,
      }),
    ).toEqual({
      message: 'Inventory full',
      name: 'InventoryError',
    })
  })

  it('should sanitize non-Error values', () => {
    expect(serializeRpcError('raw failure')).toEqual({
      message: PUBLIC_RPC_ERROR_MESSAGE,
    })
  })
})
