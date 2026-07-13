import type { Patient, Visit, Referral, Pregnancy } from "./types";
import { SEED_PATIENTS, SEED_VISITS, SEED_PREGNANCIES } from "./seed-data";

const PATIENTS_KEY = "ubuntumed.patients";
const VISITS_KEY = "ubuntumed.visits";
const REFERRALS_KEY = "ubuntumed.referrals";
const PREGNANCIES_KEY = "ubuntumed.pregnancies";

let patientsCache: Patient[] | null = null;
let visitsCache: Visit[] | null = null;
let referralsCache: Referral[] | null = null;
let pregnanciesCache: Pregnancy[] | null = null;

const patientListeners = new Set<() => void>();
const visitListeners = new Set<() => void>();
const referralListeners = new Set<() => void>();
const pregnancyListeners = new Set<() => void>();

function readList<T>(key: string): T[] | null {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

function writeList<T>(key: string, items: T[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function isCurrentShapePatient(patient: Patient): boolean {
  return (
    typeof patient.nationalId === "string" &&
    typeof patient.address === "object" &&
    patient.address !== null &&
    typeof patient.emergencyContact === "object" &&
    patient.emergencyContact !== null
  );
}

function isCurrentShapeVisit(visit: Visit): boolean {
  return typeof visit.pregnancyId === "string" && typeof visit.type === "string";
}

function isCurrentShapePregnancy(pregnancy: Pregnancy): boolean {
  return typeof pregnancy.status === "string" && typeof pregnancy.startDate === "string";
}

function loadPatients(): Patient[] {
  if (patientsCache) return patientsCache;
  const stored = readList<Patient>(PATIENTS_KEY);
  const usable = stored && stored.every(isCurrentShapePatient) ? stored : null;
  patientsCache = usable ?? SEED_PATIENTS;
  if (!usable) writeList(PATIENTS_KEY, patientsCache);
  return patientsCache;
}

function loadVisits(): Visit[] {
  if (visitsCache) return visitsCache;
  const stored = readList<Visit>(VISITS_KEY);
  const usable = stored && stored.every(isCurrentShapeVisit) ? stored : null;
  visitsCache = usable ?? SEED_VISITS;
  if (!usable) writeList(VISITS_KEY, visitsCache);
  return visitsCache;
}

function loadReferrals(): Referral[] {
  if (referralsCache) return referralsCache;
  const stored = readList<Referral>(REFERRALS_KEY);
  referralsCache = stored ?? [];
  if (!stored) writeList(REFERRALS_KEY, referralsCache);
  return referralsCache;
}

function loadPregnancies(): Pregnancy[] {
  if (pregnanciesCache) return pregnanciesCache;
  const stored = readList<Pregnancy>(PREGNANCIES_KEY);
  const usable = stored && stored.every(isCurrentShapePregnancy) ? stored : null;
  pregnanciesCache = usable ?? SEED_PREGNANCIES;
  if (!usable) writeList(PREGNANCIES_KEY, pregnanciesCache);
  return pregnanciesCache;
}

export function subscribeToPatients(onChange: () => void) {
  patientListeners.add(onChange);
  return () => patientListeners.delete(onChange);
}

export function subscribeToVisits(onChange: () => void) {
  visitListeners.add(onChange);
  return () => visitListeners.delete(onChange);
}

export function subscribeToReferrals(onChange: () => void) {
  referralListeners.add(onChange);
  return () => referralListeners.delete(onChange);
}

export function subscribeToPregnancies(onChange: () => void) {
  pregnancyListeners.add(onChange);
  return () => pregnancyListeners.delete(onChange);
}

export function getPatientsSnapshot(): Patient[] {
  return loadPatients();
}

export function getVisitsSnapshot(): Visit[] {
  return loadVisits();
}

export function getReferralsSnapshot(): Referral[] {
  return loadReferrals();
}

export function getPregnanciesSnapshot(): Pregnancy[] {
  return loadPregnancies();
}

export function getServerPatientsSnapshot(): Patient[] {
  return [];
}

export function getServerVisitsSnapshot(): Visit[] {
  return [];
}

export function getServerReferralsSnapshot(): Referral[] {
  return [];
}

export function getServerPregnanciesSnapshot(): Pregnancy[] {
  return [];
}

export function addPatient(patient: Patient) {
  patientsCache = [...loadPatients(), patient];
  writeList(PATIENTS_KEY, patientsCache);
  patientListeners.forEach((listener) => listener());
}

export function addVisit(visit: Visit) {
  visitsCache = [...loadVisits(), visit];
  writeList(VISITS_KEY, visitsCache);
  visitListeners.forEach((listener) => listener());
}

export function addReferral(referral: Referral) {
  referralsCache = [...loadReferrals(), referral];
  writeList(REFERRALS_KEY, referralsCache);
  referralListeners.forEach((listener) => listener());
}

export function addPregnancy(pregnancy: Pregnancy) {
  pregnanciesCache = [...loadPregnancies(), pregnancy];
  writeList(PREGNANCIES_KEY, pregnanciesCache);
  pregnancyListeners.forEach((listener) => listener());
}

export function updatePregnancy(pregnancyId: string, updates: Partial<Pregnancy>) {
  pregnanciesCache = loadPregnancies().map((p) =>
    p.id === pregnancyId ? { ...p, ...updates } : p,
  );
  writeList(PREGNANCIES_KEY, pregnanciesCache);
  pregnancyListeners.forEach((listener) => listener());
}

export function updatePatient(
  patientId: string,
  updates: Partial<Omit<Patient, "id" | "registeredAt">>,
) {
  patientsCache = loadPatients().map((p) =>
    p.id === patientId ? { ...p, ...updates } : p,
  );
  writeList(PATIENTS_KEY, patientsCache);
  patientListeners.forEach((listener) => listener());
}
