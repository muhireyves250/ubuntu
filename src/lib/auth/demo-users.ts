import type { DemoUser, Role } from "./types";

export const DEMO_USERS: DemoUser[] = [
  {
    id: "nurse-uwase",
    username: "uwase",
    name: "Nurse Uwase",
    title: "In charge of ANC",
    facility: "Nyamata Health Center",
    role: "nurse",
    facilityLevel: "hc",
    password: "nurse123",
  },
  {
    id: "nurse-kagame",
    username: "kagame",
    name: "Nurse Kagame",
    title: "In charge of ANC",
    facility: "Bugesera District Hospital",
    role: "nurse",
    facilityLevel: "dh",
    password: "nurse123",
  },
  {
    id: "gynecologist-mutesi",
    username: "mutesi",
    name: "Dr. Mutesi",
    title: "Gynecologist",
    facility: "Bugesera District Hospital",
    role: "gynecologist",
    facilityLevel: "dh",
    password: "gyn123",
  },
  {
    id: "hospital-admin-niyibizi",
    username: "niyibizi",
    name: "Dr. Niyibizi",
    title: "Hospital Administrator",
    facility: "Bugesera District Hospital",
    role: "hospital_admin",
    facilityLevel: "dh",
    password: "admin123",
  },
  {
    id: "lab-nurse-mugisha",
    username: "mugisha",
    name: "Lab Tech Mugisha",
    title: "Laboratory Nurse",
    facility: "Nyamata Health Center",
    role: "lab_nurse",
    facilityLevel: "hc",
    password: "labnurse123",
  },
  {
    id: "lab-nurse-uwera",
    username: "uwera",
    name: "Lab Tech Uwera",
    title: "Laboratory Nurse",
    facility: "Bugesera District Hospital",
    role: "lab_nurse",
    facilityLevel: "dh",
    password: "labnurse123",
  },
  {
    id: "nurse-ingabire",
    username: "ingabire",
    name: "Nurse Ingabire",
    title: "In charge of ANC",
    facility: "Nyanza District Hospital",
    role: "nurse",
    facilityLevel: "dh",
    password: "nurse123",
  },
  {
    id: "gynecologist-karenzi",
    username: "karenzi",
    name: "Dr. Karenzi",
    title: "Gynecologist",
    facility: "Nyanza District Hospital",
    role: "gynecologist",
    facilityLevel: "dh",
    password: "gyn123",
  },
  {
    id: "hospital-admin-rugamba",
    username: "rugamba",
    name: "Dr. Rugamba",
    title: "Hospital Administrator",
    facility: "Nyanza District Hospital",
    role: "hospital_admin",
    facilityLevel: "dh",
    password: "admin123",
  },
  {
    id: "lab-nurse-uwimana",
    username: "uwimana",
    name: "Lab Tech Uwimana",
    title: "Laboratory Nurse",
    facility: "Nyanza District Hospital",
    role: "lab_nurse",
    facilityLevel: "dh",
    password: "labnurse123",
  },
  {
    id: "chw-mukamana",
    username: "mukamana",
    name: "Mukamana",
    title: "Community Health Worker",
    facility: "Nyamata Health Center",
    village: "Rilima",
    role: "chw",
    facilityLevel: "hc",
    password: "chw123",
  },
];

export function findDemoUserById(id: string): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.id === id);
}

export function findDemoUserByRole(role: Role): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.role === role);
}

export function findDemoUserByUsername(username: string): DemoUser | undefined {
  const normalized = username.trim().toLowerCase();
  return DEMO_USERS.find((user) => user.username.toLowerCase() === normalized);
}
