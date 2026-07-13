import type { DemoUser, Role } from "./types";

export const DEMO_USERS: DemoUser[] = [
  {
    id: "nurse-uwase",
    name: "Nurse Uwase",
    title: "In charge of ANC",
    facility: "Nyamata Health Center",
    role: "nurse",
    facilityLevel: "hc",
    password: "nurse123",
  },
  {
    id: "nurse-kagame",
    name: "Nurse Kagame",
    title: "In charge of ANC",
    facility: "Bugesera District Hospital",
    role: "nurse",
    facilityLevel: "dh",
    password: "nurse123",
  },
  {
    id: "hc-head-mukamana",
    name: "Dr. Mukamana",
    title: "Head of Health Center",
    facility: "Nyamata Health Center",
    role: "hc_head",
    facilityLevel: "hc",
    password: "hchead123",
  },
  {
    id: "dh-director-niyonsenga",
    name: "Dr. Niyonsenga",
    title: "Clinical Director",
    facility: "Bugesera District Hospital",
    role: "dh_clinical_director",
    facilityLevel: "dh",
    password: "dhdirector123",
  },
  {
    id: "th-gyn-ingabire",
    name: "Dr. Ingabire",
    title: "Gynecologist on call",
    facility: "CHUK Teaching Hospital",
    role: "th_gynecologist",
    facilityLevel: "th",
    password: "thgyn123",
  },
  {
    id: "central-control",
    name: "Central Control Room",
    title: "Server / Control Room",
    facility: "RBC Central Level",
    role: "central_control",
    facilityLevel: "central",
    password: "central123",
  },
  {
    id: "admin",
    name: "System Admin",
    title: "Administrator",
    facility: "RBC Central Level",
    role: "admin",
    facilityLevel: "central",
    password: "admin123",
  },
];

export function findDemoUserById(id: string): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.id === id);
}

export function findDemoUserByRole(role: Role): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.role === role);
}
