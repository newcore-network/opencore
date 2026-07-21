import { METADATA_KEYS } from '../system/metadata-client.keys'

export interface OnViewOptions {
  viewId?: string
}

/**
 * Registers a method as a WebView callback handler.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds the decorated method
 * to the active WebView runtime callback.
 *
 * If `options.viewId` is provided, the handler will only receive messages from the
 * specified WebView viewId. Without it, the handler receives events from all views.
 *
 * @param eventName - Callback name.
 * @param options - Optional configuration. Pass `{ viewId: 'my-view' }` to
 *   filter incoming messages by viewId.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class SettingsController {
 *   @Client.onView('settings:save')
 *   saveSettings(payload: unknown) {
 *     // ...
 *   }
 *
 *   @Client.onView('system-ui:ready', { viewId: 'system-ui' })
 *   onSystemUiReady() {
 *     // Only fires for the 'system-ui' WebView
 *   }
 * }
 * ```
 */
export function OnView(eventName: string, options?: OnViewOptions) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(
      METADATA_KEYS.VIEW,
      { eventName, viewId: options?.viewId },
      target,
      propertyKey,
    )
  }
}
