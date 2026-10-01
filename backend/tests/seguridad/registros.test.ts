import ts from "typescript";
import { describe, expect, it } from "vitest";
import { analizar, fuentesDeProduccion, recorrerNodos } from "./soporte/fuentes";

// Regla 17 (auditoría): los registros de eventos nunca llevan datos personales ni secretos. El
// logger ya tapa lo que reconoce, pero la primera barrera es no pasarlos: esta prueba lee cada
// llamada al logger y revisa el nombre de cada dato que se le entrega.
const CLAVE_SENSIBLE = /pass|contrase|secret|token|jwt|authorization|cookie|otp|hash|email|correo|whatsapp|nombre|descripcion|precio|instagram/i;
const NIVELES = new Set(["info", "warn", "error"]);

interface LlamadaLogger {
  ruta: string;
  evento: string | undefined;
  claves: string[];
  texto: string;
}

function llamadasAlLogger(): LlamadaLogger[] {
  return fuentesDeProduccion()
    .filter((f) => !/ConsoleLogger\.ts$/.test(f.ruta))
    .flatMap((fuente) => {
      const llamadas: LlamadaLogger[] = [];
      recorrerNodos(analizar(fuente.texto, fuente.ruta), (nodo) => {
        if (!ts.isCallExpression(nodo) || !ts.isPropertyAccessExpression(nodo.expression)) return;
        if (!NIVELES.has(nodo.expression.name.text) || !/(^|\.)(logger|registro)$/.test(nodo.expression.expression.getText())) return;
        const [evento, datos] = nodo.arguments;
        llamadas.push({
          ruta: fuente.ruta,
          evento: evento && ts.isStringLiteral(evento) ? evento.text : undefined,
          claves: datos && ts.isObjectLiteralExpression(datos) ? datos.properties.map((p) => p.name?.getText() ?? p.getText()) : [],
          texto: nodo.getText(),
        });
      });
      return llamadas;
    });
}

const llamadas = llamadasAlLogger();

describe("registro de eventos (regla 17, caja blanca)", () => {
  it("encuentra las llamadas al logger (la prueba no es vacía)", () => {
    expect(llamadas.length).toBeGreaterThanOrEqual(20);
  });

  it("los eventos de autenticación y de cuentas están registrados (auditoría)", () => {
    const eventos = new Set(llamadas.map((l) => l.evento));
    for (const esperado of [
      "login_exitoso",
      "login_fallido",
      "login_bloqueado",
      "cuenta_creada",
      "cuenta_estado_cambiado",
      "password_restablecida",
      "otp_solicitado",
      "email_cambiado",
    ]) {
      expect(eventos.has(esperado), `falta el evento ${esperado}`).toBe(true);
    }
  });

  it.each(llamadas.map((l) => [`${l.ruta} -> ${l.evento}`, l] as const))("%s: nombre fijo y en snake_case", (_nombre, llamada) => {
    expect(llamada.evento, llamada.texto).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
  });

  it.each(llamadas.map((l) => [`${l.ruta} -> ${l.evento}`, l] as const))("%s: ningún dato entregado lleva información personal ni secreta", (_nombre, llamada) => {
    for (const clave of llamada.claves) {
      expect(CLAVE_SENSIBLE.test(clave), `${llamada.ruta}: el dato "${clave}" de ${llamada.evento} parece personal o secreto`).toBe(false);
    }
  });

  it("solo el logger y el adaptador de desarrollo escriben en la consola (nada de console.log suelto)", () => {
    const permitidos = /(ConsoleLogger|ConsoleEmailSender)\.ts$/;
    for (const fuente of fuentesDeProduccion().filter((f) => !permitidos.test(f.ruta))) {
      expect(fuente.texto, fuente.ruta).not.toMatch(/\bconsole\.(log|info|warn|error|debug)\(/);
    }
  });

  it("el adaptador de correo que escribe códigos en la consola no se puede usar en producción", async () => {
    const { parseEnv } = await import("@/shared/config/env");
    const base = {
      APP_ENV: "production",
      DATABASE_URL: "mysql://u:p@127.0.0.1:3306/catalogo",
      JWT_SECRET: "x".repeat(32),
      CORS_ALLOWED_ORIGINS: "https://catalogo.ejemplo.com",
      R2_ACCOUNT_ID: "a",
      R2_ACCESS_KEY_ID: "b",
      R2_SECRET_ACCESS_KEY: "c",
      R2_BUCKET: "d",
      R2_PUBLIC_URL: "https://cdn.ejemplo.com",
      EMAIL_DRIVER: "console",
    };

    expect(() => parseEnv(base)).toThrow(/EMAIL_DRIVER/);
  });
});
