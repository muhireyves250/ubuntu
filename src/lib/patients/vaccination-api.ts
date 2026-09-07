import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

export interface Vaccination {
  id: string;
  pregnancyId: string;
  vaccineName: string;
  dosage: string;
  dateTaken: string;
  administeredByName: string;
  createdAt: string;
}

interface BackendVaccination {
  id: string;
  pregnancyId: string;
  vaccineName: string;
  dosage: string;
  dateTaken: string;
  createdAt: string;
  administeredBy: { id: string; firstName: string; lastName: string };
}

function toFrontendVaccination(v: BackendVaccination): Vaccination {
  return {
    id: v.id,
    pregnancyId: v.pregnancyId,
    vaccineName: v.vaccineName,
    dosage: v.dosage,
    dateTaken: v.dateTaken.slice(0, 10),
    administeredByName: `${v.administeredBy.firstName} ${v.administeredBy.lastName}`,
    createdAt: v.createdAt,
  };
}

export async function fetchVaccinationsForPregnancy(pregnancyId: string): Promise<Vaccination[]> {
  const token = getStoredAccessToken();
  const vaccinations = await apiFetch<BackendVaccination[]>(`/vaccinations/${pregnancyId}`, {
    token: token ?? undefined,
  });
  return vaccinations.map(toFrontendVaccination);
}

export async function recordVaccinationApi(data: {
  pregnancyId: string;
  vaccineName?: string;
  dosage: string;
  dateTaken?: string;
}): Promise<Vaccination> {
  const token = getStoredAccessToken();
  const v = await apiFetch<BackendVaccination>("/vaccinations", {
    method: "POST",
    body: data,
    token: token ?? undefined,
  });
  return toFrontendVaccination(v);
}
