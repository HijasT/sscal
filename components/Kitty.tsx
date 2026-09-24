'use client'
import { useEffect, useRef, useState } from 'react'
import { stripEmployeeCode } from '@/lib/excelUtils'

// Idle commentary while wandering, before the team has hit 100% of target.
const BEFORE_100_COMMENTS = [
  "Target's not going to hit itself.",
  "Still waiting on that 100% target? So am I. So is everyone.",
  "I've seen snails move faster towards target.",
  "The finish line called. It's still waiting.",
  "Somewhere, a target is laughing at you.",
  "At this rate, I'll retire before you hit target.",
  "I'd clap for that number, but I don't have hands. Also, it's not enough.",
  "Working hard or hardly working? Rhetorical — I can see your screen.",
  "Ninety percent isn't a hundred percent. Basic math, really.",
  "I've licked my paw more times than we've hit target this year.",
  "Keep going. Or don't. I still get fed either way.",
  "That target's been waiting so long it filed a complaint.",
  "Sales are like my naps — currently not happening.",
  "I'd say 'almost there', but that would be generous.",
  "Even my litter box has a better completion rate.",
  "Tick tock. The target isn't going anywhere, unfortunately for you.",
]

// Idle commentary while wandering, once the team has hit/beaten 100% of target.
const AFTER_100_COMMENTS = [
  "Oh, so we CAN hit 100% target. Interesting.",
  "Achievement unlocked. No trophy, just my grudging respect.",
  "I'm almost impressed. Almost.",
  "Target met. I still won't do any sales though.",
  "Over 100%? Someone's trying to make the rest of us look bad.",
  "Miracles do happen. Rare ones. Today, apparently.",
  "You beat the target. I still won't clap. Physically can't.",
  "Someone actually did their job. Mark the calendar.",
  "100%+ noted. Don't get used to it.",
  "Well would you look at that. Overachievers.",
  "Fine, that's actually kind of impressive. Don't let it go to your head.",
]

// Shown when clicked/poked instead of a wander comment.
const POKE_COMMENTS = [
  "Stop poking me, go do some sales instead.",
  "Rude. I was napping. Also, sell something.",
  "Every click is a sale you didn't make.",
  "I have nine lives. You have one target.",
  "Petting me won't hit target either.",
  "You think this is funny? No incentive for you next month.",
  "Click all you want. Still doesn't count as a sale.",
  "That tickles. Unlike your commission check, apparently.",
  "I felt that. Your target didn't.",
  "Save the clicks for your CRM.",
  "Keep this up and I'm telling your manager you have too much free time.",
  "Was that supposed to hurt my feelings? I don't have a quota either.",
]

// Chance an eligible auto-comment uses the personalized line instead of a wander comment.
const PERSONAL_COMMENT_CHANCE = 0.35
// The personalized line fires at most this often, regardless of chance rolls.
const PERSONAL_COMMENT_COOLDOWN_MS = 120000

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
const SLEEP_MS = 10000
const JUMP_MS = 650
// Comments only fire this often (or less) — anything shorter feels like nagging.
const COMMENT_INTERVAL_MS = 20000
const BUBBLE_MS = 5000

// Rectangular UI elements the cat treats as "furniture" — it walks along the
// top edge of one, then hops to another rather than roaming free over the
// whole viewport.
const BOX_SELECTOR = '.card, .result-card, .stat-card, .slider-section, .privacy-notice, .card-description, .realtime-stat, .btn, input, select'
const BOX_MIN_WIDTH = 60
const BOX_MIN_HEIGHT = 20
// A landing point whose y differs from the current one by more than this is
// treated as a hop to a different shelf (jump animation) rather than a
// same-level walk.
const JUMP_HEIGHT_THRESHOLD = 50
// How often box selection prefers a target at roughly the same height as the
// current one (a walk) over any box at all (which may be a jump). Kept high
// so walking is the common case and jumping stays occasional.
const SAME_LEVEL_CHANCE = 0.8
// How often box selection prefers switching to a different box at all,
// rather than picking another spot on the one it's already standing on
// (patrolling the same box is always a walk, never a jump).
const SWITCH_BOX_CHANCE = 0.5

type Behavior = 'walking' | 'sitting' | 'purring' | 'licking' | 'jumping' | 'sleeping'

const SETTLE_BEHAVIORS: Behavior[] = ['sitting', 'purring', 'licking', 'jumping', 'sleeping']

function randomPoint() {
  if (typeof window === 'undefined') return { x: MARGIN, y: MARGIN }
  const maxX = Math.max(window.innerWidth - KITTY_SIZE - MARGIN, MARGIN)
  const maxY = Math.max(window.innerHeight - KITTY_SIZE - MARGIN, MARGIN)
  return {
    x: MARGIN + Math.random() * (maxX - MARGIN),
    y: MARGIN + Math.random() * (maxY - MARGIN),
  }
}

// Picks a random point on top of one of the page's box-shaped elements.
// Strongly prefers a target at roughly the same height as the cat's current
// position (a walk) over a random one (which may land far enough away to be
// a jump), and prefers patrolling the box it's already on over switching —
// both biases keep walking the common case and jumping the occasional one.
function pickBoxTarget(currentBox: Element | null, currentY: number): { x: number; y: number; box: Element } | null {
  if (typeof document === 'undefined') return null

  const landingY = (rect: DOMRect) =>
    Math.max(MARGIN, Math.min(window.innerHeight - KITTY_SIZE - MARGIN, rect.top - KITTY_SIZE))

  const boxes = Array.from(document.querySelectorAll<HTMLElement>(BOX_SELECTOR))
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(
      ({ rect }) =>
        rect.width >= BOX_MIN_WIDTH &&
        rect.height >= BOX_MIN_HEIGHT &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
    )
  if (boxes.length === 0) return null

  const otherBoxes = currentBox ? boxes.filter((b) => b.el !== currentBox) : boxes
  const candidates = otherBoxes.length > 0 && Math.random() < SWITCH_BOX_CHANCE ? otherBoxes : boxes

  const sameLevel = candidates.filter((b) => Math.abs(landingY(b.rect) - currentY) <= JUMP_HEIGHT_THRESHOLD)
  const pool = sameLevel.length > 0 && Math.random() < SAME_LEVEL_CHANCE ? sameLevel : candidates
  const { el, rect } = pickRandom(pool)

  const minX = Math.max(MARGIN, rect.left + 4)
  const maxX = Math.min(window.innerWidth - KITTY_SIZE - MARGIN, Math.max(rect.right - KITTY_SIZE - 4, minX))
  const x = minX + Math.random() * Math.max(maxX - minX, 0)

  return { x, y: landingY(rect), box: el }
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

// Reads the most recently saved monthly team achievement % from Bulk &
// Analytics' history (localStorage, read-only) so the cat knows whether to
// use the before/after-100% comment pool. Null if nothing's been calculated
// yet this session — the cat falls back to the before-100% pool then.
function getLatestTeamAchievement(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('smart_incentive_analytics')
    if (!stored) return null
    const months = Object.values(JSON.parse(stored)?.teamHistory ?? {}) as { monthKey?: string; teamAchievement?: number }[]
    if (months.length === 0) return null

    const latest = months.reduce((best, m) => ((m.monthKey ?? '') > (best.monthKey ?? '') ? m : best))
    return typeof latest.teamAchievement === 'number' ? latest.teamAchievement : null
  } catch {
    return null
  }
}

export function Kitty() {
  const [pos, setPos] = useState({ x: MARGIN, y: MARGIN })
  const posRef = useRef(pos)
  const currentBoxRef = useRef<Element | null>(null)
  const [walkDurationMs, setWalkDurationMs] = useState(MIN_WALK_MS)
  const [facingLeft, setFacingLeft] = useState(false)
  const [behavior, setBehavior] = useState<Behavior>('sitting')
  const [looking, setLooking] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [poked, setPoked] = useState(false)
  const [pokeComment, setPokeComment] = useState<string | null>(null)
  const lastCommentTextRef = useRef<string | undefined>(undefined)
  const lastCommentAtRef = useRef<number>(0)
  const lastPersonalCommentAtRef = useRef<number>(0)
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
      const personalDue = Date.now() - lastPersonalCommentAtRef.current >= PERSONAL_COMMENT_COOLDOWN_MS
      if (name && personalDue && Math.random() < PERSONAL_COMMENT_CHANCE) {
        lastPersonalCommentAtRef.current = Date.now()
        return `${name}, is that you?`
      }
      const achievement = getLatestTeamAchievement()
      const pool = achievement !== null && achievement >= 100 ? AFTER_100_COMMENTS : BEFORE_100_COMMENTS
      const comment = pickRandom(pool, lastCommentTextRef.current)
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
      const settleDuration = pose === 'sleeping'
        ? SLEEP_MS
        : SETTLE_MIN_MS + Math.random() * (SETTLE_MAX_MS - SETTLE_MIN_MS)
      schedule(walk, settleDuration)
    }

    const walk = () => {
      const prev = posRef.current
      const target = pickBoxTarget(currentBoxRef.current, prev.y)
      const next = target ? { x: target.x, y: target.y } : randomPoint()
      const isJump = Math.abs(next.y - prev.y) > JUMP_HEIGHT_THRESHOLD
      const distance = Math.hypot(next.x - prev.x, next.y - prev.y)
      const duration = Math.min(MAX_WALK_MS, Math.max(MIN_WALK_MS, (distance / WALK_SPEED_PX_PER_S) * 1000))

      setFacingLeft(next.x < prev.x)
      setWalkDurationMs(duration)
      setBehavior(isJump ? 'jumping' : 'walking')
      posRef.current = next
      currentBoxRef.current = target?.box ?? null
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
  const isSleeping = behavior === 'sleeping' && !poked
  const eyeState = poked ? 'wide' : behavior === 'purring' ? 'happy' : isSleeping ? 'closed' : 'normal'
  const showTongue = behavior === 'licking' && !poked

  // Keep the bubble on-screen near the viewport edges — centering it on the
  // cat clips it against body's overflow-x:hidden when the cat is close to
  // the left/right edge, since the bubble is much wider than the cat.
  let bubbleAlign: 'left' | 'right' | 'center' = 'center'
  if (typeof window !== 'undefined') {
    const bubbleHalf = window.innerWidth <= 768 ? 75 : 100
    const catCenterX = pos.x + KITTY_SIZE / 2
    if (catCenterX - bubbleHalf < MARGIN) bubbleAlign = 'left'
    else if (catCenterX + bubbleHalf > window.innerWidth - MARGIN) bubbleAlign = 'right'
  }

  return (
    <div
      className="sales-kitty-wrap"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: `transform ${walkDurationMs}ms linear`,
      }}
    >
      {displayBubble && (
        <div className={`sales-kitty-bubble align-${bubbleAlign} ${poked ? 'poked' : ''}`}>{displayBubble}</div>
      )}
      <button
        type="button"
        className={`sales-kitty ${poked ? 'poked' : ''} ${isJumping ? 'jumping' : ''}`}
        onClick={handleClick}
        aria-label="A cat, mostly here to judge your sales numbers. Click it if you dare."
      >
        <svg viewBox="0 0 64 40" className="kitty-svg" aria-hidden="true">
          <g style={{ transform: facingLeft ? 'scaleX(-1)' : undefined, transformOrigin: '32px 20px' }}>
            <path className={`kitty-tail ${isSleeping ? 'sleeping' : ''}`} d="M15,23 C6,25 2,16 8,7" />
            <g className={`kitty-legs kitty-legs-back ${isWalking ? 'stepping' : ''} ${isSleeping ? 'sleeping' : ''}`}>
              <rect x="15" y="27" width="4" height="10" rx="2" />
              <rect x="23" y="27" width="4" height="10" rx="2" />
            </g>
            <ellipse className={`kitty-body ${isSleeping ? 'sleeping' : ''}`} cx="32" cy="23" rx="17" ry="10" />
            <rect className="kitty-stripe" x="22" y="15" width="4" height="16" rx="2" />
            <rect className="kitty-stripe" x="31" y="15" width="4" height="16" rx="2" />
            <g
              className={`kitty-legs kitty-legs-front ${isWalking ? 'stepping' : ''} ${isSleeping ? 'sleeping' : ''}`}
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
              {isSleeping && (
                <text className="kitty-zzz" x="56" y="4" fontSize="8" fontWeight="700">Z</text>
              )}
            </g>
          </g>
        </svg>
      </button>
    </div>
  )
}
