'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clinicalMarkerInsight } from '@/lib/markerInsights'

export interface ActiveClinicalMarker {
  name: string
  anchor: HTMLButtonElement
}

/** One anchored, non-modal popover for the currently selected clinical marker. */
export function ClinicalMarkerPopover({
  active,
  id,
  onClose,
}: {
  active: ActiveClinicalMarker | null
  id: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{
    top: number
    left: number
    arrowLeft: number
    below: boolean
  } | null>(null)
  const insight = active && clinicalMarkerInsight(active.name)

  useLayoutEffect(() => {
    if (!active || !insight) {
      setPosition(null)
      return
    }
    const place = () => {
      if (!active.anchor.isConnected) {
        onClose()
        return
      }
      const rect = active.anchor.getBoundingClientRect()
      const width = Math.min(292, window.innerWidth - 24)
      const height = ref.current?.offsetHeight || 110
      const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12))
      const below = rect.top < height + 16 && window.innerHeight - rect.bottom > rect.top
      const top = below ? rect.bottom + 12 : Math.max(8, rect.top - height - 12)
      const arrowLeft = Math.max(12, Math.min(width - 12, rect.left + rect.width / 2 - left))
      setPosition({ top, left, arrowLeft, below })
    }
    place()
    const outside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (active.anchor.contains(target) || ref.current?.contains(target)) return
      // Another interactive marker receives the click itself, so it can switch
      // bubbles without the outside handler racing its own click handler.
      if (target instanceof Element && target.closest('.sa-clinical-marker')) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        active.anchor.focus()
        onClose()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [active, insight, onClose])

  if (!active || !insight) return null
  return createPortal(
    <div
      id={id}
      ref={ref}
      className="sa-marker-insight"
      role="tooltip"
      style={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: 'min(292px, calc(100vw - 24px))',
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <strong className="sa-marker-insight-name">{active.name}</strong>
      {insight.expansion && <div className="sa-marker-insight-expansion">{insight.expansion}</div>}
      <p className="sa-marker-insight-description">{insight.description}</p>
      {position && (
        <span
          aria-hidden="true"
          className={`sa-marker-insight-arrow${position.below ? ' is-above' : ''}`}
          style={{ left: position.arrowLeft }}
        />
      )}
    </div>,
    document.body,
  )
}
