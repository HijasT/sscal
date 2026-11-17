/** Pre-v15.1.0 historical Legacy tier fixture.
 * Retains the independent Phase 2/3/4 financial golden amounts for audit.
 * This is intentionally NOT used by live calculations.
 */
import type { Tier } from '../../lib/config'
export const HISTORICAL_LEGACY_TIERS: Tier[] = [
  { id: 'tier1', name: 'Tier 1', min: 85, max: 101, rate: 2.5, color: '#2196f3' },
  { id: 'tier2', name: 'Tier 2', min: 101, max: 111, rate: 3, color: '#9c27b0' },
  { id: 'tier3', name: 'Tier 3', min: 111, max: Infinity, rate: 3.5, color: '#4caf50' },
]
