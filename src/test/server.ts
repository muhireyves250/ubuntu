import { setupServer } from "msw/node";

/** Fake API for tests. Add handlers per test with `server.use(...)`. */
export const server = setupServer();
export const API_URL = "http://localhost:4000/api";

/** Wraps a payload the way the API does. */
export function envelope<T>(data: T, statusCode = 200) {
  return { data, message: "OK", statusCode, timestamp: "2026-01-01T00:00:00.000Z" };
}
