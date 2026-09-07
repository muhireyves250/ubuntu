// Shared dropdown option lists for patient registration/edit forms — kept
// in one place so the register and edit modals never drift out of sync.

export const GENDER_OPTIONS = ["Female", "Male"] as const;

export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
] as const;

export const RELATIONSHIP_OPTIONS = [
  "Husband",
  "Wife",
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Other",
] as const;

export const BLOOD_GROUP_OPTIONS = ["A", "B", "AB", "O"] as const;

export const RELIGION_OPTIONS = [
  "Christian",
  "Muslim",
  "Traditional",
  "None",
  "Other",
] as const;

export const INSURANCE_TYPE_OPTIONS = [
  { value: "CBHI", label: "CBHI (Mutuelle de sante)" },
  { value: "RSSB", label: "RSSB" },
  { value: "Private", label: "Private" },
  { value: "None", label: "None / Cash" },
] as const;

export const CHRONIC_CONDITION_OPTIONS = [
  "Hypertension",
  "Diabetes",
  "Heart Disease",
  "HIV",
  "Asthma",
  "Epilepsy",
  "Kidney Disease",
] as const;
