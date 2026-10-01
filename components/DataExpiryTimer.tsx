'use client'
/**
 * Countdown (mm:ss) to the moment the soonest-expiring stored data (Bulk upload,
 * calculation, Individual inputs, Sale Assistant selection) is deleted — see
 * lib/storage.ts. Hidden while nothing is stored. When it reaches zero the data
 * is purged and the page reloads so nothing expired stays on screen.
 */
import { useEffect, useState } from 'react'
import { msUntilNextExpiry, purgeExpiredData } from '@/lib/storage'

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function DataExpiryTimer() {
  // null on the server and before mount, so the first render matches the server's.
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const left = msUntilNextExpiry()
      if (left !== null && left <= 0) {
        purgeExpiredData()
        window.location.reload()
        return
      }
      setRemaining(left)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  if (remaining === null) return null

  return (
    <p className="expiry-timer" title="Entered and uploaded data is deleted from this browser 1 hour after it last changed.">
      Saved data clears in <span className="expiry-time">{formatCountdown(remaining)}</span>
    </p>
  )
}
