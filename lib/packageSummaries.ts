/**
 * Client-friendly summaries for package information cards.
 * The existing plain-language "whatFor" catalogue copy is reused, without
 * the former sales talking points. Keep this local and independent of the
 * upstream catalogue snapshot so a data refresh does not overwrite it.
 */
import type { CatalogueService } from './catalogueUtils'
import { pitchNote } from './pitchNotes'

const REVISED: Record<string, string> = {
  'Cancer Risk Profile - Men':
    'A blood test panel measuring tumour-associated markers sometimes used in cancer assessment and monitoring. Results are not diagnostic on their own.',
  "Cancer Risk Profile - Women's":
    'A blood test panel measuring tumour-associated markers sometimes used in cancer assessment and monitoring. Results are not diagnostic on their own.',
  'Food Intolerance Test':
    'A food-response panel assessing laboratory antibody reactivity to selected foods. Results alone do not establish a food intolerance.',
  'Food Allergy & Intolerance Bundle':
    'Combines food-allergen sensitisation testing with a separate food-response panel. Results require clinical interpretation.',
  'Food Allergy Test':
    'Tests for IgE sensitisation to selected food allergens. A positive result alone does not confirm a food allergy.',
  'Respiratory Allergy Test':
    'Tests for IgE sensitisation to selected environmental allergens such as dust, pollen, animals and mould.',
  'Cancer Risk - BRCA Genetic Test':
    'A genetic blood test looking for selected BRCA1 and BRCA2 variants associated with inherited cancer susceptibility.',
}

/** A brief description of the screening scope, never an individual diagnosis. */
export function packageSummary(service: CatalogueService): string {
  const curated = REVISED[service.name] ?? pitchNote(service.name)?.whatFor
  if (curated) return curated
  const panels = service.panels.slice(0, 3).join(', ')
  if (panels) return `A ${service.category.toLowerCase()} package covering ${panels}${service.panels.length > 3 ? ' and additional panels' : ''}.`
  const items = service.comps.map((c) => c.name).slice(0, 3).join(', ')
  if (items) return `A ${service.category.toLowerCase()} service covering ${items}.`
  return `A ${service.category.toLowerCase()} service. See package details for included tests and procedures.`
}
