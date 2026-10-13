// Tiny app-wide message bus so every warning/error/confirmation shows in ONE
// styled popup instead of native alert() or an easy-to-miss inline card.
// A single <MessageModal/> (mounted once in app/page.tsx) subscribes; any code
// calls notify(...).

export type NotifyLevel = 'error' | 'warning' | 'success' | 'info'

export interface NotifyPayload {
  title?: string
  messages: string[]
  level?: NotifyLevel
}

type Listener = (p: NotifyPayload) => void
let listener: Listener | null = null

/** The modal registers itself here (only one listener; the latest wins). */
export function onNotify(l: Listener | null): void {
  listener = l
}

/** Show a popup. Pass a string for a quick message, or a full payload. */
export function notify(input: string | NotifyPayload): void {
  const p: NotifyPayload = typeof input === 'string' ? { messages: [input] } : input
  listener?.(p)
}
