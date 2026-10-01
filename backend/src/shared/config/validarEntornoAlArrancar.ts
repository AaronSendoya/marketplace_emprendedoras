import { getEnv } from "./env";

// Solo Node.js (usa process.exit): por eso vive aparte de instrumentation.ts, que Next también
// compila para el runtime edge.
export function validarEntornoAlArrancar(): void {
  try {
    getEnv();
  } catch (error) {
    // En producción un servidor mal configurado no puede quedar en pie respondiendo 500: se detiene
    // con un mensaje claro para que el hosting lo marque como caído (regla 17). El mensaje de
    // EnvError nunca lleva los valores. En desarrollo se relanza, para verlo en pantalla.
    if (process.env.NODE_ENV === "production") {
      process.stderr.write(`${error instanceof Error ? error.message : "Configuración de entorno inválida."}\n`);
      process.exit(1);
    }
    throw error;
  }
}
