import type { Patient, Visit, Referral, Pregnancy, Recommendation, FollowUpAssignment } from "./types";
import { SEED_PATIENTS, SEED_VISITS, SEED_PREGNANCIES } from "./seed-data";

const PATIENTS_KEY = "ubuntumed.patients";
const VISITS_KEY = "ubuntumed.visits";
const REFERRALS_KEY = "ubuntumed.referrals";
const PREGNANCIES_KEY = "ubuntumed.pregnancies";
const RECOMMENDATIONS_KEY = "ubuntumed.recommendations";
const FOLLOWUP_ASSIGNMENTS_KEY = "ubuntumed.followUpAssignments";

let patientsCache: Patient[] | null = null;
let visitsCache: Visit[] | null = null;
let referralsCache: Referral[] | null = null;
let pregnanciesCache: Pregnancy[] | null = null;
let recommendationsCache: Recommendation[] | null = null;
let followUpAssignmentsCache: FollowUpAssignment[] | null = null;

const patientListeners = new Set<() => void>();
const visitListeners = new Set<() => void>();
const referralListeners = new Set<() => void>();
const pregnancyListeners = new Set<() => void>();
const recommendationListeners = new Set<() => void>();
const followUpAssignmentListeners = new Set<() => void>();

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

function isCurrentShapeReferral(referral: Referral): boolean {
  return (
    typeof referral.createdAt === "string" &&
    typeof referral.referredByNurse === "string" &&
    typeof referral.referredByNurseId === "string" &&
    typeof referral.referredByFacility === "string"
  );
}

function loadReferrals(): Referral[] {
  if (referralsCache) return referralsCache;
  const stored = readList<Referral>(REFERRALS_KEY);
  const usable = stored && stored.every(isCurrentShapeReferral) ? stored : null;
  referralsCache = usable ?? [];
  if (!usable) writeList(REFERRALS_KEY, referralsCache);
  return referralsCache;
}

function isCurrentShapeRecommendation(rec: Recommendation): boolean {
  return (
    typeof rec.createdAt === "string" &&
    typeof rec.createdByGynecologist === "string" &&
    typeof rec.message === "string"
  );
}

function loadRecommendations(): Recommendation[] {
  if (recommendationsCache) return recommendationsCache;
  const stored = readList<Recommendation>(RECOMMENDATIONS_KEY);
  const usable = stored && stored.every(isCurrentShapeRecommendation) ? stored : null;
  recommendationsCache = usable ?? [];
  if (!usable) writeList(RECOMMENDATIONS_KEY, recommendationsCache);
  return recommendationsCache;
}

function isCurrentShapeFollowUpAssignment(assignment: FollowUpAssignment): boolean {
  return (
    typeof assignment.createdAt === "string" &&
    typeof assignment.assignedToChwId === "string" &&
    typeof assignment.dueDate === "string"
  );
}

function loadFollowUpAssignments(): FollowUpAssignment[] {
  if (followUpAssignmentsCache) return followUpAssignmentsCache;
  const stored = readList<FollowUpAssignment>(FOLLOWUP_ASSIGNMENTS_KEY);
  const usable = stored && stored.every(isCurrentShapeFollowUpAssignment) ? stored : null;
  followUpAssignmentsCache = usable ?? [];
  if (!usable) writeList(FOLLOWUP_ASSIGNMENTS_KEY, followUpAssignmentsCache);
  return followUpAssignmentsCache;
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

export function subscribeToRecommendations(onChange: () => void) {
  recommendationListeners.add(onChange);
  return () => recommendationListeners.delete(onChange);
}

export function subscribeToFollowUpAssignments(onChange: () => void) {
  followUpAssignmentListeners.add(onChange);
  return () => followUpAssignmentListeners.delete(onChange);
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

export function getRecommendationsSnapshot(): Recommendation[] {
  return loadRecommendations();
}

export function getFollowUpAssignmentsSnapshot(): FollowUpAssignment[] {
  return loadFollowUpAssignments();
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

export function getServerRecommendationsSnapshot(): Recommendation[] {
  return [];
}

export function getServerFollowUpAssignmentsSnapshot(): FollowUpAssignment[] {
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

export function updateVisit(visitId: string, updates: Partial<Visit>) {
  visitsCache = loadVisits().map((v) =>
    v.id === visitId ? { ...v, ...updates } : v,
  );
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

export function updateReferral(referralId: string, updates: Partial<Referral>) {
  referralsCache = loadReferrals().map((r) =>
    r.id === referralId ? { ...r, ...updates } : r,
  );
  writeList(REFERRALS_KEY, referralsCache);
  referralListeners.forEach((listener) => listener());
}

export function addRecommendation(recommendation: Recommendation) {
  recommendationsCache = [...loadRecommendations(), recommendation];
  writeList(RECOMMENDATIONS_KEY, recommendationsCache);
  recommendationListeners.forEach((listener) => listener());
}

export function addFollowUpAssignment(assignment: FollowUpAssignment) {
  followUpAssignmentsCache = [...loadFollowUpAssignments(), assignment];
  writeList(FOLLOWUP_ASSIGNMENTS_KEY, followUpAssignmentsCache);
  followUpAssignmentListeners.forEach((listener) => listener());
}

export function updateRecommendation(id: string, updates: Partial<Recommendation>) {
  recommendationsCache = loadRecommendations().map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  );
  writeList(RECOMMENDATIONS_KEY, recommendationsCache);
  recommendationListeners.forEach((listener) => listener());
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

const CAPACITY_OVERRIDES_KEY = "ubuntumed.capacityOverrides";
let capacityOverridesCache: Record<string, number> | null = null;
const capacityOverrideListeners = new Set<() => void>();

function loadCapacityOverrides(): Record<string, number> {
  if (capacityOverridesCache) return capacityOverridesCache;
  const raw = window.localStorage.getItem(CAPACITY_OVERRIDES_KEY);
  try {
    capacityOverridesCache = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    capacityOverridesCache = {};
  }
  return capacityOverridesCache;
}

export function subscribeToCapacityOverrides(onChange: () => void) {
  capacityOverrideListeners.add(onChange);
  return () => capacityOverrideListeners.delete(onChange);
}

export function getCapacityOverridesSnapshot(): Record<string, number> {
  return loadCapacityOverrides();
}

export function getServerCapacityOverridesSnapshot(): Record<string, number> {
  return {};
}

export function setCapacityOverride(facility: string, max: number) {
  capacityOverridesCache = { ...loadCapacityOverrides(), [facility]: max };
  window.localStorage.setItem(CAPACITY_OVERRIDES_KEY, JSON.stringify(capacityOverridesCache));
  capacityOverrideListeners.forEach((listener) => listener());
}
