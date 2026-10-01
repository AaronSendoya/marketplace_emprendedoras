import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { leerCuerpo } from "@/api/http/validacion";
import { LIMITE_CUERPO_JSON } from "@/api/http/cuerpo";
import { EsquemaLoginBody, EsquemaRestablecerPasswordBody } from "@/api/openapi/rutas/auth";
import { EsquemaCrearDescuentoBody } from "@/api/openapi/rutas/descuentos";
import { EsquemaCrearPerfilForm, EsquemaEditarPerfilBody } from "@/api/openapi/rutas/perfiles";
import { normalizarInstagram } from "@/core/perfiles/domain/Instagram";
import { normalizarWhatsapp } from "@/core/perfiles/domain/Whatsapp";
import { cumplePoliticaPassword } from "@/core/auth/domain/Password";
import { interpretarFecha } from "@/core/descuentos/domain/VigenciaDescuento";
import { ErrorArchivoMuyGrande, ErrorValidacion } from "@/shared/domain/errors";
import { ImageProcessorService } from "@/shared/infrastructure/ImageProcessorService";
import { errorDeValidacion } from "@/api/http/validacion";
import { sanearDatos } from "@/shared/infrastructure/ConsoleLogger";

// Pruebas no funcionales de robustez y rendimiento (caja blanca): el código conoce sus expresiones
// regulares y sus límites, y se le entregan las peores entradas posibles. Los umbrales son
// generosos (un fallo real es de órdenes de magnitud, no de milisegundos).
const LIMITE_MS = 300;

function cronometrar(trabajo: () => void): number {
  const inicio = performance.now();
  try {
    trabajo();
  } catch {
    // Rechazar la entrada es lo esperado; lo que se mide es cuánto tarda en hacerlo.
  }
  return performance.now() - inicio;
}

const ENORME = 100 * 1024; // el mayor cuerpo JSON admitido

describe("entradas hostiles no bloquean el servidor (ReDoS y costo)", () => {
  const casos: [string, () => void][] = [
    ["WhatsApp: signos +", () => normalizarWhatsapp("+".repeat(ENORME) + "1")],
    ["WhatsApp: pares de dígitos y espacios", () => normalizarWhatsapp("1 ".repeat(ENORME / 2) + "x")],
    ["WhatsApp: paréntesis y guiones", () => normalizarWhatsapp("(-".repeat(ENORME / 2) + "a")],
    ["Instagram: puntos alternados", () => normalizarInstagram("a.".repeat(ENORME / 2) + "!")],
    ["Instagram: barras en la URL", () => normalizarInstagram("instagram.com/" + "/".repeat(ENORME))],
    ["Instagram: instagram.com repetido", () => normalizarInstagram("instagram.com".repeat(ENORME / 13) + "/")],
    ["fecha: dígitos tras la T", () => interpretarFecha("2026-01-01T" + "0".repeat(ENORME), "inicio")],
    ["fecha: guiones", () => interpretarFecha("2026" + "-".repeat(ENORME), "fin")],
    ["contraseña de 100 KB", () => cumplePoliticaPassword("a".repeat(ENORME))],
    ["contraseña con caracteres de varios bytes", () => cumplePoliticaPassword("ñ".repeat(ENORME))],
    ["esquema de login con un correo de 100 KB", () => EsquemaLoginBody.safeParse({ email: "a".repeat(ENORME) + "@x.com", password: "x" })],
    ["esquema de login con un correo casi válido", () => EsquemaLoginBody.safeParse({ email: "a@" + "b.".repeat(ENORME / 2), password: "x" })],
    ["esquema con un código de 100 KB", () => EsquemaRestablecerPasswordBody.safeParse({ email: "a@b.com", codigo: "1".repeat(ENORME), password_nueva: "x".repeat(ENORME) })],
    ["formulario de perfil con textos enormes", () => EsquemaCrearPerfilForm.safeParse({ nombre_negocio: "a".repeat(ENORME), descripcion: "b".repeat(ENORME), whatsapp: "c".repeat(ENORME), ciudad_id: "d".repeat(ENORME), rubro_id: "e" })],
    ["edición de perfil con Instagram enorme", () => EsquemaEditarPerfilBody.safeParse({ instagram: "@".repeat(ENORME) })],
    ["descuento con fechas enormes", () => EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, fecha_inicio: "9".repeat(ENORME), fecha_fin: "9".repeat(ENORME) })],
    ["saneado de un objeto muy anidado para el registro", () => sanearDatos(JSON.parse("[".repeat(2000) + "]".repeat(2000)))],
  ];

  it.each(casos)("%s se resuelve rápido", (_nombre, trabajo) => {
    expect(cronometrar(trabajo)).toBeLessThan(LIMITE_MS);
  });

  it("dar formato a 10.000 errores de validación es lineal (no cuadrático)", () => {
    const resultado = EsquemaCrearDescuentoBody.safeParse(Object.fromEntries(Array.from({ length: 10_000 }, (_, i) => [`campo${i}`, i])));
    expect(resultado.success).toBe(false);

    expect(cronometrar(() => errorDeValidacion(resultado.error!))).toBeLessThan(LIMITE_MS * 3);
  });
});

describe("cuerpo JSON acotado (regla 17)", () => {
  const post = (cuerpo: BodyInit | null, cabeceras: Record<string, string> = { "content-type": "application/json" }) =>
    new Request("http://localhost/x", { method: "POST", body: cuerpo, headers: cabeceras });

  it("el límite es de 100 KB", () => {
    expect(LIMITE_CUERPO_JSON).toBe(100 * 1024);
  });

  it("acepta un cuerpo justo en el límite y rechaza uno de un byte más con 413", async () => {
    const relleno = (bytes: number) => JSON.stringify({ email: "a@b.com", password: "x", relleno: "y".repeat(bytes - 50) });
    const alLimite = relleno(LIMITE_CUERPO_JSON);

    // Pasa el límite de tamaño; el esquema lo rechaza después por el campo sobrante, no por su peso.
    await expect(leerCuerpo(post(alLimite.slice(0, LIMITE_CUERPO_JSON)), EsquemaLoginBody)).rejects.not.toBeInstanceOf(ErrorArchivoMuyGrande);
    await expect(leerCuerpo(post(alLimite + "     "), EsquemaLoginBody)).rejects.toBeInstanceOf(ErrorArchivoMuyGrande);
  });

  it("corta un cuerpo enorme aunque no traiga Content-Length (transferencia por partes)", async () => {
    const trozo = new Uint8Array(20 * 1024).fill(97);
    const partes = new ReadableStream<Uint8Array>({
      start(controlador) {
        for (let i = 0; i < 10; i++) controlador.enqueue(trozo);
        controlador.close();
      },
    });
    const peticion = new Request("http://localhost/x", { method: "POST", body: partes, headers: { "content-type": "application/json" }, duplex: "half" } as RequestInit);

    await expect(leerCuerpo(peticion, EsquemaLoginBody)).rejects.toBeInstanceOf(ErrorArchivoMuyGrande);
  });

  it("un Content-Length que miente hacia abajo no evita el límite (se cuentan los bytes leídos)", async () => {
    const grande = JSON.stringify({ x: "y".repeat(LIMITE_CUERPO_JSON) });
    const peticion = post(grande, { "content-type": "application/json", "content-length": "10" });

    await expect(leerCuerpo(peticion, EsquemaLoginBody)).rejects.toBeInstanceOf(ErrorArchivoMuyGrande);
  });

  it.each([
    ["cuerpo vacío", null],
    ["texto que no es JSON", "hola"],
    ["JSON truncado", '{"email": "a@b.com"'],
    ["anidado 50.000 niveles", "[".repeat(50_000) + "]".repeat(50_000)],
  ])("%s da 400 (no un error interno)", async (_caso, cuerpo) => {
    await expect(leerCuerpo(post(cuerpo), EsquemaLoginBody)).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("no contamina Object.prototype: un cuerpo con __proto__ o constructor se rechaza por campo no permitido", async () => {
    const malicioso = '{"email":"a@b.com","password":"x","__proto__":{"esAdmin":true},"constructor":{"prototype":{"esAdmin":true}}}';

    await expect(leerCuerpo(post(malicioso), EsquemaLoginBody)).rejects.toBeInstanceOf(ErrorValidacion);
    expect(({} as Record<string, unknown>).esAdmin).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("esAdmin");
  });

  it("los campos desconocidos se rechazan, no se ignoran en silencio", async () => {
    await expect(leerCuerpo(post('{"email":"a@b.com","password":"x","rol":"Admin"}'), EsquemaLoginBody)).rejects.toMatchObject({ detalles: [{ campo: "rol" }] });
  });
});

describe("imágenes hostiles (regla 16)", () => {
  const procesador = new ImageProcessorService();

  // Un PNG que declara 60.000 x 60.000 píxeles (3.600 millones) en unos 60 bytes: descomprimirlo
  // agotaría la memoria si el procesador no lo cortara antes.
  function pngBomba(): Buffer {
    const bloque = (tipo: string, datos: Buffer) => {
      const longitud = Buffer.alloc(4);
      longitud.writeUInt32BE(datos.length);
      const cuerpo = Buffer.concat([Buffer.from(tipo), datos]);
      const control = Buffer.alloc(4);
      control.writeUInt32BE(crc32(cuerpo));
      return Buffer.concat([longitud, cuerpo, control]);
    };
    const cabecera = Buffer.alloc(13);
    cabecera.writeUInt32BE(60_000, 0);
    cabecera.writeUInt32BE(60_000, 4);
    cabecera.set([8, 2, 0, 0, 0], 8);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloque("IHDR", cabecera), bloque("IDAT", Buffer.from([120, 156, 3, 0, 0, 0, 0, 1])), bloque("IEND", Buffer.alloc(0))]);
  }

  it("una imagen 'bomba' de píxeles se rechaza con 400 sin consumir memoria ni tiempo", async () => {
    const png = pngBomba();
    expect(png.length).toBeLessThan(200);

    const inicio = performance.now();
    await expect(procesador.procesar(png, "perfil")).rejects.toBeInstanceOf(ErrorValidacion);

    expect(performance.now() - inicio).toBeLessThan(2000);
  });

  it("varias subidas de texto disfrazado terminan rápido y todas con el mismo error", async () => {
    const inicio = performance.now();
    const errores = await Promise.all(Array.from({ length: 50 }, () => procesador.procesar(Buffer.from("x".repeat(4096)), "producto").catch((e: Error) => e.message)));

    expect(new Set(errores).size).toBe(1);
    expect(performance.now() - inicio).toBeLessThan(3000);
  });
});
