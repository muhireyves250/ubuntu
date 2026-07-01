const ACK_KEY = "ubuntumed.acknowledgedAlerts";

export interface AcknowledgedAlert {
  patientId: string;
  acknowledgedAt: string;
  note: string;
}

let cache: AcknowledgedAlert[] | null = null;
const listeners = new Set<() => void>();

function load(): AcknowledgedAlert[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(ACK_KEY);
    cache = raw ? (JSON.parse(raw) as AcknowledgedAlert[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(items: AcknowledgedAlert[]) {
  window.localStorage.setItem(ACK_KEY, JSON.stringify(items));
}

export function subscribeToAcknowledged(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getAcknowledgedSnapshot(): AcknowledgedAlert[] {
  return load();
}

export function getServerAcknowledgedSnapshot(): AcknowledgedAlert[] {
  return [];
}

export function acknowledgeAlert(patientId: string, note: string) {
  const existing = load().find((a) => a.patientId === patientId);
  if (existing) return;
  cache = [
    ...load(),
    { patientId, acknowledgedAt: new Date().toISOString(), note },
  ];
  save(cache);
  listeners.forEach((l) => l());
}
