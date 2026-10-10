// Sin imports: lo usa `src/proxy.ts` y lo prueba `token.test.ts` con el corredor de Node.

// ¿Es un token que no vence? (regla 5, CLAUDE.md: el de Emprendedor no lleva `exp`; el de Admin sí). Lee el cuerpo del JWT SIN
// verificar su firma, y no hace falta: solo decide si `proxy.ts` renueva la cookie, nunca si la sesión vale. Eso lo decide el
// backend en cada petición. Cualquier cosa que no sea un JWT con un cuerpo legible cuenta como «no»: la cookie no se renueva.
export function esTokenSinVencimiento(token: string): boolean {
  const partes = token.split(".");
  if (partes.length !== 3 || !partes[1]) return false;

  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const cuerpo: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return typeof cuerpo === "object" && cuerpo !== null && !Array.isArray(cuerpo) && !Object.hasOwn(cuerpo, "exp");
  } catch {
    return false;
  }
}
