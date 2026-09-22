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

const KITTY_SIZE = 34
const MARGIN = 16

// Must match .sales-kitty-wrap's transform transition duration in globals.css —
// this is how long a walk between two points visually takes.
const WALK_MS = 2500
const SETTLE_MIN_MS = 4000
const SETTLE_MAX_MS = 9000
const JUMP_MS = 650
const COMMENT_DELAY_MS = 900
const BUBBLE_MS = 4000

type Behavior = 'walking' | 'sitting' | 'purring' | 'licking' | 'jumping'

// Native cat-face emoji already double as poses — no image assets needed.
const BEHAVIOR_EMOJI: Record<Behavior, string> = {
  walking: '🐈',
  sitting: '🐈',
  purring: '😻',
  licking: '😽',
  jumping: '🙀',
}
const POKED_EMOJI = '😾'

const SETTLE_BEHAVIORS: Behavior[] = ['sitting', 'purring', 'licking', 'jumping']

function randomPoint() {
  if (typeof window === 'undefined') return { x: MARGIN, y: MARGIN }
  const maxX = Math.max(window.innerWidth - KITTY_SIZE - MARGIN, MARGIN)
  const maxY = Math.max(window.innerHeight - KITTY_SIZE - MARGIN, MARGIN)
  return {
    x: MARGIN + Math.random() * (maxX - MARGIN),
    y: MARGIN + Math.random() * (maxY - MARGIN),
  }
}

function pickRandom<T>(list: T[], exclude?: T): T {
  const options = exclude !== undefined ? list.filter((item) => item !== exclude) : list
  return options[Math.floor(Math.random() * options.length)] ?? list[0]
}

export function Kitty() {
  const [pos, setPos] = useState({ x: MARGIN, y: MARGIN })
  const [facingLeft, setFacingLeft] = useState(false)
  const [behavior, setBehavior] = useState<Behavior>('sitting')
  const [bubble, setBubble] = useState<string | null>(null)
  const [poked, setPoked] = useState(false)
  const [pokeComment, setPokeComment] = useState<string | null>(null)
  const lastCommentRef = useRef<string | undefined>(undefined)
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const pokeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      // Keep the cat clickable, just stop it wandering/animating.
      setPos(randomPoint())
      setBehavior('sitting')
      return
    }

    const timeouts: ReturnType<typeof setTimeout>[] = []
    const schedule = (fn: () => void, ms: number) => {
      timeouts.push(setTimeout(fn, ms))
    }

    const settle = () => {
      const next = pickRandom(SETTLE_BEHAVIORS)
      setBehavior(next)

      // The jump pose is a brief bounce, not a resting pose — drop back to sitting after it plays.
      if (next === 'jumping') {
        schedule(() => setBehavior('sitting'), JUMP_MS)
      }

      schedule(() => {
        const comment = pickRandom(WANDER_COMMENTS, lastCommentRef.current)
        lastCommentRef.current = comment
        setBubble(comment)
        clearTimeout(bubbleTimeoutRef.current)
        bubbleTimeoutRef.current = setTimeout(() => setBubble(null), BUBBLE_MS)
      }, COMMENT_DELAY_MS)

      schedule(walk, SETTLE_MIN_MS + Math.random() * (SETTLE_MAX_MS - SETTLE_MIN_MS))
    }

    const walk = () => {
      setBubble(null)
      setBehavior('walking')
      setPos((prev) => {
        const next = randomPoint()
        setFacingLeft(next.x < prev.x)
        return next
      })
      schedule(settle, WALK_MS)
    }

    walk()

    return () => {
      timeouts.forEach(clearTimeout)
      clearTimeout(bubbleTimeoutRef.current)
      clearTimeout(pokeTimeoutRef.current)
    }
  }, [])

  const handleClick = () => {
    setPoked(true)
    setPokeComment(pickRandom(POKE_COMMENTS))
    clearTimeout(pokeTimeoutRef.current)
    pokeTimeoutRef.current = setTimeout(() => setPoked(false), BUBBLE_MS)
  }

  const displayEmoji = poked ? POKED_EMOJI : BEHAVIOR_EMOJI[behavior]
  const displayBubble = poked ? pokeComment : bubble
  const behaviorClass = poked ? 'poked' : behavior === 'jumping' ? 'jumping' : ''

  return (
    <div className="sales-kitty-wrap" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
      {displayBubble && (
        <div className={`sales-kitty-bubble ${poked ? 'poked' : ''}`}>{displayBubble}</div>
      )}
      <button
        type="button"
        className={`sales-kitty ${behaviorClass}`}
        onClick={handleClick}
        aria-label="A cat, mostly here to judge your sales numbers. Click it if you dare."
      >
        <span
          className="sales-kitty-face"
          style={{ transform: facingLeft ? 'scaleX(-1)' : undefined }}
        >
          {displayEmoji}
        </span>
      </button>
    </div>
  )
}
