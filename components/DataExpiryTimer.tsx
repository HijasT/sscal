'use client'
/**
 * Countdown (mm:ss) to the moment the soonest-expiring stored data (Bulk upload,
 * calculation, Individual inputs, Sale Assistant selection) is deleted — see
 * lib/storage.ts. Hidden while nothing is stored. With one minute left a dialog
 * offers another hour; closing or ignoring it changes nothing, and at zero the
 * data is purged and the page reloads so nothing expired stays on screen.
 */
import { useEffect, useRef, useState } from 'react'
import { DATA_RETENTION_MS } from '@/lib/config'
import { extendExpiry, msUntilNextExpiry, purgeExpiredData } from '@/lib/storage'

const WARN_MS = 60_000

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function DataExpiryTimer() {
  // null on the server and before mount, so the first render matches the server's.
  const [remaining, setRemaining] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dismissed = useRef(false)

  useEffect(() => {
    const tick = () => {
      const left = msUntilNextExpiry()
      if (left !== null && left <= 0) {
        purgeExpiredData()
        window.location.reload()
        return
      }
      if (left === null || left > WARN_MS) dismissed.current = false // fresh cycle (e.g. after extending)
      setRemaining(left)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  const warning = remaining !== null && remaining <= WARN_MS && !dismissed.current

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (warning && !dialog.open) dialog.showModal()
    if (!warning && dialog.open) dialog.close()
  }, [warning])

  if (remaining === null) return null

  const extend = () => {
    extendExpiry()
    dismissed.current = false
    setRemaining(msUntilNextExpiry())
  }

  return (
    <>
      <p className="expiry-timer" title="Entered and uploaded data is deleted from this browser 1 hour after it last changed.">
        Saved data clears in <span className="expiry-time">{formatCountdown(remaining)}</span>
      </p>
      <dialog ref={dialogRef} className="expiry-dialog" aria-labelledby="expiry-title" onClose={() => { dismissed.current = true }}>
        <h2 id="expiry-title">Saved data clears soon</h2>
        <p>
          Your entered and uploaded data will be deleted and the page will refresh in{' '}
          <span className="expiry-time">{formatCountdown(remaining)}</span>.
        </p>
        <div className="expiry-actions">
          <button type="button" className="btn btn-primary" onClick={extend}>
            Keep for {DATA_RETENTION_MS / 3_600_000} more hour
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => dialogRef.current?.close()}>
            Dismiss
          </button>
        </div>
      </dialog>
    </>
  )
}
