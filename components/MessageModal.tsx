'use client'
import { useEffect, useRef, useState } from 'react'
import { onNotify, type NotifyLevel, type NotifyPayload } from '@/lib/notify'

const ICON: Record<NotifyLevel, string> = { error: '⚠', warning: '⚠', success: '✓', info: 'ℹ' }
const DEFAULT_TITLE: Record<NotifyLevel, string> = {
  error: 'Something needs attention',
  warning: 'Please review',
  success: 'Done',
  info: 'Notice',
}

/**
 * The single popup every notify() call renders into. Mounted once at the app
 * root. Uses a native <dialog> (modal, backdrop, focus trap, Esc-to-close).
 */
export function MessageModal() {
  const ref = useRef<HTMLDialogElement>(null)
  const [payload, setPayload] = useState<NotifyPayload | null>(null)

  useEffect(() => {
    onNotify((p) => {
      setPayload(p)
      // Let React paint the new content before opening.
      requestAnimationFrame(() => {
        const d = ref.current
        if (d && !d.open) d.showModal()
      })
    })
    return () => onNotify(null)
  }, [])

  const level: NotifyLevel = payload?.level ?? 'info'
  const title = payload?.title ?? DEFAULT_TITLE[level]
  const messages = payload?.messages ?? []

  return (
    <dialog ref={ref} className={`msg-dialog msg-${level}`} aria-labelledby="msg-dialog-title">
      <h2 id="msg-dialog-title">
        <span className="msg-dialog-icon" aria-hidden="true">{ICON[level]}</span>
        {title}
      </h2>
      {messages.length === 1 ? (
        <p className="msg-dialog-single">{messages[0]}</p>
      ) : (
        <ul className="msg-dialog-list">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
      <div className="expiry-actions">
        <button type="button" className="btn btn-primary" onClick={() => ref.current?.close()}>
          Got it
        </button>
      </div>
    </dialog>
  )
}
