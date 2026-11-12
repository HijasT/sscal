/**
 * Plain-language package overviews for the Sale Assistant information button.
 * Describe the broad screening areas and procedures included, not individual
 * biomarker definitions. Those belong exclusively in Marker Insights.
 * Kept separate from the upstream-synced catalogue so refreshes preserve copy.
 */
import type { CatalogueService } from './catalogueUtils'

export const PACKAGE_SUMMARIES: Record<string, string> = {
  "Household Domestic Health Screening": "Includes a basic blood health screen, vital signs and the assessment components used for domestic-worker screening.",
  "Standard Health Screening": "Includes general blood screening, blood counts, cholesterol, blood sugar, vital signs and a doctor consultation.",
  "Premium Health Screening": "Includes a broader general blood screen covering metabolic health, liver, kidney, thyroid and nutritional screening, with vital signs and a doctor consultation.",
  "Premium PLUS Women's Health Screening": "Includes comprehensive general health screening with additional women's health and hormone-related assessments, vital signs and a doctor consultation.",
  "Premium PLUS Men's Health Screening": "Includes comprehensive general health screening with additional men's health assessments, vital signs and a doctor consultation.",
  "Longevity Profile": "Includes blood screening across metabolic, cardiovascular, inflammation and healthy-ageing related areas, plus vital signs and a doctor consultation.",
  "Cancer Risk Profile - Men": "Includes a blood-based tumour-marker profile for men, vital signs and a doctor consultation. It is not a stand-alone cancer diagnosis.",
  "Cancer Risk Profile - Women's": "Includes a blood-based tumour-marker profile for women, vital signs and a doctor consultation. It is not a stand-alone cancer diagnosis.",
  "Diabetes Screening": "Includes a blood-sugar screening profile, vital signs and a doctor consultation.",
  "Advanced Diabetes Screening": "Includes extended blood-sugar and insulin-related screening, vital signs and a doctor consultation.",
  "Respiratory Allergy Test": "Includes a blood-based respiratory allergy panel covering common environmental allergen groups, vital signs and a doctor consultation.",
  "Food Allergy Test": "Includes a blood-based food allergy panel covering selected foods and food groups, vital signs and a doctor consultation.",
  "Food Intolerance Test": "Includes a blood-based food-response panel covering selected food groups, vital signs and a doctor consultation. Results require clinical interpretation.",
  "Food Allergy & Intolerance Bundle": "Includes both food allergy and food-response panels across a broad range of foods, with vital signs and a doctor consultation.",
  "Coeliac Test": "Includes blood screening for coeliac disease and a doctor consultation.",
  "Cortisol Test": "Includes a blood test for the body's stress-hormone profile and a doctor consultation.",
  "Fasted Glucose Test": "Includes a fasting blood-sugar test and a doctor consultation.",
  "Fasted Glucose & Insulin Test": "Includes fasting blood-sugar and insulin testing with a doctor consultation.",
  "Blood Group Test": "Includes blood grouping and Rhesus factor testing.",
  "Cardiometabolic Risk Profile": "Includes heart-health, cholesterol, blood-sugar and inflammation-related screening, with vital signs and a doctor consultation.",
  "Nutrition, Inflammation & Immune Health Profile": "Includes blood screening of nutritional status, vitamins, minerals, inflammation and immune-health indicators, with vital signs and a doctor consultation.",
  "Liver Profile": "Includes a blood-based liver health profile, vital signs and a doctor consultation.",
  "Kidney & Metabolic Profile": "Includes blood-based kidney function and metabolic health screening, vital signs and a doctor consultation.",
  "Thyroid, Hormone & Vitamin Profile": "Includes thyroid, hormone and vitamin screening through blood tests, with vital signs and a doctor consultation.",
  "Gut Microbiome Test": "Includes a gut microbiome sample kit, body composition assessment, vital signs and a doctor consultation.",
  "Body Composition Analysis": "Includes a body composition assessment measuring overall body fat and muscle-related composition.",
  "ECG": "Includes an electrocardiogram, vital signs and a doctor consultation.",
  "Doctor Consultation": "Includes a doctor consultation and vital signs assessment.",
  "Travel Fit Assessment": "Includes a travel-fitness assessment with a doctor consultation and vital signs.",
  "Seasonal Flu Vaccination": "Includes an influenza vaccination and a vital signs assessment.",
  "Hajj & Umrah Vaccination Package (Below 65 years)": "Includes influenza and meningococcal vaccinations with a vital signs assessment.",
  "Hajj & Umrah Vaccination Package (Above 65 years)": "Includes influenza, meningococcal and pneumococcal vaccinations with a vital signs assessment.",
  "Cancer Risk - BRCA Genetic Test": "Includes a blood-based BRCA hereditary cancer-risk genetic panel, consent process, vital signs and a doctor consultation.",
  "DNA - Hair Loss Package": "Includes a hair-related genetic screening panel, swab collection, a questionnaire, blood testing, vital signs and a doctor consultation.",
  "DNA - Acne Package": "Includes an acne-related genetic screening panel, swab collection, a questionnaire, blood testing, vital signs and a doctor consultation.",
  "DNA - Ancestry": "Includes ancestry-related genetic analysis using a swab sample and questionnaire.",
  "DNA - Essentials": "Includes a genetic screening package covering nutrition, cardiovascular, skin, traits, autoimmune and metabolic areas, with swab collection and a questionnaire.",
  "DNA - All of You": "Includes a broad genetic profile spanning nutrition, wellness, fitness, traits, ancestry and medication-response areas, with swab collection and a questionnaire.",
  "Healthy Heart Package": "Includes heart and metabolic blood screening, genetic insights, ECG, body composition assessment, vital signs and a doctor consultation.",
  "Women's Clarity Package": "Includes comprehensive women's blood screening, wellness-related genetic insights, body composition assessment, vital signs and a doctor consultation.",
  "Essentials Men's Package": "Includes comprehensive men's blood screening alongside genetic wellness insights, vital signs and a doctor consultation.",
  "Essentials Women's Package": "Includes comprehensive women's blood screening alongside genetic wellness insights, vital signs and a doctor consultation.",
  "All of You Men's Package": "Includes comprehensive men's blood screening with an extended genetic profile covering wellness, lifestyle and ancestry, plus vital signs and a doctor consultation.",
  "All of You Women's Package": "Includes comprehensive women's blood screening with an extended genetic profile covering wellness, lifestyle and ancestry, plus vital signs and a doctor consultation.",
  "Ultimate Men's Longevity Package": "Includes comprehensive men's blood and longevity screening, extended genetic wellness insights, body composition assessment, vital signs and a doctor consultation.",
  "Ultimate Women's Longevity Package": "Includes comprehensive women's blood and longevity screening, extended genetic wellness insights, body composition assessment, vital signs and a doctor consultation.",
  "Executive Men's Health Package": "Includes comprehensive men's blood and cancer-risk screening, BRCA genetic testing, extended genetic insights, ECG, body composition assessment and a doctor consultation.",
  "Executive Women's Health Package": "Includes comprehensive women's blood and cancer-risk screening, BRCA genetic testing, extended genetic insights, ECG, body composition assessment and a doctor consultation.",
  "Ultimate Gut Health Package": "Includes broad food allergy and food-response panels, gut microbiome analysis, genetic wellness insights, body composition assessment and a doctor consultation.",
  "Dubai It Men's Package": "Includes extensive men's blood, longevity, cancer-risk, food and BRCA screening with genetic insights, ECG, body composition assessment and a doctor consultation.",
  "Dubai It Women's Package": "Includes extensive women's blood, longevity, cancer-risk, food and BRCA screening with genetic insights, ECG, body composition assessment and a doctor consultation.",
  "HEALTHMAXXING Men's Package": "Combines the men's Dubai It screening package with additional wellness assessments, including gut microbiome testing, for a broad screening overview.",
  "HEALTHMAXXING Women's Package": "Combines the women's Dubai It screening package with additional wellness assessments, including gut microbiome testing, for a broad screening overview."
}

export function packageSummary(service: CatalogueService): string {
  return PACKAGE_SUMMARIES[service.name] ??
    `Includes ${service.panels.length ? service.panels.join(', ') : service.components?.join(', ') ?? 'the listed assessments'}. See package details for the complete contents.`
}
