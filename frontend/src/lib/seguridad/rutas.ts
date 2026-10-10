// Sin imports: lo prueba `rutas.test.ts` con el corredor de Node.

const LONGITUD_MAXIMA = 2000;

// Una Server Function recibe sus argumentos desde el navegador, así que un destino de retorno (`volverA`) nunca se da por bueno:
// se usa solo si es una ruta interna que cuelga de `prefijo` (por ejemplo `/admin?pagina=2`). Cualquier otra cosa —otro sitio,
// una dirección relativa al protocolo (`//sitio.com`), una barra invertida que el navegador trata como `/`, caracteres de control
// o una ruta fuera del panel— vuelve al propio `prefijo`, para que `redirect()` no se pueda usar como redirección abierta.
export function rutaDeRetorno(valor: unknown, prefijo: string): string {
  if (typeof valor !== "string" || valor.length > LONGITUD_MAXIMA) return prefijo;
  if (!valor.startsWith(prefijo)) return prefijo;

  // Después del prefijo solo puede seguir el final, una subruta o una consulta: `/administrador` o `/admin.evil.com` no valen.
  const siguiente = valor.charAt(prefijo.length);
  if (siguiente !== "" && siguiente !== "/" && siguiente !== "?" && siguiente !== "#") return prefijo;

  // Barra invertida y caracteres de control (saltos de línea, tabulaciones, NUL).
  if (/[\\\u0000-\u001f\u007f]/.test(valor)) return prefijo;
  if (valor.startsWith("//")) return prefijo;

  return valor;
}
