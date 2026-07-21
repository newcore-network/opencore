export abstract class IExports {
  /**
   * Registers a local export handler for the current resource.
   *
   * @remarks
   * This is called by the framework during metadata processing when it discovers
   * methods decorated with `@Export()`.
   */
  abstract register(exportName: string, handler: (...args: unknown[]) => unknown): void

  /**
   * Resolves exports for a resource using the adapter's direct/local mechanism.
   *
   * @remarks
   * Framework internals rely on this method remaining synchronous and side-effect free.
   * Adapters should return `undefined` when the resource is not directly resolvable.
   */
  abstract getResource<T = unknown>(resourceName: string): T | undefined

  /**
   * Returns an async proxy for resource exports when the adapter provides a remote helper layer.
   *
   * @remarks
   * This is optional and should not change the semantics of `getResource()`.
   * Consumers should treat methods on the returned proxy as async.
   */
  getRemoteResource<T = unknown>(_resourceName: string): T {
    throw new Error('[OpenCore] Remote exports are not supported by the active adapter.')
  }

  /**
   * Calls a single exported method through the adapter's optional remote helper layer.
   */
  callRemoteExport<TResult = unknown>(
    _resourceName: string,
    _exportName: string,
    ..._args: unknown[]
  ): Promise<TResult> {
    return Promise.reject(
      new Error('[OpenCore] Remote exports are not supported by the active adapter.'),
    )
  }

  /**
   * Waits until a resource exposes exports compatible with the adapter's remote helper layer.
   *
   * @param _options.exportName Optional export name that must be present before resolving.
   * @param _options.timeoutMs Maximum time to wait before failing.
   * @param _options.intervalMs Polling interval used by adapters that implement polling.
   */
  waitForRemoteResource<T = unknown>(
    _resourceName: string,
    _options?: { exportName?: string; timeoutMs?: number; intervalMs?: number },
  ): Promise<T> {
    return Promise.reject(
      new Error('[OpenCore] Remote exports are not supported by the active adapter.'),
    )
  }
}
