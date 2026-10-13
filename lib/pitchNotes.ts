/**
 * Staff-facing sales notes for the Sale Assistant — surfaced via the per-package
 * "i" button. These are an internal selling aid: a plain-language summary of what
 * each package looks at, plus a few quick angles a rep can use in the pitch.
 *
 * IMPORTANT:
 *  - NOT customer-facing copy and NOT medical advice. Kept deliberately
 *    benefit-framed and non-diagnostic; wording is a DRAFT pending clinical /
 *    brand review before it is relied on with customers.
 *  - Kept here, keyed by catalogue service name, rather than in catalogue.json —
 *    that file is a synced snapshot (scripts/fetch-catalogue.mjs) and inline notes
 *    would be lost on the next re-sync. Edit the copy here.
 */

export interface PitchNote {
  /** What the package checks, in plain words — so staff understand the markers. */
  whatFor: string
  /** A few short selling angles the rep can lean on. */
  angles: string[]
}

export const PITCH_NOTES: Record<string, PitchNote> = {
  // ---- Core Health Screening ----
  'Household Domestic Health Screening': {
    whatFor: 'A fitness-to-work health check for domestic staff: a basic blood screen plus the tests employers and visa processes usually ask for.',
    angles: [
      'The simple, compliant option for household staff.',
      'One visit covers the essentials — an easy yes for employers.',
      'Entry price point; upsell to Standard for a fuller picture.',
    ],
  },
  'Standard Health Screening': {
    whatFor: 'A solid annual baseline: blood counts, cholesterol, blood sugar and the common general-health markers, with a doctor review.',
    angles: [
      "The sensible 'everyone should do this yearly' starting point.",
      'A clean anchor to compare Premium against.',
      'Doctor time is included — frame it as guidance, not just numbers.',
    ],
  },
  'Premium Health Screening': {
    whatFor: 'A broader yearly check than Standard — adds more organ and metabolic markers (liver, kidney, thyroid, vitamins) for a fuller picture.',
    angles: [
      "The most popular 'proper check-up' tier — an easy middle choice.",
      'More markers for a small step up in price over Standard.',
      'Doctor consultation included to explain the results.',
    ],
  },
  "Premium PLUS Women's Health Screening": {
    whatFor: "Our most complete women's general screen: everything in Premium plus added women's-health and hormone-related markers.",
    angles: [
      "The 'leave nothing out' annual check for women.",
      'Frame the extra markers as peace of mind on women’s health.',
      'A strong base to bundle with DNA or Longevity.',
    ],
  },
  "Premium PLUS Men's Health Screening": {
    whatFor: "Our most complete men's general screen: everything in Premium plus added men's-health markers.",
    angles: [
      'The thorough annual check for men who want the full picture.',
      'A small step up from Premium for noticeably more coverage.',
      'A natural anchor before suggesting bundles.',
    ],
  },

  // ---- Specialised Screening ----
  'Longevity Profile': {
    whatFor: 'Markers linked to healthy ageing and long-term risk — metabolic, cardiovascular and inflammation indicators.',
    angles: [
      'For the proactive, wellness-focused client.',
      'Pairs naturally with Premium PLUS for a complete longevity picture.',
      'Positions the clinic as forward-looking, not just reactive.',
    ],
  },
  'Cancer Risk Profile - Men': {
    whatFor: 'A blood-based tumour-marker screen used to flag areas worth a closer look in men.',
    angles: [
      'For clients who want added reassurance beyond a general check.',
      'Be clear it indicates risk, not a diagnosis — sets the right expectation.',
      'Commonly added onto an annual screen.',
    ],
  },
  "Cancer Risk Profile - Women's": {
    whatFor: 'A blood-based tumour-marker screen used to flag areas worth a closer look in women.',
    angles: [
      'For clients who want added reassurance beyond a general check.',
      'Be clear it indicates risk, not a diagnosis — sets the right expectation.',
      'Commonly added onto an annual screen.',
    ],
  },
  'Diabetes Screening': {
    whatFor: 'Checks blood-sugar control to flag diabetes or pre-diabetes risk.',
    angles: [
      'Quick, low-cost and highly relevant in this region.',
      'A great add-on for anyone with family history or lifestyle risk.',
      'Upsell to Advanced for insulin and earlier detection.',
    ],
  },
  'Advanced Diabetes Screening': {
    whatFor: 'A deeper look at blood sugar and insulin — catches early insulin resistance before standard glucose shifts.',
    angles: [
      'For clients serious about metabolic health or weight.',
      'Explains the energy dips and cravings people notice.',
      'The step up from basic Diabetes Screening.',
    ],
  },
  'Respiratory Allergy Test': {
    whatFor: 'Identifies common airborne allergy triggers — dust, pollen, pets, mould.',
    angles: [
      'For ongoing sneezing, congestion or asthma-like symptoms.',
      'Turns guesswork into a clear list of triggers.',
      'Pairs with Food Allergy for a full allergy picture.',
    ],
  },
  'Food Allergy Test': {
    whatFor: 'Tests for true (IgE) food-allergy reactions.',
    angles: [
      'For clients with clear reactions to certain foods.',
      'Distinguish from intolerance — different test, different answer.',
      'Bundle with intolerance for complete coverage.',
    ],
  },
  'Food Intolerance Test': {
    whatFor: 'Screens for food intolerances behind ongoing discomfort — bloating, fatigue — rather than acute allergy.',
    angles: [
      'For gut or energy complaints with no obvious cause.',
      'Popular with wellness and weight-management clients.',
      'Combine with Food Allergy as the bundle.',
    ],
  },
  'Food Allergy & Intolerance Bundle': {
    whatFor: 'Both the allergy and intolerance tests together — the complete food-reaction picture.',
    angles: [
      'Best value versus buying the two separately.',
      'The clear recommendation for unexplained gut or skin issues.',
      'One appointment, both answers.',
    ],
  },
  'Coeliac Test': {
    whatFor: 'A blood screen for coeliac disease (gluten autoimmunity).',
    angles: [
      'For clients who react to gluten or wheat.',
      'A quick single-tube add-on.',
      'Pairs with gut or food testing.',
    ],
  },
  'Cortisol Test': {
    whatFor: 'Measures the stress hormone cortisol.',
    angles: [
      'For burnout, poor sleep or stubborn weight.',
      'Ties neatly into the wellness and longevity conversation.',
      'A simple, relatable marker to explain.',
    ],
  },
  'Fasted Glucose Test': {
    whatFor: 'A single fasting blood-sugar reading.',
    angles: [
      'A quick, inexpensive entry check.',
      'A natural stepping stone to Diabetes Screening.',
      'Good for routine monitoring.',
    ],
  },
  'Fasted Glucose & Insulin Test': {
    whatFor: 'Fasting glucose plus insulin — shows how hard the body is working to control sugar.',
    angles: [
      'Catches early insulin resistance.',
      'For weight and metabolic-focused clients.',
      'The upgrade from glucose-only.',
    ],
  },
  'Cardiometabolic Risk Profile': {
    whatFor: 'Combined heart and metabolic markers — cholesterol balance, sugar and inflammation.',
    angles: [
      'For clients worried about heart health or family history.',
      'Connects the dots between weight, sugar and the heart.',
      'A strong add-on to a general screen.',
    ],
  },
  'Nutrition, Inflammation & Immune Health Profile': {
    whatFor: 'Vitamins, minerals and inflammation/immune markers — how well-nourished and balanced the body is.',
    angles: [
      'For low energy, frequent illness or fitness goals.',
      "Very relatable: 'are you actually getting what you need?'",
      'A popular wellness upsell.',
    ],
  },
  'Liver Profile': {
    whatFor: 'Liver function and health markers.',
    angles: [
      'For clients mindful of alcohol, medication or metabolic health.',
      'An easy reassurance marker to explain.',
      'A natural add-on to general screens.',
    ],
  },
  'Kidney & Metabolic Profile': {
    whatFor: 'Kidney function plus related metabolic markers.',
    angles: [
      'For blood-pressure, diabetes or hydration concerns.',
      'Pairs with cardiometabolic or diabetes testing.',
      'A peace-of-mind organ check.',
    ],
  },
  'Thyroid, Hormone & Vitamin Profile': {
    whatFor: 'Thyroid, key hormones and vitamins — common drivers of energy, mood and weight.',
    angles: [
      'For tiredness, weight changes, mood or hair concerns.',
      'Explains symptoms people often shrug off.',
      'A high-interest upsell, especially for women.',
    ],
  },
  'Gut Microbiome Test': {
    whatFor: 'Analyses the balance of gut bacteria and digestive health.',
    angles: [
      'For bloating, IBS-type symptoms or wellness optimisers.',
      'On-trend and highly engaging for clients.',
      'The anchor of the Gut Health bundle.',
    ],
  },

  // ---- Other Screenings & Consults ----
  'Body Composition Analysis': {
    whatFor: 'Measures body fat, muscle and distribution — beyond just weight.',
    angles: [
      'A great visual hook to open a wellness conversation.',
      'Pairs with any metabolic or diabetes testing.',
      'Quick, non-invasive and instantly relatable.',
    ],
  },
  'ECG & Consult': {
    whatFor: 'A heart-rhythm trace with a doctor review.',
    angles: [
      'For heart-health reassurance or before an exercise programme.',
      'A tangible, familiar test clients value.',
      'Adds onto cardiac and cardiometabolic packages.',
    ],
  },
  'Doctor Consultation': {
    whatFor: 'Dedicated time with a doctor to review results and plan next steps.',
    angles: [
      "Frame it as the 'what do I do now?' that makes testing worthwhile.",
      'An easy add-on that lifts perceived value.',
      'Positions the clinic as guidance, not just numbers.',
    ],
  },
  'Travel Fit Assessment': {
    whatFor: 'A fitness-to-travel check with advice.',
    angles: [
      'For business travellers, older clients or pre-trip peace of mind.',
      'An occasion-driven, easy sell.',
      'Bundle with vaccinations.',
    ],
  },
  'Seasonal Flu Vaccination': {
    whatFor: 'The annual flu shot.',
    angles: [
      'Quick, low-cost and a repeat-visit driver.',
      'An easy add-on in season.',
      'Good for families and workplaces.',
    ],
  },
  'Hajj & Umrah Vaccination Package (Below 65 years)': {
    whatFor: 'The vaccinations required and recommended for Hajj & Umrah travellers under 65.',
    angles: [
      'Compliance-driven, with clear seasonal demand.',
      'One package covers the requirements.',
      'Pair with the Travel Fit Assessment.',
    ],
  },
  'Hajj & Umrah Vaccination Package (Above 65 years)': {
    whatFor: 'Pilgrimage vaccinations tailored for travellers over 65.',
    angles: [
      'Age-appropriate coverage for older pilgrims.',
      'Reassuring for families booking for parents.',
      'Bundle with a general check.',
    ],
  },

  // ---- DNA Insights ----
  'Blood Group Test': {
    whatFor: 'Confirms ABO / Rh blood type.',
    angles: [
      'Handy for personal records, pregnancy or travel.',
      'An easy, inexpensive add-on.',
      'A quick yes alongside any blood draw.',
    ],
  },
  'Cancer Risk - BRCA Genetic Test': {
    whatFor: 'A genetic test for BRCA variants linked to hereditary breast and ovarian cancer risk.',
    angles: [
      'For clients with a family history.',
      'High-value and sensitive — lead with care and doctor support.',
      'Position as a one-time, lifelong insight.',
    ],
  },
  'DNA - Hair Loss Package': {
    whatFor: 'Genetic insight into hair-loss tendencies and what may help.',
    angles: [
      'High personal interest — an easy conversation starter.',
      'Pairs with the aesthetics / Healthmaxxing story.',
      'One-time test, lasting insight.',
    ],
  },
  'DNA - Acne Package': {
    whatFor: 'Genetic insight into acne tendencies and skin response.',
    angles: [
      'Appeals to younger and skincare-focused clients.',
      'Turns trial-and-error skincare into guided choices.',
      'Bundle with other DNA modules.',
    ],
  },
  'DNA - Ancestry': {
    whatFor: 'An ancestry and heritage breakdown from your DNA.',
    angles: [
      'Fun, gift-friendly and broad appeal.',
      'A low-pressure entry into DNA testing.',
      'Often added to the full DNA bundles.',
    ],
  },
  'DNA - Essentials': {
    whatFor: 'A starter DNA panel covering key health-relevant traits.',
    angles: [
      'An affordable intro to genetic insights.',
      "The stepping stone to 'All of You'.",
      'One-time, lifelong-relevant.',
    ],
  },
  'DNA - All of You': {
    whatFor: 'Our most complete DNA panel — health, traits and wellness insights in one.',
    angles: [
      "The flagship DNA offering — 'your full genetic blueprint'.",
      'Best value versus the individual DNA modules.',
      'The core of the Ultimate and Executive bundles.',
    ],
  },

  // ---- Comprehensive Packages / Bundles ----
  'Healthy Heart Package': {
    whatFor: 'A focused cardiovascular bundle — heart and metabolic markers with the relevant checks.',
    angles: [
      'For family history or heart-health worriers.',
      'Bundle value versus separate cardiac tests.',
      'Pair with ECG for the complete heart story.',
    ],
  },
  'Women\'s Clarity Package': {
    whatFor: "A women's-health bundle covering hormones, vitamins and general markers.",
    angles: [
      'For women wanting answers on energy, mood and cycle.',
      "A cohesive 'understand your body' story.",
      'A strong mid-tier women’s choice.',
    ],
  },
  "Essentials Men's Package": {
    whatFor: 'A well-rounded starter bundle for men.',
    angles: [
      'An easy first bundle for men new to screening.',
      'Better value than picking tests one by one.',
      'The upsell path to All of You and Ultimate.',
    ],
  },
  "Essentials Women's Package": {
    whatFor: 'A well-rounded starter bundle for women.',
    angles: [
      'An easy first bundle for women new to screening.',
      'Better value than picking tests one by one.',
      'The upsell path to All of You and Ultimate.',
    ],
  },
  "All of You Men's Package": {
    whatFor: 'A comprehensive men’s bundle combining broad screening with DNA insights.',
    angles: [
      'For men who want blood and genetics together.',
      'Big perceived value — lead with completeness.',
      'The step below Ultimate.',
    ],
  },
  "All of You Women's Package": {
    whatFor: 'A comprehensive women’s bundle combining broad screening with DNA insights.',
    angles: [
      'For women who want blood and genetics together.',
      'Big perceived value — lead with completeness.',
      'The step below Ultimate.',
    ],
  },
  "Ultimate Men's Longevity Package": {
    whatFor: 'Our top-tier men’s package — the most complete screening plus DNA and a longevity focus.',
    angles: [
      'The flagship for health-invested men.',
      "'Everything, done properly' — premium positioning.",
      'Lead here for executive and VIP clients.',
    ],
  },
  "Ultimate Women's Longevity Package": {
    whatFor: 'Our top-tier women’s package — the most complete screening plus DNA and a longevity focus.',
    angles: [
      'The flagship for health-invested women.',
      "'Everything, done properly' — premium positioning.",
      'Lead here for executive and VIP clients.',
    ],
  },
  "Executive Men's Health Package": {
    whatFor: 'A premium, time-efficient executive health check for men.',
    angles: [
      'For busy professionals — thorough but streamlined.',
      'Corporate and VIP positioning.',
      'Pairs with a doctor consult for the full service.',
    ],
  },
  "Executive Women's Health Package": {
    whatFor: 'A premium, time-efficient executive health check for women.',
    angles: [
      'For busy professionals — thorough but streamlined.',
      'Corporate and VIP positioning.',
      'Pairs with a doctor consult for the full service.',
    ],
  },
  'Ultimate Gut Health Package': {
    whatFor: 'A complete gut-focused bundle built around the microbiome and digestive markers.',
    angles: [
      'For the fast-growing gut-health audience.',
      'The microbiome is a strong engagement hook.',
      'Bundle value versus separate gut tests.',
    ],
  },
  "Dubai It Men's Package": {
    whatFor: 'A signature all-in men’s package — broad screening with premium extras.',
    angles: [
      "The 'treat yourself to the works' option.",
      'Premium lifestyle positioning.',
      'The core of Healthmaxxing for men.',
    ],
  },
  "Dubai It Women's Package": {
    whatFor: 'A signature all-in women’s package — broad screening with premium extras.',
    angles: [
      "The 'treat yourself to the works' option.",
      'Premium lifestyle positioning.',
      'The core of Healthmaxxing for women.',
    ],
  },

  // ---- Synthetic (built at runtime) ----
  "HEALTHMAXXING Men's Package": {
    whatFor: 'Our maximal-optimisation package for men: the Dubai It base plus a full DNA and wellness stack — effectively everything we offer.',
    angles: [
      'The ultimate flex for the fully health-invested client.',
      'Only suggest once spend is already high (AED 10,000+).',
      'One package, the complete Kleon experience.',
    ],
  },
  "HEALTHMAXXING Women's Package": {
    whatFor: 'Our maximal-optimisation package for women: the Dubai It base plus a full DNA and wellness stack — effectively everything we offer.',
    angles: [
      'The ultimate flex for the fully health-invested client.',
      'Only suggest once spend is already high (AED 10,000+).',
      'One package, the complete Kleon experience.',
    ],
  },
}

export function pitchNote(name: string): PitchNote | undefined {
  return PITCH_NOTES[name]
}
