import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "tests/seguridad/**/*.test.ts"],
    // Las pruebas de integración necesitan una base real y corren con su propia configuración.
    exclude: ["**/*.integration.test.ts", "node_modules/**"],
  },
});
