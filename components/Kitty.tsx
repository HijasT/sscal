'use client'
import { useEffect, useRef, useState } from 'react'
import { stripEmployeeCode } from '@/lib/excelUtils'

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

// Chance an eligible auto-comment uses the personalized line instead of a wander comment.
const PERSONAL_COMMENT_CHANCE = 0.35

const KITTY_SIZE = 40
const MARGIN = 16

// Constant walking pace (px/sec) — duration is derived from distance so the
// cat moves at a steady speed instead of gliding to its target on a fixed
// timer (which looked like it was being dragged there, not walking).
const WALK_SPEED_PX_PER_S = 90
const MIN_WALK_MS = 900
const MAX_WALK_MS = 5000
const SETTLE_MIN_MS = 3000
const SETTLE_MAX_MS = 6000
const JUMP_MS = 650
// Comments only fire this often (or less) — anything shorter feels like nagging.
const COMMENT_INTERVAL_MS = 20000
const BUBBLE_MS = 4000

type Behavior = 'walking' | 'sitting' | 'purring' | 'licking' | 'jumping'

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

// Reads whatever staff names are already sitting in the last Excel upload
// (Bulk & Analytics persists it to localStorage) so the cat can call someone
// out by name. Read-only, no props/state coupling to the calculator.
function getRandomStaffFirstName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('sic_bulk_upload')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    const sheets = parsed?.excelData
    if (!Array.isArray(sheets)) return null

    const names = new Set<string>()
    for (const sheet of sheets) {
      for (const person of sheet?.staff ?? []) {
        if (person?.name) names.add(person.name)
      }
    }
    if (names.size === 0) return null

    const cleaned = stripEmployeeCode(pickRandom([...names]))
    return cleaned.split(' ')[0] || null
  } catch {
    return null
  }
}

export function Kitty() {
  const [pos, setPos] = useState({ x: MARGIN, y: MARGIN })
  const posRef = useRef(pos)
  const [walkDurationMs, setWalkDurationMs] = useState(MIN_WALK_MS)
  const [facingLeft, setFacingLeft] = useState(false)
  const [behavior, setBehavior] = useState<Behavior>('sitting')
  const [looking, setLooking] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [poked, setPoked] = useState(false)
  const [pokeComment, setPokeComment] = useState<string | null>(null)
  const lastCommentTextRef = useRef<string | undefined>(undefined)
  const lastCommentAtRef = useRef<number>(0)
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const pokeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      // Keep the cat clickable, just stop it wandering/animating.
      const restPoint = randomPoint()
      posRef.current = restPoint
      setPos(restPoint)
      setBehavior('sitting')
      return
    }

    lastCommentAtRef.current = Date.now() // grace period before the first comment

    const timeouts: ReturnType<typeof setTimeout>[] = []
    const schedule = (fn: () => void, ms: number) => {
      timeouts.push(setTimeout(fn, ms))
    }

    const pickComment = () => {
      const name = getRandomStaffFirstName()
      if (name && Math.random() < PERSONAL_COMMENT_CHANCE) return `${name}, is that you?`
      const comment = pickRandom(WANDER_COMMENTS, lastCommentTextRef.current)
      lastCommentTextRef.current = comment
      return comment
    }

    const afterWalk = () => {
      const dueForComment = Date.now() - lastCommentAtRef.current >= COMMENT_INTERVAL_MS

      if (dueForComment) {
        // Stop and look at the user while it says its piece.
        setBehavior('sitting')
        setLooking(true)
        lastCommentAtRef.current = Date.now()
        setBubble(pickComment())
        clearTimeout(bubbleTimeoutRef.current)
        bubbleTimeoutRef.current = setTimeout(() => {
          setBubble(null)
          setLooking(false)
          schedule(walk, 400)
        }, BUBBLE_MS)
        return
      }

      const pose = pickRandom(SETTLE_BEHAVIORS)
      setBehavior(pose)
      if (pose === 'jumping') {
        schedule(() => setBehavior('sitting'), JUMP_MS)
      }
      schedule(walk, SETTLE_MIN_MS + Math.random() * (SETTLE_MAX_MS - SETTLE_MIN_MS))
    }

    const walk = () => {
      const prev = posRef.current
      const next = randomPoint()
      const distance = Math.hypot(next.x - prev.x, next.y - prev.y)
      const duration = Math.min(MAX_WALK_MS, Math.max(MIN_WALK_MS, (distance / WALK_SPEED_PX_PER_S) * 1000))

      setFacingLeft(next.x < prev.x)
      setWalkDurationMs(duration)
      setBehavior('walking')
      posRef.current = next
      setPos(next)
      schedule(afterWalk, duration)
    }

    walk()

    return () => {
      timeouts.forEach(clearTimeout)
      clearTimeout(bubbleTimeoutRef.current)
      clearTimeout(pokeTimeoutRef.current)
    }
  }, [])

  const handleClick = () => {
    lastCommentAtRef.current = Date.now() // don't also fire an auto-comment right after this
    setPoked(true)
    setPokeComment(pickRandom(POKE_COMMENTS))
    clearTimeout(pokeTimeoutRef.current)
    pokeTimeoutRef.current = setTimeout(() => setPoked(false), BUBBLE_MS)
  }

  const displayBubble = poked ? pokeComment : bubble
  const isWalking = behavior === 'walking' && !poked
  const isJumping = behavior === 'jumping' && !poked
  const eyeState = poked ? 'wide' : behavior === 'purring' ? 'happy' : 'normal'
  const showTongue = behavior === 'licking' && !poked

  return (
    <div
      className="sales-kitty-wrap"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: `transform ${walkDurationMs}ms linear`,
      }}
    >
      {displayBubble && (
        <div className={`sales-kitty-bubble ${poked ? 'poked' : ''}`}>{displayBubble}</div>
      )}
      <button
        type="button"
        className={`sales-kitty ${poked ? 'poked' : ''} ${isJumping ? 'jumping' : ''}`}
        onClick={handleClick}
        aria-label="A cat, mostly here to judge your sales numbers. Click it if you dare."
      >
        <svg viewBox="0 0 64 40" className="kitty-svg" aria-hidden="true">
          <g style={{ transform: facingLeft ? 'scaleX(-1)' : undefined, transformOrigin: '32px 20px' }}>
            <path className="kitty-tail" d="M15,23 C6,25 2,16 8,7" />
            <g className={`kitty-legs kitty-legs-back ${isWalking ? 'stepping' : ''}`}>
              <rect x="15" y="27" width="4" height="10" rx="2" />
              <rect x="23" y="27" width="4" height="10" rx="2" />
            </g>
            <ellipse className="kitty-body" cx="32" cy="23" rx="17" ry="10" />
            <rect className="kitty-stripe" x="22" y="15" width="4" height="16" rx="2" />
            <rect className="kitty-stripe" x="31" y="15" width="4" height="16" rx="2" />
            <g
              className={`kitty-legs kitty-legs-front ${isWalking ? 'stepping' : ''}`}
              style={{ animationDelay: isWalking ? '-0.3s' : undefined }}
            >
              <rect x="40" y="27" width="4" height="10" rx="2" />
              <rect x="48" y="27" width="4" height="10" rx="2" />
            </g>
            <g className={`kitty-head ${looking ? 'looking' : ''}`}>
              <polygon className="kitty-ear" points="41,7 44,1 47,8" />
              <polygon className="kitty-ear" points="53,7 56,1 58,8" />
              <circle className="kitty-face" cx="49" cy="15" r="10" />
              <ellipse className={`kitty-eye ${eyeState}`} cx="46" cy="13" rx="1.6" ry="2.2" />
              <ellipse className={`kitty-eye ${eyeState}`} cx="52" cy="13" rx="1.6" ry="2.2" />
              <polygon className="kitty-nose" points="48,18 51,18 49.5,20" />
              <ellipse className={`kitty-tongue ${showTongue ? 'licking' : ''}`} cx="49.5" cy="21.5" rx="1.4" ry="2" />
              <line className="kitty-whisker" x1="39" y1="16" x2="30" y2="14" />
              <line className="kitty-whisker" x1="39" y1="18" x2="30" y2="18" />
              <line className="kitty-whisker" x1="59" y1="16" x2="68" y2="14" />
              <line className="kitty-whisker" x1="59" y1="18" x2="68" y2="18" />
            </g>
          </g>
        </svg>
      </button>
    </div>
  )
}
