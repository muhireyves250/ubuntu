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
    id: "lab-nurse-mugisha",
    name: "Lab Tech Mugisha",
    title: "Laboratory Nurse",
    facility: "Nyamata Health Center",
    role: "lab_nurse",
    facilityLevel: "hc",
    password: "labnurse123",
  },
];

export function findDemoUserById(id: string): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.id === id);
}

export function findDemoUserByRole(role: Role): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.role === role);
}
