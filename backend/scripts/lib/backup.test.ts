import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cifrar, contenidoArchivoOpciones, descifrar, nombreArchivoBackup } from "./backup";

const CLAVE = randomBytes(32).toString("base64");

describe("cifrar/descifrar", () => {
  it("recupera exactamente los datos originales con la misma clave", () => {
    const original = Buffer.from("contenido de prueba con acentos: ñ á é 日本語");
    expect(descifrar(cifrar(original, CLAVE), CLAVE)).toEqual(original);
  });

  it("dos cifrados del mismo contenido no son iguales (IV distinto)", () => {
    const original = Buffer.from("mismo contenido");
    expect(cifrar(original, CLAVE)).not.toEqual(cifrar(original, CLAVE));
  });

  it("descifrar con otra clave falla en vez de devolver basura", () => {
    const cifrado = cifrar(Buffer.from("secreto"), CLAVE);
    expect(() => descifrar(cifrado, randomBytes(32).toString("base64"))).toThrow();
  });

  it("un archivo alterado falla al descifrar (GCM autentica el contenido)", () => {
    const cifrado = cifrar(Buffer.from("secreto"), CLAVE);
    cifrado[cifrado.length - 1] ^= 0xff;
    expect(() => descifrar(cifrado, CLAVE)).toThrow();
  });

  it("una clave que no mide 32 bytes en base64 se rechaza con un mensaje claro", () => {
    expect(() => cifrar(Buffer.from("x"), Buffer.from("corta").toString("base64"))).toThrow(
      /32 bytes en base64/,
    );
  });
});

describe("nombreArchivoBackup", () => {
  it("arma un nombre ordenable por fecha, sin caracteres inválidos para un nombre de archivo", () => {
    const nombre = nombreArchivoBackup("catalogo_prod", new Date("2026-09-27T10:15:00.123Z"));
    expect(nombre).toBe("catalogo_catalogo_prod_2026-09-27T10-15-00-123Z.sql.gz.enc");
    expect(nombre).not.toContain(":");
  });
});

describe("contenidoArchivoOpciones", () => {
  it("arma el archivo [client] que lee mysqldump", () => {
    expect(contenidoArchivoOpciones({ host: "127.0.0.1", puerto: 3306, usuario: "u", clave: "p" })).toBe(
      "[client]\nhost=127.0.0.1\nport=3306\nuser=u\npassword=p\n",
    );
  });
});
