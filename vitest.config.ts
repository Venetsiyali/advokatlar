import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit testlar faqat src/ ichida; e2e/ — Playwright (npm run test:e2e)
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
