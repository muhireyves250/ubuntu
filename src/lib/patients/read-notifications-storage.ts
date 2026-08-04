const READ_KEY = "ubuntumed.readNotifications";

let cache: Set<string> | null = null;
const listeners = new Set<() => void>();

function load(): Set<string> {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function save(ids: Set<string>) {
  window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function subscribeToReadNotifications(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getReadNotificationsSnapshot(): Set<string> {
  return load();
}

export function getServerReadNotificationsSnapshot(): Set<string> {
  return new Set();
}

export function markNotificationRead(id: string) {
  const current = load();
  if (current.has(id)) return;
  cache = new Set(current).add(id);
  save(cache);
  listeners.forEach((l) => l());
}
