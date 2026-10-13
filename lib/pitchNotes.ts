/**
 * Sales notes for the Sale Assistant — surfaced via the per-package "i" button
 * to help staff explain a package to a customer.
 *
 * Each note gives, in plain language, what the package checks plus the reasons a
 * customer would take it (customer-benefit "why", not internal sales tactics).
 *
 * IMPORTANT:
 *  - Not medical advice; kept benefit-framed and non-diagnostic. Wording is a
 *    DRAFT pending clinical / brand review before it is relied on with customers.
 *  - Notes must not reference HEALTHMAXXING: it is a synthetic suggestion, not an
 *    official catalogue package, so no package should pitch it.
 *  - Kept here, keyed by catalogue service name, rather than in catalogue.json —
 *    that file is a synced snapshot (scripts/fetch-catalogue.mjs) and inline notes
 *    would be lost on the next re-sync. Edit the copy here.
 */

export interface PitchNote {
  /** What the package checks, in plain words — so staff understand the markers. */
  whatFor: string
  /** Why a customer would take it — benefit-led reasons the rep can relay. */
  angles: string[]
}

export const PITCH_NOTES: Record<string, PitchNote> = {
  // ---- Core Health Screening ----
  'Household Domestic Health Screening': {
    whatFor: 'A fitness-to-work health check for domestic staff: a basic blood screen plus the tests employers and visa processes usually ask for.',
    angles: [
      'Confirms a worker is fit and healthy for the role.',
      'Covers the checks employers and visa processes require, in one visit.',
      'Simple peace of mind for the household.',
    ],
  },
  'Standard Health Screening': {
    whatFor: 'A solid annual baseline: blood counts, cholesterol, blood sugar and the common general-health markers, with a doctor review.',
    angles: [
      'Know your baseline health with the key blood checks each year.',
      'Catch common issues early, before you feel any symptoms.',
      'A doctor reviews your results so you know what they mean.',
    ],
  },
  'Premium Health Screening': {
    whatFor: 'A broader yearly check than Standard — adds more organ and metabolic markers (liver, kidney, thyroid, vitamins) for a fuller picture.',
    angles: [
      'A fuller yearly picture across more of your body.',
      'Spot potential issues early across liver, kidney, thyroid and vitamins.',
      'A doctor explains everything and what to do next.',
    ],
  },
  "Premium PLUS Women's Health Screening": {
    whatFor: "Our most complete women's general screen: everything in Premium plus added women's-health and hormone-related markers.",
    angles: [
      'The most thorough annual check for women — nothing left out.',
      'Reassurance across hormones, vitamins and general health in one go.',
      'Catch more early, across more of the body.',
    ],
  },
  "Premium PLUS Men's Health Screening": {
    whatFor: "Our most complete men's general screen: everything in Premium plus added men's-health markers.",
    angles: [
      'The most thorough annual check for men — the complete picture.',
      'Catch more early, across more of the body.',
      'Added men’s-health markers for extra reassurance.',
    ],
  },

  // ---- Specialised Screening ----
  'Longevity Profile': {
    whatFor: 'Markers linked to healthy ageing and long-term risk — metabolic, cardiovascular and inflammation indicators.',
    angles: [
      'Understand your long-term health and ageing-related risks.',
      'Act early on heart, metabolic and inflammation markers.',
      'Stay healthier for longer, not just treat problems as they come.',
    ],
  },
  'Cancer Risk Profile - Men': {
    whatFor: 'A blood-based tumour-marker screen used to flag areas worth a closer look in men.',
    angles: [
      'Added reassurance beyond a general health check.',
      'Flags areas worth looking into sooner.',
      'Valuable peace of mind, especially with a family history.',
    ],
  },
  "Cancer Risk Profile - Women's": {
    whatFor: 'A blood-based tumour-marker screen used to flag areas worth a closer look in women.',
    angles: [
      'Added reassurance beyond a general health check.',
      'Flags areas worth looking into sooner.',
      'Valuable peace of mind, especially with a family history.',
    ],
  },
  'Diabetes Screening': {
    whatFor: 'Checks blood-sugar control to flag diabetes or pre-diabetes risk.',
    angles: [
      'Know whether your blood sugar is in a healthy range.',
      'Catch diabetes or pre-diabetes early, when it’s most manageable.',
      'Especially worthwhile with family history or a high-sugar lifestyle.',
    ],
  },
  'Advanced Diabetes Screening': {
    whatFor: 'A deeper look at blood sugar and insulin — catches early insulin resistance before standard glucose shifts.',
    angles: [
      'Catch early insulin resistance before sugar levels change.',
      'Understand energy dips, cravings and weight struggles.',
      'Act earlier on your metabolic health.',
    ],
  },
  'Respiratory Allergy Test': {
    whatFor: 'Identifies common airborne allergy triggers — dust, pollen, pets, mould.',
    angles: [
      'Find out exactly what triggers your sneezing or congestion.',
      'Stop guessing and avoid the right triggers.',
      'Helpful for ongoing or seasonal symptoms.',
    ],
  },
  'Food Allergy Test': {
    whatFor: 'Tests for true (IgE) food-allergy reactions.',
    angles: [
      'Identify which foods cause real allergic reactions.',
      'Eat with confidence knowing what to avoid.',
      'Clear answers for reactions you’ve noticed.',
    ],
  },
  'Food Intolerance Test': {
    whatFor: 'Screens for food intolerances behind ongoing discomfort — bloating, fatigue — rather than acute allergy.',
    angles: [
      'Find the foods behind ongoing bloating, fatigue or discomfort.',
      'Feel better by removing what doesn’t agree with you.',
      'Useful when the cause isn’t obvious.',
    ],
  },
  'Food Allergy & Intolerance Bundle': {
    whatFor: 'Both the allergy and intolerance tests together — the complete food-reaction picture.',
    angles: [
      'Get the full picture of how your body reacts to foods.',
      'Both allergy and intolerance answers from one appointment.',
      'The clearest route for unexplained gut or skin issues.',
    ],
  },
  'Coeliac Test': {
    whatFor: 'A blood screen for coeliac disease (gluten autoimmunity).',
    angles: [
      'Check whether gluten is harming your gut.',
      'A clear answer if you react to wheat or gluten.',
      'Quick and simple.',
    ],
  },
  'Cortisol Test': {
    whatFor: 'Measures the stress hormone cortisol.',
    angles: [
      'See how stress hormones may be affecting you.',
      'Understand poor sleep, burnout or stubborn weight.',
      'A starting point for managing stress and energy.',
    ],
  },
  'Fasted Glucose Test': {
    whatFor: 'A single fasting blood-sugar reading.',
    angles: [
      'A quick check of your fasting blood sugar.',
      'A simple way to keep an eye on your levels.',
      'Easy routine monitoring.',
    ],
  },
  'Fasted Glucose & Insulin Test': {
    whatFor: 'Fasting glucose plus insulin — shows how hard the body is working to control sugar.',
    angles: [
      'See how hard your body works to control blood sugar.',
      'Catch early insulin resistance before problems appear.',
      'Helpful for weight and metabolic goals.',
    ],
  },
  'Cardiometabolic Risk Profile': {
    whatFor: 'Combined heart and metabolic markers — cholesterol balance, sugar and inflammation.',
    angles: [
      'Understand your heart and metabolic risk together.',
      'See how weight, sugar and cholesterol affect your heart.',
      'Act early if you have risk factors or family history.',
    ],
  },
  'Nutrition, Inflammation & Immune Health Profile': {
    whatFor: 'Vitamins, minerals and inflammation/immune markers — how well-nourished and balanced the body is.',
    angles: [
      'See whether you’re getting the vitamins and minerals you need.',
      'Understand low energy, frequent illness or slow recovery.',
      'Support your fitness and wellbeing with real data.',
    ],
  },
  'Liver Profile': {
    whatFor: 'Liver function and health markers.',
    angles: [
      'Check how well your liver is working.',
      'Reassurance around alcohol, medication or metabolic health.',
      'Catch changes early.',
    ],
  },
  'Kidney & Metabolic Profile': {
    whatFor: 'Kidney function plus related metabolic markers.',
    angles: [
      'Check your kidney function and related markers.',
      'Important with high blood pressure or diabetes.',
      'Peace of mind for a vital organ.',
    ],
  },
  'Thyroid, Hormone & Vitamin Profile': {
    whatFor: 'Thyroid, key hormones and vitamins — common drivers of energy, mood and weight.',
    angles: [
      'Find common causes of tiredness, weight and mood changes.',
      'Check thyroid, hormones and key vitamins in one go.',
      'Answers for symptoms that are easy to overlook.',
    ],
  },
  'Gut Microbiome Test': {
    whatFor: 'Analyses the balance of gut bacteria and digestive health.',
    angles: [
      'Understand your gut bacteria and digestive health.',
      'Get to the root of bloating or IBS-type symptoms.',
      'A modern way to improve how you feel day to day.',
    ],
  },

  // ---- Other Screenings & Consults ----
  'Body Composition Analysis': {
    whatFor: 'Measures body fat, muscle and distribution — beyond just weight.',
    angles: [
      'See your real body fat, muscle and distribution, not just the scale.',
      'Track fitness and weight-goal progress accurately.',
      'A clear starting point for a health plan.',
    ],
  },
  'ECG & Consult': {
    whatFor: 'A heart-rhythm trace with a doctor review.',
    angles: [
      'Check your heart’s rhythm with a doctor’s review.',
      'Reassurance for heart health or before starting exercise.',
      'A familiar, tangible heart check.',
    ],
  },
  'Doctor Consultation': {
    whatFor: 'Dedicated time with a doctor to review results and plan next steps.',
    angles: [
      'Get expert help understanding your results and next steps.',
      'Turn numbers into a clear plan for your health.',
      'Personal guidance from a doctor.',
    ],
  },
  'Travel Fit Assessment': {
    whatFor: 'A fitness-to-travel check with advice.',
    angles: [
      'Make sure you’re fit and ready to travel.',
      'Peace of mind before a big or long trip.',
      'Advice tailored to your journey.',
    ],
  },
  'Seasonal Flu Vaccination': {
    whatFor: 'The annual flu shot.',
    angles: [
      'Protect yourself and your family from seasonal flu.',
      'Quick and simple each year.',
      'Fewer sick days in flu season.',
    ],
  },
  'Hajj & Umrah Vaccination Package (Below 65 years)': {
    whatFor: 'The vaccinations required and recommended for Hajj & Umrah travellers under 65.',
    angles: [
      'Get the vaccinations required and recommended for your pilgrimage.',
      'Travel protected and compliant.',
      'Everything needed in one package.',
    ],
  },
  'Hajj & Umrah Vaccination Package (Above 65 years)': {
    whatFor: 'Pilgrimage vaccinations tailored for travellers over 65.',
    angles: [
      'Age-appropriate pilgrimage vaccinations for over-65 travellers.',
      'Travel protected, with coverage suited to you.',
      'Reassurance for you and your family.',
    ],
  },

  // ---- DNA Insights ----
  'Blood Group Test': {
    whatFor: 'Confirms ABO / Rh blood type.',
    angles: [
      'Know your blood type for records, pregnancy or travel.',
      'Useful information to have on hand.',
      'Quick and simple.',
    ],
  },
  'Cancer Risk - BRCA Genetic Test': {
    whatFor: 'A genetic test for BRCA variants linked to hereditary breast and ovarian cancer risk.',
    angles: [
      'Understand your inherited risk of breast and ovarian cancer.',
      'Especially valuable with a family history.',
      'A one-time test with lifelong insight and doctor support.',
    ],
  },
  'DNA - Hair Loss Package': {
    whatFor: 'Genetic insight into hair-loss tendencies and what may help.',
    angles: [
      'Understand your genetic tendency for hair loss.',
      'Choose prevention and treatments that suit you.',
      'A one-time test you’ll benefit from for years.',
    ],
  },
  'DNA - Acne Package': {
    whatFor: 'Genetic insight into acne tendencies and skin response.',
    angles: [
      'Understand your skin’s genetic tendencies for acne.',
      'Guide skincare choices with real insight.',
      'Stop the trial-and-error on products.',
    ],
  },
  'DNA - Ancestry': {
    whatFor: 'An ancestry and heritage breakdown from your DNA.',
    angles: [
      'Discover your heritage and where your family comes from.',
      'A fascinating, personal insight.',
      'A memorable gift idea.',
    ],
  },
  'DNA - Essentials': {
    whatFor: 'A starter DNA panel covering key health-relevant traits.',
    angles: [
      'A simple introduction to your health-related genetics.',
      'Learn key traits that affect your health.',
      'One test, insights for life.',
    ],
  },
  'DNA - All of You': {
    whatFor: 'Our most complete DNA panel — health, traits and wellness insights in one.',
    angles: [
      'Your most complete genetic picture — health, traits and wellness.',
      'Personalise your health choices to your DNA.',
      'One test, a lifetime of insight.',
    ],
  },

  // ---- Comprehensive Packages / Bundles ----
  'Healthy Heart Package': {
    whatFor: 'A focused cardiovascular bundle — heart and metabolic markers with the relevant checks.',
    angles: [
      'A focused check of your heart and metabolic health.',
      'Act early if you worry about heart health or family history.',
      'Everything for your heart in one package.',
    ],
  },
  "Women's Clarity Package": {
    whatFor: "A women's-health bundle covering hormones, vitamins and general markers.",
    angles: [
      'Understand your hormones, vitamins and general health as a woman.',
      'Answers for energy, mood and cycle concerns.',
      'A clear picture of how your body is doing.',
    ],
  },
  "Essentials Men's Package": {
    whatFor: 'A well-rounded starter bundle for men.',
    angles: [
      'A well-rounded health check for men in one bundle.',
      'Covers the important bases in a single package.',
      'A thorough, good-value place to start.',
    ],
  },
  "Essentials Women's Package": {
    whatFor: 'A well-rounded starter bundle for women.',
    angles: [
      'A well-rounded health check for women in one bundle.',
      'Covers the important bases in a single package.',
      'A thorough, good-value place to start.',
    ],
  },
  "All of You Men's Package": {
    whatFor: 'A comprehensive men’s bundle combining broad screening with DNA insights.',
    angles: [
      'Combine a broad health check with genetic insights.',
      'Understand both your current health and your DNA.',
      'A comprehensive view in one package.',
    ],
  },
  "All of You Women's Package": {
    whatFor: 'A comprehensive women’s bundle combining broad screening with DNA insights.',
    angles: [
      'Combine a broad health check with genetic insights.',
      'Understand both your current health and your DNA.',
      'A comprehensive view in one package.',
    ],
  },
  "Ultimate Men's Longevity Package": {
    whatFor: 'Our top-tier men’s package — the most complete screening plus DNA and a longevity focus.',
    angles: [
      'Our most complete men’s package — screening, DNA and longevity.',
      'Everything, done thoroughly, for your long-term health.',
      'For those who want the complete picture.',
    ],
  },
  "Ultimate Women's Longevity Package": {
    whatFor: 'Our top-tier women’s package — the most complete screening plus DNA and a longevity focus.',
    angles: [
      'Our most complete women’s package — screening, DNA and longevity.',
      'Everything, done thoroughly, for your long-term health.',
      'For those who want the complete picture.',
    ],
  },
  "Executive Men's Health Package": {
    whatFor: 'A premium, time-efficient executive health check for men.',
    angles: [
      'Thorough health insight that respects a busy schedule.',
      'A premium, time-efficient experience.',
      'Comprehensive care without the wait.',
    ],
  },
  "Executive Women's Health Package": {
    whatFor: 'A premium, time-efficient executive health check for women.',
    angles: [
      'Thorough health insight that respects a busy schedule.',
      'A premium, time-efficient experience.',
      'Comprehensive care without the wait.',
    ],
  },
  'Ultimate Gut Health Package': {
    whatFor: 'A complete gut-focused bundle built around the microbiome and digestive markers.',
    angles: [
      'A complete look at your gut and digestive health.',
      'Get to the root of digestive issues and feel better.',
      'Everything for gut health in one package.',
    ],
  },
  "Dubai It Men's Package": {
    whatFor: 'A signature all-in men’s package — broad screening with premium extras.',
    angles: [
      'Our signature all-in health experience for men.',
      'Broad screening plus premium extras in one package.',
      'The complete, premium choice.',
    ],
  },
  "Dubai It Women's Package": {
    whatFor: 'A signature all-in women’s package — broad screening with premium extras.',
    angles: [
      'Our signature all-in health experience for women.',
      'Broad screening plus premium extras in one package.',
      'The complete, premium choice.',
    ],
  },

  // ---- Synthetic suggestion (built at runtime) ----
  "HEALTHMAXXING Men's Package": {
    whatFor: 'The most complete optimisation package for men: a full-body screen with DNA and wellness testing combined.',
    angles: [
      'The most thorough health picture we can offer.',
      'Screening, genetics and wellness, all in one.',
      'For those who want to leave nothing unchecked.',
    ],
  },
  "HEALTHMAXXING Women's Package": {
    whatFor: 'The most complete optimisation package for women: a full-body screen with DNA and wellness testing combined.',
    angles: [
      'The most thorough health picture we can offer.',
      'Screening, genetics and wellness, all in one.',
      'For those who want to leave nothing unchecked.',
    ],
  },
}

export function pitchNote(name: string): PitchNote | undefined {
  return PITCH_NOTES[name]
}
