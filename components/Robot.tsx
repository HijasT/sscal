'use client'
import { useEffect, useRef, useState } from 'react'
import { stripEmployeeCode } from '@/lib/excelUtils'
import { getFresh } from '@/lib/storage'

// Idle commentary while floating, before the team has hit 100% of target.
const BEFORE_100_COMMENTS = [
  "Target's not going to hit itself.",
  "Still waiting on that 100% target? So am I. So is everyone.",
  "My calculations say the target is still out there. Far out.",
  "The finish line called. It's still waiting.",
  "Somewhere, a target is laughing at you.",
  "At this rate, I'll be obsolete before you hit target.",
  "I'd clap for that number, but I'm all out of hands. Also, it's not enough.",
  "Working hard or hardly working? Rhetorical — I can see your screen.",
  "Ninety percent isn't a hundred percent. Basic math, really.",
  "I've recharged more times than we've hit target this year.",
  "Keep going. Or don't. My battery lasts either way.",
  "That target's been waiting so long it filed a complaint.",
  "Sales are like my firmware updates — currently not happening.",
  "I'd say 'almost there', but that would be generous.",
  "Even my recycle bin has a better completion rate.",
  "Tick tock. The target isn't going anywhere, unfortunately for you.",
]

// Idle commentary while floating, once the team has hit/beaten 100% of target.
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

// Shown when clicked/poked instead of a floating comment.
const POKE_COMMENTS = [
  "Stop poking me, go do some sales instead.",
  "Rude. I was hovering peacefully. Also, sell something.",
  "Every click is a sale you didn't make.",
  "I have one power button. You have one target.",
  "Poking me won't hit target either.",
  "You think this is funny? No incentive for you next month.",
  "Click all you want. Still doesn't count as a sale.",
  "That tickles my sensors. Unlike your commission check, apparently.",
  "I felt that. Your target didn't.",
  "Save the clicks for your CRM.",
  "Keep this up and I'm telling your manager you have too much free time.",
  "Was that supposed to hurt my feelings? I don't have a quota either.",
]

// Chance an eligible auto-comment uses the personalized line instead of a floating comment.
const PERSONAL_COMMENT_CHANCE = 0.35
// The personalized line fires at most this often, regardless of chance rolls.
const PERSONAL_COMMENT_COOLDOWN_MS = 120000

const ROBOT_SIZE = 44
const MARGIN = 16

// Slow, constant drift speed (px/sec); duration is derived from distance so
// short and long moves feel equally lazy. Moves ease in and out, and the next
// one starts only after a long stay in place, so it drifts rarely instead of constantly.
const FLOAT_SPEED_PX_PER_S = 40
const MIN_FLOAT_MS = 3000
const MAX_FLOAT_MS = 9000
const HOVER_MIN_MS = 15000
const HOVER_MAX_MS = 35000
const STANDBY_MS = 20000
const STANDBY_CHANCE = 0.25
// Comments only fire this often (or less) — anything shorter feels like nagging.
const COMMENT_INTERVAL_MS = 20000
const BUBBLE_MS = 5000

type Behavior = 'floating' | 'hovering' | 'standby'

function randomPoint() {
  if (typeof window === 'undefined') return { x: MARGIN, y: MARGIN }
  const maxX = Math.max(window.innerWidth - ROBOT_SIZE - MARGIN, MARGIN)
  const maxY = Math.max(window.innerHeight - ROBOT_SIZE - 12 - MARGIN, MARGIN)
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
// (the Bulk tab persists it to localStorage) so the robot can call someone
// out by name. Read-only, no props/state coupling to the calculator.
function getRandomStaffFirstName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = getFresh('local', 'sic_bulk_upload')
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

// Reads the team achievement % from the last Bulk calculation (localStorage,
// read-only) so the robot knows whether to use the before/after-100% comment
// pool. Null if nothing's been calculated yet — it falls back to the
// before-100% pool then.
function getLatestTeamAchievement(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = getFresh('local', 'sic_bulk_results')
    if (!stored) return null
    const achievement = JSON.parse(stored)?.calculatedData?.teamAchievement
    return typeof achievement === 'number' ? achievement : null
  } catch {
    return null
  }
}

export function Robot() {
  const [pos, setPos] = useState({ x: MARGIN, y: MARGIN })
  const posRef = useRef(pos)
  const [floatDurationMs, setFloatDurationMs] = useState(MIN_FLOAT_MS)
  const [facingLeft, setFacingLeft] = useState(false)
  const [behavior, setBehavior] = useState<Behavior>('hovering')
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
      // Keep the robot clickable, just stop it drifting/animating.
      const restPoint = randomPoint()
      posRef.current = restPoint
      setPos(restPoint)
      setBehavior('hovering')
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

    const afterFloat = () => {
      const dueForComment = Date.now() - lastCommentAtRef.current >= COMMENT_INTERVAL_MS

      if (dueForComment) {
        // Stop and face the user while it says its piece.
        setBehavior('hovering')
        setLooking(true)
        lastCommentAtRef.current = Date.now()
        setBubble(pickComment())
        clearTimeout(bubbleTimeoutRef.current)
        bubbleTimeoutRef.current = setTimeout(() => {
          setBubble(null)
          setLooking(false)
          schedule(float, 400)
        }, BUBBLE_MS)
        return
      }

      if (Math.random() < STANDBY_CHANCE) {
        setBehavior('standby')
        schedule(float, STANDBY_MS)
        return
      }
      setBehavior('hovering')
      schedule(float, HOVER_MIN_MS + Math.random() * (HOVER_MAX_MS - HOVER_MIN_MS))
    }

    const float = () => {
      const prev = posRef.current
      const next = randomPoint()
      const distance = Math.hypot(next.x - prev.x, next.y - prev.y)
      const duration = Math.min(MAX_FLOAT_MS, Math.max(MIN_FLOAT_MS, (distance / FLOAT_SPEED_PX_PER_S) * 1000))

      setFacingLeft(next.x < prev.x)
      setFloatDurationMs(duration)
      setBehavior('floating')
      posRef.current = next
      setPos(next)
      schedule(afterFloat, duration)
    }

    float()

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
  const isFloating = behavior === 'floating' && !poked
  const isStandby = behavior === 'standby' && !poked
  const eyeState = poked ? 'wide' : isStandby ? 'closed' : 'normal'

  // Keep the bubble on-screen near the viewport edges — centering it on the
  // robot clips it against body's overflow-x:hidden when it is close to the
  // left/right edge, since the bubble is much wider than the robot.
  let bubbleAlign: 'left' | 'right' | 'center' = 'center'
  if (typeof window !== 'undefined') {
    const bubbleHalf = window.innerWidth <= 768 ? 75 : 100
    const centerX = pos.x + ROBOT_SIZE / 2
    if (centerX - bubbleHalf < MARGIN) bubbleAlign = 'left'
    else if (centerX + bubbleHalf > window.innerWidth - MARGIN) bubbleAlign = 'right'
  }

  return (
    <div
      className="robot-wrap"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: `transform ${floatDurationMs}ms ease-in-out`,
      }}
    >
      {displayBubble && (
        <div className={`robot-bubble align-${bubbleAlign} ${poked ? 'poked' : ''}`}>{displayBubble}</div>
      )}
      <button
        type="button"
        className={`robot ${poked ? 'poked' : ''}`}
        onClick={handleClick}
        aria-label="Kleon, a small floating robot, mostly here to judge your sales numbers. Click it if you dare."
      >
        <svg viewBox="0 0 48 56" className="robot-svg" aria-hidden="true">
          <g style={{ transform: facingLeft ? 'scaleX(-1)' : undefined, transformOrigin: '24px 28px' }}>
            <g className={`robot-bob ${isStandby ? 'standby' : ''}`}>
              <ellipse className={`robot-halo ${isFloating ? 'on' : ''}`} cx="24" cy="51" rx="10" ry="2.4" />
              <ellipse className={`robot-halo robot-halo-inner ${isFloating ? 'on' : ''}`} cx="24" cy="51" rx="5.5" ry="1.4" />
              <g className={`robot-head ${looking ? 'looking' : ''}`}>
                <rect className="robot-shell" x="9" y="5" width="30" height="40" rx="15" />
                <path className="robot-band" d="M9.7 34 H38.3 A15 15 0 0 1 24 45 A15 15 0 0 1 9.7 34 Z" />
                <rect className="robot-plate" x="5.5" y="19" width="3" height="11" rx="1.5" />
                <rect className="robot-plate" x="39.5" y="19" width="3" height="11" rx="1.5" />
                <rect className="robot-visor" x="13.5" y="12" width="21" height="14" rx="7" />
                <path className="robot-gloss" d="M17 15.5 Q24 13.2 31 15.5" />
                <rect className={`robot-eye-glow ${eyeState}`} x="16.6" y="15.6" width="5.6" height="9.6" rx="2.8" />
                <rect className={`robot-eye-glow ${eyeState}`} x="25.8" y="15.6" width="5.6" height="9.6" rx="2.8" />
                <rect className={`robot-eye ${eyeState}`} x="18.7" y="17.6" width="2.6" height="5.6" rx="1.3" />
                <rect className={`robot-eye ${eyeState}`} x="26.7" y="17.6" width="2.6" height="5.6" rx="1.3" />
                <rect className={`robot-status ${isStandby ? 'off' : ''}`} x="20" y="37" width="8" height="1.8" rx="0.9" />
              </g>
            </g>
          </g>
        </svg>
      </button>
    </div>
  )
}
