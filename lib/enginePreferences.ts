/** Persist only policy preferences. Input verification is per-upload, never global. */
export type IncentiveEngineChoice = 'legacy' | 'mr-krabs' | 'scrooge'
export interface EnginePreferences {
  engine: IncentiveEngineChoice
  bonusAed: number
}
const KEY = 'sic_incentive_engine_preferences'
export const DEFAULT_ENGINE_PREFERENCES: EnginePreferences = { engine: 'legacy', bonusAed: 500 }

export function readEnginePreferences(): EnginePreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_ENGINE_PREFERENCES }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_ENGINE_PREFERENCES }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_ENGINE_PREFERENCES }
    const data = parsed as Partial<EnginePreferences>
    return {
      engine: data.engine === 'mr-krabs' || data.engine === 'scrooge' ? data.engine : 'legacy',
      bonusAed: typeof data.bonusAed === 'number' && Number.isFinite(data.bonusAed) &&
        data.bonusAed >= 0 && data.bonusAed <= 100000 ? data.bonusAed : 500,
    }
  } catch {
    return { ...DEFAULT_ENGINE_PREFERENCES }
  }
}
export function writeEnginePreferences(value: EnginePreferences): void {
  if (typeof window === 'undefined') return
  if ((value.engine !== 'legacy' && value.engine !== 'mr-krabs' && value.engine !== 'scrooge') ||
    !Number.isFinite(value.bonusAed) || value.bonusAed < 0 ||
    value.bonusAed > 100000 || Math.round(value.bonusAed * 100) !== value.bonusAed * 100) {
    throw new Error('Select an engine and a valid AED bonus (0–100000, at most 2 decimals)')
  }
  window.localStorage.setItem(KEY, JSON.stringify(value))
}
