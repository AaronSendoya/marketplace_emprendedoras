import { problemaDeBackendUrl } from "./entorno";

// Solo Node.js (usa process.exit): por eso vive aparte de instrumentation.ts, que Next también compila para el runtime edge.
// Mismo criterio que el backend (src/shared/config/validarEntornoAlArrancar.ts): en producción un servidor mal configurado no
// puede quedar en pie respondiendo errores, se detiene con un mensaje claro para que el hosting lo marque como caído. En
// desarrollo se lanza el error, para verlo en pantalla.
export function validarEntornoAlArrancar(): void {
  const produccion = process.env.NODE_ENV === "production";
  const problema = problemaDeBackendUrl(process.env.BACKEND_URL, produccion);
  if (problema === null) return;

  const mensaje = `Configuración de entorno inválida. Revisa .env.local (referencia: .env.example):\n  - ${problema}`;
  if (produccion) {
    process.stderr.write(`${mensaje}\n`);
    process.exit(1);
  }
  throw new Error(mensaje);
}
