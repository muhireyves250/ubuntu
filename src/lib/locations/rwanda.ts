import rwandaLocations from "./rwanda-locations.json";

// Province -> District -> Sector -> Cell -> Village[]
type RwandaLocationTree = Record<string, Record<string, Record<string, Record<string, string[]>>>>;

const LOCATIONS = rwandaLocations as RwandaLocationTree;

export function getProvinces(): string[] {
  return Object.keys(LOCATIONS).sort();
}

export function getDistricts(province: string): string[] {
  return Object.keys(LOCATIONS[province] ?? {}).sort();
}

export function getSectors(province: string, district: string): string[] {
  return Object.keys(LOCATIONS[province]?.[district] ?? {}).sort();
}

export function getCells(province: string, district: string, sector: string): string[] {
  return Object.keys(LOCATIONS[province]?.[district]?.[sector] ?? {}).sort();
}

export function getVillages(
  province: string,
  district: string,
  sector: string,
  cell: string,
): string[] {
  return [...(LOCATIONS[province]?.[district]?.[sector]?.[cell] ?? [])].sort();
}

export function findProvinceForDistrict(district: string): string | undefined {
  return Object.keys(LOCATIONS).find((province) =>
    Object.prototype.hasOwnProperty.call(LOCATIONS[province], district),
  );
}
