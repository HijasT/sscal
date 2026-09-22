'use client'
import { useEffect, useRef, useState } from 'react'

// Idle commentary while wandering — sarcastic jabs about sales performance.
const WANDER_COMMENTS = [
  "Target's not going to hit itself.",
  "I've made more sales than you this month. I sell nothing, so that's still a tie.",
  "Cute spreadsheet. Still no sales in it though.",
  "I walk in circles for a living. What's your excuse?",
  "The P1 pool's looking thin. Might want to do something about that.",
  "I'd clap for that number, but I don't have hands.",
  "Somewhere, a target is laughing at you.",
  "Working hard or hardly working? Rhetorical — I can see your screen.",
  "Tier 1 called. It said 'try again next month.'",
  "Achievement percentage, or is that just a suggestion to you?",
]

// Shown when clicked/poked instead of a wander comment.
const POKE_COMMENTS = [
  "Stop poking me, go do some sales instead.",
  "Rude. I was napping. Also, sell something.",
  "Every click is a sale you didn't make.",
  "I have nine lives. You have one quota.",
  "Petting me won't hit target either.",
]

const BUBBLE_MS = 4000
const MIN_WALK_MS = 7000
const MAX_WALK_MS = 14000
const MIN_COMMENT_MS = 16000
const MAX_COMMENT_MS = 26000
const KITTY_SIZE = 34
const MARGIN = 16

function randomPoint() {
  if (typeof window === 'undefined') return { x: MARGIN, y: MARGIN }
  const maxX = Math.max(window.innerWidth - KITTY_SIZE - MARGIN, MARGIN)
  const maxY = Math.max(window.innerHeight - KITTY_SIZE - MARGIN, MARGIN)
  return {
    x: MARGIN + Math.random() * (maxX - MARGIN),
    y: MARGIN + Math.random() * (maxY - MARGIN),
  }
}

function pickRandom(list: string[], exclude?: string) {
  const options = exclude ? list.filter((c) => c !== exclude) : list
  return options[Math.floor(Math.random() * options.length)] ?? list[0]
}

export function Kitty() {
  const [pos, setPos] = useState({ x: MARGIN, y: MARGIN })
  const [facingLeft, setFacingLeft] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [poked, setPoked] = useState(false)
  const lastCommentRef = useRef<string | undefined>(undefined)
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setPos(randomPoint())

    // Respect reduced-motion: keep the cat clickable, just stop it wandering.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let walkTimeout: ReturnType<typeof setTimeout>
    let commentTimeout: ReturnType<typeof setTimeout> | undefined

    if (!reduceMotion) {
      const scheduleWalk = () => {
        walkTimeout = setTimeout(() => {
          setPos((prev) => {
            const next = randomPoint()
            setFacingLeft(next.x < prev.x)
            return next
          })
          scheduleWalk()
        }, MIN_WALK_MS + Math.random() * (MAX_WALK_MS - MIN_WALK_MS))
      }
      scheduleWalk()

      const scheduleComment = () => {
        commentTimeout = setTimeout(() => {
          setPoked(false)
          const comment = pickRandom(WANDER_COMMENTS, lastCommentRef.current)
          lastCommentRef.current = comment
          setBubble(comment)
          clearTimeout(bubbleTimeoutRef.current)
          bubbleTimeoutRef.current = setTimeout(() => setBubble(null), BUBBLE_MS)
          scheduleComment()
        }, MIN_COMMENT_MS + Math.random() * (MAX_COMMENT_MS - MIN_COMMENT_MS))
      }
      scheduleComment()
    }

    return () => {
      clearTimeout(walkTimeout)
      clearTimeout(commentTimeout)
      clearTimeout(bubbleTimeoutRef.current)
    }
  }, [])

  const handleClick = () => {
    setPoked(true)
    setBubble(pickRandom(POKE_COMMENTS))
    clearTimeout(bubbleTimeoutRef.current)
    bubbleTimeoutRef.current = setTimeout(() => setBubble(null), BUBBLE_MS)
  }

  return (
    <div className="sales-kitty-wrap" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
      {bubble && <div className={`sales-kitty-bubble ${poked ? 'poked' : ''}`}>{bubble}</div>}
      <button
        type="button"
        className={`sales-kitty ${poked ? 'poked' : ''}`}
        style={{ transform: facingLeft ? 'scaleX(-1)' : undefined }}
        onClick={handleClick}
        aria-label="A cat, mostly here to judge your sales numbers. Click it if you dare."
      >
        🐱
      </button>
    </div>
  )
}
