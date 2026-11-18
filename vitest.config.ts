import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: { NEXT_PUBLIC_API_URL: "http://localhost:4000/api" },
  },
});
