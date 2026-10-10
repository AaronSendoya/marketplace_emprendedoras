// Regla 17 (transporte cifrado, CLAUDE.md). Sin imports: lo usa `validarEntornoAlArrancar.ts` y lo prueba `entorno.test.ts` con
// el corredor de Node.

// Misma excepción que la regla de TLS hacia MySQL del backend: un host local, para probar el build de producción en el
// computador contra el backend que corre en `http://localhost:3001`.
const HOSTS_LOCALES = ["localhost", "127.0.0.1"];

// Devuelve el problema de `BACKEND_URL` en español, o `null` si es válida. Nunca copia el valor recibido en el mensaje: una URL
// puede llevar usuario y contraseña.
export function problemaDeBackendUrl(valor: string | undefined, produccion: boolean): string | null {
  const texto = valor?.trim();
  if (!texto) return "BACKEND_URL: es obligatoria (referencia: .env.example)";

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return "BACKEND_URL: debe ser una URL completa (ej. https://api.sitio.com/api/v1)";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "BACKEND_URL: debe ser una URL http(s)";
  if (url.username || url.password) return "BACKEND_URL: no debe llevar usuario ni contraseña";
  if (texto.endsWith("/")) return "BACKEND_URL: no debe terminar en barra";

  // El tráfico con el backend lleva el JWT y las contraseñas: en producción solo por HTTPS.
  if (produccion && url.protocol !== "https:" && !HOSTS_LOCALES.includes(url.hostname)) {
    return "BACKEND_URL: en producción debe ser https:// (solo localhost y 127.0.0.1 pueden ser http://)";
  }

  return null;
}
