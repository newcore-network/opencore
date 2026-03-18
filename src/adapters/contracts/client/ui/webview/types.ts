export interface WebViewCapabilities {
  supportsFocus: boolean
  supportsCursor: boolean
  supportsInputPassthrough: boolean
  supportsBidirectionalMessaging: boolean
  supportsExecute: boolean
  supportsHeadless: boolean
}

export interface WebViewDefinition {
  id: string
  url: string
  visible?: boolean
  focused?: boolean
  cursor?: boolean
  inputPassthrough?: boolean
}

export interface WebViewFocusOptions {
  cursor?: boolean
  inputPassthrough?: boolean
}

export interface WebViewMessage {
  viewId: string
  event: string
  payload: unknown
}
