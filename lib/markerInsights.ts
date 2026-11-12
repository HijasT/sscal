/**
 * Short, staff-facing explanations for the 130 clinical blood markers.
 * All keys are existing catalogue names; food/allergy/intolerance entries intentionally
 * have no entry and remain non-interactive. Content is local and makes no network calls.
 */
export interface ClinicalMarkerInsight {
  expansion: string
  description: string
}

export const CLINICAL_MARKER_INSIGHTS: Record<string, ClinicalMarkerInsight> = {
  "% Free PSA": {
    "expansion": "%fPSA",
    "description": "Percentage of prostate-specific antigen that circulates unbound, used to help assess prostate-related risk."
  },
  "Absolute Basophils Count Blood": {
    "expansion": "ABC",
    "description": "Number of basophils, white blood cells involved in allergic and inflammatory responses."
  },
  "Absolute Eosinophils Count Blood": {
    "expansion": "AEC",
    "description": "Number of eosinophils, white blood cells involved in allergies and responses to parasites."
  },
  "Absolute Lymphocyte Count Blood": {
    "expansion": "ALC",
    "description": "Number of lymphocytes, immune cells that help fight infection."
  },
  "Absolute Monocyte Count Blood": {
    "expansion": "AMC",
    "description": "Number of monocytes, white blood cells that help clear germs and damaged cells."
  },
  "Absolute Neutrophil Count": {
    "expansion": "ANC",
    "description": "Number of neutrophils, white blood cells important for fighting infections."
  },
  "AFP (Alpha Fetoprotein)": {
    "expansion": "Alpha-fetoprotein (AFP)",
    "description": "A protein used to monitor certain liver conditions and cancers, including liver cancer."
  },
  "Albumin Serum": {
    "expansion": "ALB",
    "description": "A liver-made blood protein that helps maintain fluid balance and transport substances."
  },
  "Alkaline Phosphatase": {
    "expansion": "ALP — Alkaline phosphatase",
    "description": "An enzyme found mainly in liver, bile ducts and bone."
  },
  "Anti CCP (ACCP)": {
    "expansion": "Anti-cyclic citrullinated peptide antibodies",
    "description": "Antibodies that can help assess suspected rheumatoid arthritis."
  },
  "Apolipoprotein A1(APO-A1)": {
    "expansion": "ApoA1 — Apolipoprotein A1",
    "description": "The main protein in HDL particles, involved in cholesterol transport."
  },
  "Apolipoprotein B (APO-B)": {
    "expansion": "ApoB — Apolipoprotein B",
    "description": "A protein on cholesterol-carrying particles linked to plaque buildup in arteries."
  },
  "Apolipoprotein B/A1 ratio (APO B/APO A1)": {
    "expansion": "ApoB/ApoA1 — Apolipoprotein B to A1 ratio",
    "description": "Compares two lipoprotein proteins to provide information about cardiovascular risk."
  },
  "Average Blood Glucose": {
    "expansion": "eAG — Estimated average glucose",
    "description": "Average blood glucose estimated from HbA1c over roughly two to three months."
  },
  "Basophils": {
    "expansion": "BASO",
    "description": "Percentage of basophils, white blood cells involved in allergic reactions."
  },
  "Beta-hCG (Quantitative)": {
    "expansion": "β-hCG — Beta-human chorionic gonadotropin",
    "description": "A hormone mainly used to detect and monitor pregnancy."
  },
  "Bicarbonate (CO2)": {
    "expansion": "HCO3 — Bicarbonate",
    "description": "An electrolyte that helps maintain the body's acid–base balance."
  },
  "Bilirubin Direct": {
    "expansion": "Conjugated bilirubin",
    "description": "Bilirubin processed by the liver before being released into bile."
  },
  "Bilirubin Indirect": {
    "expansion": "Unconjugated bilirubin",
    "description": "Bilirubin produced from red blood cell breakdown before liver processing."
  },
  "Bilirubin Total": {
    "expansion": "TBIL — Total bilirubin",
    "description": "The total amount of bilirubin, a pigment from red blood cell breakdown."
  },
  "Blood Group": {
    "expansion": "ABO blood group",
    "description": "Identifies whether the blood group is A, B, AB or O."
  },
  "Blood Rhesus Factor": {
    "expansion": "RhD — Rhesus D factor",
    "description": "Identifies the presence or absence of the RhD protein on red blood cells."
  },
  "Blood Urea Nitrogen (BUN)": {
    "expansion": "BUN — Blood urea nitrogen",
    "description": "A protein-metabolism waste marker that helps assess kidney function."
  },
  "BUN/Creatinine Ratio": {
    "expansion": "BUN/Cr — Blood urea nitrogen to creatinine ratio",
    "description": "Compares two waste markers to help interpret kidney-related results."
  },
  "C-peptide": {
    "expansion": "Connecting peptide",
    "description": "Released alongside insulin, helping assess how much insulin the body produces."
  },
  "CA 19-9": {
    "expansion": "Carbohydrate antigen 19-9",
    "description": "A tumour marker mainly used to monitor pancreatic and other gastrointestinal cancers."
  },
  "CA125": {
    "expansion": "Cancer antigen 125",
    "description": "A tumour marker mainly used to monitor ovarian cancer."
  },
  "Calcium": {
    "expansion": "Ca — Calcium",
    "description": "A mineral needed for healthy bones, muscle function and nerve signals."
  },
  "CEA": {
    "expansion": "CEA — Carcinoembryonic antigen",
    "description": "A tumour marker often used to monitor colorectal and certain other cancers."
  },
  "Chloride": {
    "expansion": "Cl — Chloride",
    "description": "An electrolyte that helps control fluid and acid–base balance."
  },
  "Cortisol": {
    "expansion": "",
    "description": "A hormone involved in stress response, metabolism and blood pressure regulation."
  },
  "Creatine Kinase": {
    "expansion": "CK — Creatine kinase",
    "description": "A muscle enzyme that may increase after muscle injury."
  },
  "Creatinine": {
    "expansion": "Cr — Creatinine",
    "description": "A waste product used to assess how well the kidneys filter blood."
  },
  "DHEA-S": {
    "expansion": "Dehydroepiandrosterone sulfate",
    "description": "An adrenal hormone used to assess androgen-related conditions."
  },
  "eGFR": {
    "expansion": "Estimated glomerular filtration rate",
    "description": "A calculated estimate of how well the kidneys filter blood."
  },
  "Eosinophils": {
    "expansion": "EOS",
    "description": "Percentage of eosinophils, white blood cells involved in allergies and parasite responses."
  },
  "ESR": {
    "expansion": "Erythrocyte sedimentation rate",
    "description": "A nonspecific blood marker of inflammation."
  },
  "Estradiol (E2)": {
    "expansion": "E2 — Estradiol",
    "description": "An estrogen hormone involved in reproductive function and bone health."
  },
  "Ferritin": {
    "expansion": "",
    "description": "An iron-storage protein used to assess the body's iron reserves."
  },
  "Folate": {
    "expansion": "Vitamin B9",
    "description": "A vitamin needed to make DNA and healthy red blood cells."
  },
  "Free PSA": {
    "expansion": "fPSA — Free prostate-specific antigen",
    "description": "The unbound form of PSA, used alongside total PSA in prostate assessment."
  },
  "Free Testosterone": {
    "expansion": "Free T",
    "description": "Testosterone circulating without binding to blood proteins."
  },
  "FSH": {
    "expansion": "Follicle-stimulating hormone",
    "description": "A pituitary hormone involved in egg development and sperm production."
  },
  "GGTP Gamma GT": {
    "expansion": "GGT — Gamma-glutamyl transferase",
    "description": "An enzyme used to assess liver and bile duct problems."
  },
  "Growth Hormone (GH)": {
    "expansion": "GH — Growth hormone",
    "description": "A pituitary hormone that regulates growth and metabolism."
  },
  "HbA1c - Glycated Haemoglobin": {
    "expansion": "Glycated haemoglobin",
    "description": "Shows average blood sugar levels over approximately two to three months."
  },
  "HBs Ab titre": {
    "expansion": "Anti-HBs — Hepatitis B surface antibody",
    "description": "Antibodies used to assess immunity against hepatitis B."
  },
  "HBs Ag": {
    "expansion": "HBsAg — Hepatitis B surface antigen",
    "description": "A viral protein that indicates current hepatitis B infection."
  },
  "HCV Ab": {
    "expansion": "Anti-HCV — Hepatitis C virus antibody",
    "description": "Antibodies indicating past exposure; further testing checks for current infection."
  },
  "HDL Cholesterol": {
    "expansion": "HDL — High-density lipoprotein",
    "description": "The cholesterol fraction often called good cholesterol, involved in cholesterol transport."
  },
  "Hematocrit (HCT)": {
    "expansion": "HCT — Haematocrit",
    "description": "Percentage of blood made up of red blood cells."
  },
  "Hemoglobin (Hb)": {
    "expansion": "Hb — Haemoglobin",
    "description": "The protein in red blood cells that carries oxygen."
  },
  "HIV Ab": {
    "expansion": "Human immunodeficiency virus antibody",
    "description": "Antibodies used in HIV screening; reactive results require follow-up testing."
  },
  "HOMA-IR": {
    "expansion": "Homeostatic model assessment of insulin resistance",
    "description": "A calculation using fasting glucose and insulin to estimate insulin resistance."
  },
  "Homocysteine": {
    "expansion": "Hcy",
    "description": "An amino acid; higher levels can be associated with certain nutritional and health conditions."
  },
  "HSCRP C-reactive Protein": {
    "expansion": "hs-CRP — High-sensitivity C-reactive protein",
    "description": "A sensitive inflammation marker that can help refine cardiovascular risk assessment."
  },
  "IGF-1": {
    "expansion": "Insulin-like growth factor 1",
    "description": "A hormone that reflects aspects of growth hormone activity."
  },
  "Insulin (Fasting)": {
    "expansion": "Fasting insulin",
    "description": "Measures insulin after fasting to help assess insulin regulation."
  },
  "LDL Cholesterol": {
    "expansion": "LDL — Low-density lipoprotein",
    "description": "The cholesterol fraction often called bad cholesterol; high levels can promote artery plaque."
  },
  "LDL/HDL Cholesterol Ratio": {
    "expansion": "LDL/HDL ratio",
    "description": "Compares LDL and HDL cholesterol levels as additional lipid-risk information."
  },
  "LH": {
    "expansion": "Luteinising hormone",
    "description": "A pituitary hormone involved in ovulation and testosterone production."
  },
  "Lipase": {
    "expansion": "",
    "description": "An enzyme that digests fats; levels can rise with pancreatic inflammation."
  },
  "Lipoprotein (Lpa)": {
    "expansion": "Lp(a) — Lipoprotein(a)",
    "description": "An inherited cholesterol-carrying particle associated with cardiovascular risk."
  },
  "Lymphocytes": {
    "expansion": "LYM",
    "description": "Percentage of lymphocytes, immune cells that fight infection."
  },
  "Magnesium": {
    "expansion": "Mg — Magnesium",
    "description": "A mineral needed for nerves, muscles and many enzymes."
  },
  "MCH": {
    "expansion": "MCH — Mean corpuscular haemoglobin",
    "description": "Average amount of haemoglobin in each red blood cell."
  },
  "MCHC": {
    "expansion": "MCHC — Mean corpuscular haemoglobin concentration",
    "description": "Average concentration of haemoglobin within red blood cells."
  },
  "MCV": {
    "expansion": "MCV — Mean corpuscular volume",
    "description": "Average size of red blood cells."
  },
  "Monocytes": {
    "expansion": "MONO",
    "description": "Percentage of monocytes, white blood cells involved in immune defence."
  },
  "MPV": {
    "expansion": "MPV — Mean platelet volume",
    "description": "Average size of platelets, which help blood clot."
  },
  "MUMPS-Ab": {
    "expansion": "Mumps antibody",
    "description": "Antibodies to mumps virus; interpretation depends on antibody type."
  },
  "Neutrophils": {
    "expansion": "NEUT",
    "description": "Percentage of neutrophils, white blood cells important in fighting infection."
  },
  "Non-HDL Cholesterol": {
    "expansion": "Non-HDL-C — Non-HDL cholesterol",
    "description": "Total cholesterol minus HDL, representing cholesterol carried in potentially harmful particles."
  },
  "Phosphorus": {
    "expansion": "Phosphate (P)",
    "description": "A mineral important for bones and energy production."
  },
  "Platelet Count": {
    "expansion": "PLT — Platelets",
    "description": "Blood cells that help stop bleeding by forming clots."
  },
  "Progresterone": {
    "expansion": "Progesterone",
    "description": "A hormone involved in the menstrual cycle and pregnancy."
  },
  "Prolactin": {
    "expansion": "PRL — Prolactin",
    "description": "A pituitary hormone that supports breast milk production."
  },
  "Protein Serum": {
    "expansion": "Total protein",
    "description": "Combined level of albumin and globulin proteins in blood."
  },
  "PSA": {
    "expansion": "Prostate-specific antigen",
    "description": "A prostate-produced protein used in prostate health assessment."
  },
  "Blood Glucose (Random or Fasting)": {
    "expansion": "Glucose",
    "description": "Blood sugar level measured when the sample is collected."
  },
  "RBC Count": {
    "expansion": "RBC — Red blood cell count",
    "description": "Number of oxygen-carrying red blood cells."
  },
  "Red Cell Distribution Width - SD (RDW-SD)": {
    "expansion": "RDW-SD — Red cell distribution width, standard deviation",
    "description": "Measures variation in red blood cell size."
  },
  "Red Cell Distribution Width (RDW)": {
    "expansion": "RDW — Red cell distribution width",
    "description": "Measures how much red blood cell sizes vary."
  },
  "RPR": {
    "expansion": "Rapid plasma reagin",
    "description": "A blood test used to screen for and monitor syphilis."
  },
  "Rubella Ab": {
    "expansion": "Rubella antibody",
    "description": "Antibodies to rubella virus; IgG is commonly used to assess immunity."
  },
  "Rubeola- Ab": {
    "expansion": "Rubeola (measles) antibody",
    "description": "Antibodies to measles virus; IgG is commonly used to assess immunity."
  },
  "Serum Albumin / Globulin Ratio": {
    "expansion": "A/G ratio — Albumin to globulin ratio",
    "description": "Compares the two major groups of blood proteins."
  },
  "Serum Amylase": {
    "expansion": "AMY — Amylase",
    "description": "An enzyme that helps digest starch; produced mainly by pancreas and salivary glands."
  },
  "Serum Globulin": {
    "expansion": "GLOB — Globulin",
    "description": "A group of blood proteins involved in immune defence and transport."
  },
  "Serum Iron": {
    "expansion": "Fe — Iron",
    "description": "Iron circulating in blood, mostly attached to transferrin."
  },
  "SGOT (AST)": {
    "expansion": "AST — Aspartate aminotransferase",
    "description": "A liver and muscle enzyme that can increase with tissue damage."
  },
  "SGPT (ALT)": {
    "expansion": "ALT — Alanine aminotransferase",
    "description": "A liver enzyme that can rise when liver cells are damaged."
  },
  "SHBG (Sex Hormone-Binding Globulin)": {
    "expansion": "Sex hormone-binding globulin",
    "description": "A blood protein that binds testosterone and estrogen."
  },
  "Sodium": {
    "expansion": "Na — Sodium",
    "description": "An electrolyte that controls fluid balance and supports nerves and muscles."
  },
  "T3 Total": {
    "expansion": "TT3 — Total triiodothyronine",
    "description": "A thyroid hormone involved in regulating metabolism."
  },
  "T4 Total": {
    "expansion": "TT4 — Total thyroxine",
    "description": "A thyroid hormone involved in regulating metabolism."
  },
  "TB QuantiFERON": {
    "expansion": "IGRA — Interferon-gamma release assay",
    "description": "Measures immune response to tuberculosis proteins, but cannot distinguish active from latent TB."
  },
  "Testosterone Total": {
    "expansion": "Total testosterone",
    "description": "Total amount of testosterone in the blood, both bound and unbound."
  },
  "TGAB": {
    "expansion": "TgAb — Thyroglobulin antibodies",
    "description": "Antibodies sometimes present in autoimmune thyroid disease."
  },
  "TIBC - Total Iron": {
    "expansion": "TIBC — Total iron-binding capacity",
    "description": "Estimates how much iron transferrin in the blood can carry."
  },
  "Tissue Transglutaminase IgA (tTg-IgA)": {
    "expansion": "tTG-IgA — Tissue transglutaminase IgA antibody",
    "description": "An antibody test used to screen for coeliac disease."
  },
  "Total Cholesterol": {
    "expansion": "TC — Total cholesterol",
    "description": "Total amount of cholesterol circulating in blood."
  },
  "Total Cholesterol/HDL Ratio": {
    "expansion": "TC/HDL ratio",
    "description": "Compares total cholesterol with HDL cholesterol."
  },
  "Total IgA": {
    "expansion": "Immunoglobulin A",
    "description": "An immune antibody measured to help interpret IgA-based coeliac tests."
  },
  "Total Leucocyte Count (WBC)": {
    "expansion": "WBC — White blood cell count",
    "description": "Total number of infection-fighting white blood cells."
  },
  "TPOAB": {
    "expansion": "TPOAb — Thyroid peroxidase antibodies",
    "description": "Antibodies often associated with autoimmune thyroid disease."
  },
  "Triglycerides": {
    "expansion": "TG — Triglycerides",
    "description": "Fats in the blood used for energy and storage."
  },
  "TSH": {
    "expansion": "Thyroid-stimulating hormone",
    "description": "A pituitary hormone that tells the thyroid to produce hormones."
  },
  "UIBC- Unsaturated Iron Binding Capacity": {
    "expansion": "UIBC — Unsaturated iron-binding capacity",
    "description": "Measures how much unused iron-binding capacity remains in blood."
  },
  "Urea": {
    "expansion": "",
    "description": "A protein-metabolism waste product removed mainly by the kidneys."
  },
  "Uric Acid": {
    "expansion": "UA — Uric acid",
    "description": "A purine breakdown product; high levels can contribute to gout."
  },
  "Varicella IGG": {
    "expansion": "VZV IgG — Varicella-zoster virus IgG",
    "description": "Antibodies commonly used to assess immunity to chickenpox."
  },
  "Vitamin B12": {
    "expansion": "Cobalamin",
    "description": "Vitamin needed for healthy nerves and red blood cells."
  },
  "Vitamin D Total": {
    "expansion": "25(OH)D — 25-hydroxyvitamin D",
    "description": "Blood marker commonly used to assess vitamin D status."
  },
  "VLDL Cholesterol": {
    "expansion": "VLDL — Very-low-density lipoprotein",
    "description": "Cholesterol carried by particles that mainly transport triglycerides."
  },
  "CA 15-3": {
    "expansion": "Cancer antigen 15-3",
    "description": "A tumour marker mainly used to monitor certain breast cancers."
  },
  "BRCA1": {
    "expansion": "Breast cancer susceptibility gene 1",
    "description": "A DNA-repair gene; certain inherited variants increase breast and ovarian cancer risk."
  },
  "BRCA2": {
    "expansion": "Breast cancer susceptibility gene 2",
    "description": "A DNA-repair gene; certain inherited variants increase risk of several cancers."
  },
  "Free T3": {
    "expansion": "FT3 — Free triiodothyronine",
    "description": "Unbound T3 thyroid hormone available to body tissues."
  },
  "Free T4": {
    "expansion": "FT4 — Free thyroxine",
    "description": "Unbound T4 thyroid hormone used in thyroid function assessment."
  },
  "Zinc": {
    "expansion": "Zn — Zinc",
    "description": "A mineral important for immunity, wound healing and enzymes."
  },
  "NT-proBNP": {
    "expansion": "N-terminal pro-B-type natriuretic peptide",
    "description": "A heart-stress marker used when assessing heart failure."
  },
  "Cystatin C": {
    "expansion": "CysC — Cystatin C",
    "description": "A filtered protein used as another marker of kidney function."
  },
  "GDF-15": {
    "expansion": "Growth differentiation factor 15",
    "description": "A protein associated with cellular stress and inflammation; studied in aging research."
  },
  "Selenium": {
    "expansion": "Se — Selenium",
    "description": "A trace mineral involved in thyroid function and antioxidant enzymes."
  },
  "Omega-3 Index": {
    "expansion": "O3I — Omega-3 index",
    "description": "Proportion of EPA and DHA omega-3 fats in red blood cell membranes."
  },
  "IL-6": {
    "expansion": "Interleukin-6",
    "description": "An immune-signalling protein involved in inflammation."
  },
  "TNF alpha": {
    "expansion": "Tumour necrosis factor alpha",
    "description": "An immune-signalling protein involved in inflammation."
  },
  "Copper": {
    "expansion": "Cu — Copper",
    "description": "A mineral needed for iron metabolism and nerve function."
  },
  "Anti Nuclear Antibodies (ANA)": {
    "expansion": "Antinuclear antibodies",
    "description": "Antibodies that may be present in autoimmune conditions."
  }
}

export function clinicalMarkerInsight(name: string): ClinicalMarkerInsight | undefined {
  return CLINICAL_MARKER_INSIGHTS[name]
}
