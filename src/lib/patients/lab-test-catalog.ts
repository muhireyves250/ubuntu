// Standard ANC lab test panel, grouped by category — mirrors the default
// panel names the backend already falls back to when no specific tests are
// requested (see CreateLabRequestDto in Antenatal-api), so a nurse who picks
// from this list and one who leaves it blank end up requesting the same
// standard names. Covers the WHO/Rwanda MOH standard antenatal investigation
// set — blood, urine, screening/imaging, and other common ANC tests.
export const LAB_TEST_CATEGORIES = [
  {
    category: "Blood Test",
    tests: [
      "Hemoglobin (Hb)",
      "Platelets",
      "Complete Blood Count (CBC)",
      "Blood Glucose",
      "Oral Glucose Tolerance Test (OGTT)",
      "Blood Group & Rh Factor",
      "Rhesus Antibody Screen (Coombs Test)",
      "HIV Test",
      "Syphilis (VDRL/RPR)",
      "Hepatitis B (HBsAg)",
      "Hepatitis C (Anti-HCV)",
      "Malaria (Blood Smear)",
      "Sickle Cell Test",
      "Rubella IgG/IgM",
      "Toxoplasmosis (IgG/IgM)",
      "Liver Function Test (LFT)",
      "Kidney Function Test (Creatinine/Urea)",
      "Thyroid Function Test (TSH)",
      "Widal Test (Typhoid)",
    ],
  },
  {
    category: "Urine Test",
    tests: [
      "Urine Analysis",
      "Urine Protein (Dipstick)",
      "Urine Culture & Sensitivity",
      "Urine Microscopy",
      "Urine Glucose",
    ],
  },
  {
    category: "Screening & Imaging",
    tests: [
      "Obstetric Ultrasound",
      "Anomaly (Detailed) Ultrasound Scan",
      "Doppler Study",
      "Cardiotocography (CTG)",
      "Pap Smear",
    ],
  },
  {
    category: "Other",
    tests: [
      "Stool Analysis (Ova & Parasites)",
      "COVID-19 Test",
      "Tuberculosis (TB) Screening",
    ],
  },
] as const;
