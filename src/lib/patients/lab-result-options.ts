// Answer choices for lab results, so lab nurses pick recognised clinical
// values instead of free-typing. Listed with the normal value(s) first.
//
// Two shapes:
// - single-answer tests: one dropdown (RESULT_OPTIONS)
// - panel tests: one dropdown per reading (RESULT_PANELS), saved as a single
//   result string "Reading: value; Reading: value" so the backend and every
//   results view keep working unchanged.
// Every dropdown also offers "Other…" with a free-text box.

export const OTHER_OPTION = "__other__";

export interface SingleResultOptions {
  options: string[];
  /** Values that count as normal; anything else suggests "Abnormal". Omit for tests with no normal (e.g. blood group). */
  normal?: string[];
}

export const RESULT_OPTIONS: Record<string, SingleResultOptions> = {
  "Blood Group": { options: ["A", "B", "AB", "O"] },
  "Rh Factor": { options: ["Positive", "Negative"] },
  "Rhesus Antibody Screen (Coombs Test)": { options: ["Negative", "Positive"], normal: ["Negative"] },
  "HIV Test": { options: ["Negative", "Positive", "Indeterminate"], normal: ["Negative"] },
  "Syphilis (VDRL/RPR)": { options: ["Non-reactive", "Reactive"], normal: ["Non-reactive"] },
  "Hepatitis B (HBsAg)": { options: ["Negative", "Positive", "Indeterminate"], normal: ["Negative"] },
  "Hepatitis C (Anti-HCV)": { options: ["Negative", "Positive", "Indeterminate"], normal: ["Negative"] },
  "Malaria (Blood Smear)": {
    options: [
      "Negative",
      "Positive – P. falciparum",
      "Positive – P. vivax",
      "Positive – P. ovale",
      "Positive – P. malariae",
      "Positive – mixed infection",
    ],
    normal: ["Negative"],
  },
  "Sickle Cell Test": {
    options: ["Negative (HbAA)", "Sickle cell trait (HbAS)", "Sickle cell disease (HbSS)", "Other variant (e.g. HbSC)"],
    normal: ["Negative (HbAA)"],
  },
  "Rubella IgG/IgM": { options: ["Immune", "Non-immune", "Indeterminate"], normal: ["Immune"] },
  "Toxoplasmosis (IgG/IgM)": { options: ["Negative", "Positive", "Indeterminate"], normal: ["Negative"] },
  "Widal Test (Typhoid)": {
    options: ["Negative (below 1:80)", "1:80", "1:160", "1:320", "1:640 or higher"],
    normal: ["Negative (below 1:80)", "1:80"],
  },
  "Urine Protein (Dipstick)": { options: ["Negative", "Trace", "1+", "2+", "3+", "4+"], normal: ["Negative"] },
  "Urine Glucose": { options: ["Negative", "Trace", "1+", "2+", "3+", "4+"], normal: ["Negative"] },
  "Urine Culture & Sensitivity": {
    options: ["No growth", "Growth <10⁵ CFU/mL", "Growth >10⁵ CFU/mL", "Mixed growth – contaminated, repeat sample"],
    normal: ["No growth", "Growth <10⁵ CFU/mL"],
  },
  "Doppler Study": {
    options: ["Normal flow", "Increased resistance", "Absent end-diastolic flow", "Reversed end-diastolic flow"],
    normal: ["Normal flow"],
  },
  "Cardiotocography (CTG)": { options: ["Reactive", "Non-reactive", "Suspicious"], normal: ["Reactive"] },
  "Pap Smear": {
    options: [
      "Normal (NILM)",
      "Inflammation / infection",
      "ASC-US",
      "LSIL",
      "HSIL",
      "Atypical glandular cells",
      "Unsatisfactory sample",
    ],
    normal: ["Normal (NILM)"],
  },
  "COVID-19 Test": { options: ["Negative", "Positive"], normal: ["Negative"] },
  "Tuberculosis (TB) Screening": {
    options: ["Negative", "Positive", "Presumptive – refer for testing"],
    normal: ["Negative"],
  },
};

export interface PanelReading {
  label: string;
  options: string[];
  normal: string[];
}

const DIPSTICK = ["Negative", "Trace", "1+", "2+", "3+"];

export const RESULT_PANELS: Record<string, PanelReading[]> = {
  "Urine Analysis": [
    { label: "Colour", options: ["Pale yellow", "Yellow", "Dark yellow", "Amber", "Red / bloody", "Brown"], normal: ["Pale yellow", "Yellow"] },
    { label: "Appearance", options: ["Clear", "Slightly cloudy", "Cloudy", "Turbid"], normal: ["Clear"] },
    { label: "pH", options: ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5"], normal: ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5"] },
    { label: "Specific gravity", options: ["1.005", "1.010", "1.015", "1.020", "1.025", "1.030"], normal: ["1.005", "1.010", "1.015", "1.020", "1.025", "1.030"] },
    { label: "Protein", options: [...DIPSTICK, "4+"], normal: ["Negative"] },
    { label: "Glucose", options: [...DIPSTICK, "4+"], normal: ["Negative"] },
    { label: "Ketones", options: ["Negative", "Trace", "Small (1+)", "Moderate (2+)", "Large (3+)"], normal: ["Negative"] },
    { label: "Blood", options: DIPSTICK, normal: ["Negative"] },
    { label: "Leukocytes", options: DIPSTICK, normal: ["Negative"] },
    { label: "Nitrite", options: ["Negative", "Positive"], normal: ["Negative"] },
    { label: "Bilirubin", options: ["Negative", "1+", "2+", "3+"], normal: ["Negative"] },
    { label: "Urobilinogen", options: ["Normal", "2 mg/dL", "4 mg/dL", "8 mg/dL"], normal: ["Normal"] },
  ],
  "Urine Microscopy": [
    { label: "Pus cells (/hpf)", options: ["0–5", "6–10", "11–20", "More than 20", "Packed"], normal: ["0–5"] },
    { label: "Red cells (/hpf)", options: ["0–2", "3–5", "6–10", "More than 10"], normal: ["0–2"] },
    { label: "Epithelial cells", options: ["Few", "Moderate", "Many"], normal: ["Few", "Moderate"] },
    { label: "Casts", options: ["None seen", "Hyaline", "Granular", "Red cell casts", "White cell casts"], normal: ["None seen", "Hyaline"] },
    { label: "Crystals", options: ["None seen", "Calcium oxalate", "Uric acid", "Triple phosphate", "Amorphous"], normal: ["None seen", "Amorphous"] },
    { label: "Bacteria", options: ["None seen", "Few", "Moderate", "Many"], normal: ["None seen", "Few"] },
    { label: "Yeast cells", options: ["None seen", "Present"], normal: ["None seen"] },
    { label: "Trichomonas", options: ["Not seen", "Seen"], normal: ["Not seen"] },
  ],
  "Stool Analysis (Ova & Parasites)": [
    { label: "Consistency", options: ["Formed", "Soft", "Loose", "Watery", "Mucoid", "Bloody"], normal: ["Formed", "Soft"] },
    {
      label: "Ova / parasites",
      options: [
        "None seen",
        "Ascaris lumbricoides",
        "Hookworm",
        "Trichuris trichiura",
        "Entamoeba histolytica",
        "Giardia lamblia",
        "Schistosoma mansoni",
        "Strongyloides stercoralis",
        "Taenia spp.",
      ],
      normal: ["None seen"],
    },
    { label: "Occult blood", options: ["Negative", "Positive"], normal: ["Negative"] },
  ],
};

/** "Colour: Yellow; Protein: Trace" -> { Colour: "Yellow", Protein: "Trace" } */
export function parsePanelResult(result: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const part of result.split("; ")) {
    const at = part.indexOf(": ");
    if (at > 0) values[part.slice(0, at)] = part.slice(at + 2);
  }
  return values;
}

export function formatPanelResult(panel: PanelReading[], values: Record<string, string>): string {
  return panel
    .filter((reading) => values[reading.label])
    .map((reading) => `${reading.label}: ${values[reading.label]}`)
    .join("; ");
}

/** True when the result contains a value outside the normal list (unknown for tests without one). */
export function isAbnormalResult(testName: string, result: string): boolean | null {
  const panel = RESULT_PANELS[testName];
  if (panel) {
    const values = parsePanelResult(result);
    return panel.some((reading) => values[reading.label] && !reading.normal.includes(values[reading.label]));
  }
  const single = RESULT_OPTIONS[testName];
  if (single?.normal && result) return !single.normal.includes(result);
  return null;
}
