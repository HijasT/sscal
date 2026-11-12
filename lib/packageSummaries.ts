/**
 * Plain-language package overviews for the Sale Assistant information button.
 * Describe what each screening includes and the practical insights clients may
 * expect, without individual biomarker definitions or routine visit steps. Those belong exclusively in Marker Insights.
 * Kept separate from the upstream-synced catalogue so refreshes preserve copy.
 */
import type { CatalogueService } from './catalogueUtils'

export const PACKAGE_SUMMARIES: Record<string, string> =  {
  "Household Domestic Health Screening": "A basic health screen covering blood health and relevant general screening areas for domestic-worker medical assessment.",
  "Standard Health Screening": "A general health check covering blood counts, cholesterol and blood sugar to give an overview of everyday health indicators.",
  "Premium Health Screening": "A broader health check covering blood health, metabolism, liver, kidney, thyroid and nutritional status for a more complete overview.",
  "Premium PLUS Women's Health Screening": "An extended women's health screen combining general health, organ function and hormone-related assessments for a broader picture of wellbeing.",
  "Premium PLUS Men's Health Screening": "An extended men's health screen combining general health, organ function and male-specific assessments for a broader picture of wellbeing.",
  "Longevity Profile": "Explores metabolic, heart-health and inflammation-related indicators to provide insight into factors associated with long-term health and ageing.",
  "Cancer Risk Profile - Men": "A blood-based tumour-marker panel for men that may provide additional information during cancer-risk evaluation. It cannot diagnose cancer on its own.",
  "Cancer Risk Profile - Women's": "A blood-based tumour-marker panel for women that may provide additional information during cancer-risk evaluation. It cannot diagnose cancer on its own.",
  "Diabetes Screening": "Checks blood sugar control to help identify possible diabetes or prediabetes.",
  "Advanced Diabetes Screening": "Gives a more detailed look at blood sugar and insulin regulation, including indicators related to insulin resistance.",
  "Respiratory Allergy Test": "Screens for sensitisation to common airborne allergens, including dust, pollen, moulds and animals, to help investigate possible allergy triggers.",
  "Food Allergy Test": "Screens for sensitisation to selected foods and food groups. Results can support an allergy assessment but do not confirm an allergy alone.",
  "Food Intolerance Test": "Examines reported antibody responses to a wide selection of foods. These results alone cannot diagnose food intolerance.",
  "Food Allergy & Intolerance Bundle": "Combines food-allergen sensitisation testing with a broad food-response panel, offering two different views of food-related reactions.",
  "Coeliac Test": "Screens for antibodies associated with coeliac disease to help investigate a possible immune reaction to gluten.",
  "Cortisol Test": "Checks cortisol levels to provide information about the body's stress-hormone activity.",
  "Fasted Glucose Test": "Measures fasting blood sugar to help assess glucose control and possible diabetes risk.",
  "Fasted Glucose & Insulin Test": "Measures fasting glucose and insulin together to help assess how the body regulates blood sugar.",
  "Blood Group Test": "Identifies ABO blood group and Rhesus factor, useful for understanding blood type and transfusion compatibility.",
  "Cardiometabolic Risk Profile": "Brings together cholesterol, blood sugar and inflammation-related screening to provide a broader view of heart and metabolic health.",
  "Nutrition, Inflammation & Immune Health Profile": "Assesses vitamins, minerals, nutritional status and inflammation-related indicators to provide an overview of nutritional and immune-related health.",
  "Liver Profile": "Checks liver-related blood markers to help assess liver health and identify patterns that may need further investigation.",
  "Kidney & Metabolic Profile": "Checks kidney function and related metabolic indicators to provide insight into waste filtration and overall metabolic health.",
  "Thyroid, Hormone & Vitamin Profile": "Assesses thyroid function, selected hormones and vitamin status to provide insight into hormonal and nutritional health.",
  "Gut Microbiome Test": "Examines the composition of gut microorganisms and includes body composition analysis for additional insight into digestive and physical health.",
  "Body Composition Analysis": "Estimates body fat, muscle mass and their distribution to help clients understand body composition beyond their weight alone.",
  "ECG": "Records the heart's electrical activity to show heart rate and rhythm and identify certain electrical abnormalities that may need review.",
  "Doctor Consultation": "A personalised clinical review of health concerns and medical history, with guidance on any appropriate next steps.",
  "Travel Fit Assessment": "Reviews relevant health and travel considerations to assess suitability for the planned journey.",
  "Seasonal Flu Vaccination": "Provides vaccination against seasonal influenza to help reduce the risk of flu and related complications.",
  "Hajj & Umrah Vaccination Package (Below 65 years)": "Covers influenza and meningococcal vaccination for relevant Hajj and Umrah travel protection.",
  "Hajj & Umrah Vaccination Package (Above 65 years)": "Covers influenza, meningococcal and pneumococcal vaccination for relevant Hajj and Umrah travel protection.",
  "Cancer Risk - BRCA Genetic Test": "Examines BRCA-related inherited genetic variants that can increase susceptibility to certain cancers, including breast and ovarian cancer.",
  "DNA - Hair Loss Package": "Explores genetic factors associated with hair health and hair-loss susceptibility to provide personalised insights.",
  "DNA - Acne Package": "Explores genetic factors associated with skin and acne-related traits to provide personalised skin-health insights.",
  "DNA - Ancestry": "Explores inherited genetic patterns to provide insights into ancestry and genetic heritage.",
  "DNA - Essentials": "Explores genetic tendencies across nutrition, heart health, skin, personal traits, autoimmune and metabolic areas for a broad wellness overview.",
  "DNA - All of You": "Provides wider genetic insights across nutrition, fitness, metabolism, skin, traits, ancestry and medication-response tendencies.",
  "Healthy Heart Package": "Combines cardiovascular and metabolic blood screening, genetic insights, ECG heart-rhythm assessment and body composition analysis for a broader heart-health overview.",
  "Women's Clarity Package": "Combines women's general health screening with genetic wellness insights and body composition analysis for a broader view of health and physical composition.",
  "Essentials Men's Package": "Combines a comprehensive men's blood health screen with genetic insights across nutrition, metabolism, cardiovascular health and other wellness areas.",
  "Essentials Women's Package": "Combines a comprehensive women's blood health screen with genetic insights across nutrition, metabolism, cardiovascular health and other wellness areas.",
  "All of You Men's Package": "Combines comprehensive men's blood screening with a wider genetic profile covering nutrition, lifestyle, fitness, health tendencies and ancestry.",
  "All of You Women's Package": "Combines comprehensive women's blood screening with a wider genetic profile covering nutrition, lifestyle, fitness, health tendencies and ancestry.",
  "Ultimate Men's Longevity Package": "Combines men's general and longevity-related blood screening with expanded genetic insights and body composition analysis for a broader health overview.",
  "Ultimate Women's Longevity Package": "Combines women's general and longevity-related blood screening with expanded genetic insights and body composition analysis for a broader health overview.",
  "Executive Men's Health Package": "Combines men's comprehensive and cancer-risk blood screening, inherited BRCA risk assessment, genetic insights, ECG heart-rhythm testing and body composition analysis.",
  "Executive Women's Health Package": "Combines women's comprehensive and cancer-risk blood screening, inherited BRCA risk assessment, genetic insights, ECG heart-rhythm testing and body composition analysis.",
  "Ultimate Gut Health Package": "Combines food allergy and food-response screening, gut microbiome analysis, genetic wellness insights and body composition analysis for a broad digestive-health overview.",
  "Dubai It Men's Package": "Brings together men's comprehensive, longevity, cancer-risk and food-related screening with BRCA genetics, wider genetic insights, ECG heart-rhythm assessment and body composition analysis.",
  "Dubai It Women's Package": "Brings together women's comprehensive, longevity, cancer-risk and food-related screening with BRCA genetics, wider genetic insights, ECG heart-rhythm assessment and body composition analysis.",
  "HEALTHMAXXING Men's Package": "Combines the men's Dubai It screening range with additional gut microbiome and wellness assessments for a broad view of health, genetics and body composition.",
  "HEALTHMAXXING Women's Package": "Combines the women's Dubai It screening range with additional gut microbiome and wellness assessments for a broad view of health, genetics and body composition."
}

export function packageSummary(service: CatalogueService): string {
  return PACKAGE_SUMMARIES[service.name] ??
    `Provides an overview of ${service.category.toLowerCase()} health screening. See package details for the specific assessments included.`
}
