import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas contra una base MySQL real (`catalogo_test`, ver DATABASE_URL_TEST). Se ejecutan con
// `pnpm test:integration`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts", "src/**/*.integration.test.ts"],
    // Aplica las migraciones pendientes a la base de pruebas antes de empezar.
    globalSetup: ["tests/integration/globalSetup.ts"],
    // Comparten una sola base: en paralelo se pisarían entre sí.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
