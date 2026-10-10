import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatoPorCabecera, TAMANO_MAXIMO_IMAGEN_BYTES, validarImagen } from "./validarImagen.ts";

const MB = 1024 * 1024;
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const TEXTO = new TextEncoder().encode("esto no es una imagen");

const archivo = (name: string, type: string, size = 1 * MB) => ({ name, type, size });

describe("formatoPorCabecera", () => {
  it("reconoce los tres formatos y rechaza lo demás", () => {
    assert.equal(formatoPorCabecera(JPEG), "jpeg");
    assert.equal(formatoPorCabecera(PNG), "png");
    assert.equal(formatoPorCabecera(WEBP), "webp");
    assert.equal(formatoPorCabecera(TEXTO), null);
    assert.equal(formatoPorCabecera(new Uint8Array()), null);
  });
});

describe("validarImagen", () => {
  it("acepta JPEG, PNG y WebP de hasta 5 MB", () => {
    assert.deepEqual(validarImagen(archivo("foto.jpg", "image/jpeg"), JPEG), { ok: true });
    assert.deepEqual(validarImagen(archivo("logo.png", "image/png"), PNG), { ok: true });
    assert.deepEqual(validarImagen(archivo("a.webp", "image/webp"), WEBP), { ok: true });
    assert.deepEqual(validarImagen(archivo("justo.jpg", "image/jpeg", TAMANO_MAXIMO_IMAGEN_BYTES), JPEG), { ok: true });
  });

  it("rechaza lo que pesa más de 5 MB y dice cuánto pesa", () => {
    const r = validarImagen(archivo("grande.jpg", "image/jpeg", 8.4 * MB), JPEG);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.mensaje, /8,4 MB y el máximo es 5 MB/);
    assert.equal(validarImagen(archivo("uno-mas.jpg", "image/jpeg", TAMANO_MAXIMO_IMAGEN_BYTES + 1)).ok, false);
  });

  it("rechaza un archivo vacío", () => {
    const r = validarImagen(archivo("vacia.png", "image/png", 0));
    assert.equal(r.ok, false);
  });

  it("explica por qué no sirve una foto HEIC, por el tipo o por la extensión", () => {
    for (const a of [archivo("IMG_1.heic", "image/heic"), archivo("IMG_2.HEIC", ""), archivo("x.heif", "image/heif")]) {
      const r = validarImagen(a);
      assert.equal(r.ok, false, a.name);
      if (!r.ok) assert.match(r.mensaje, /HEIC/);
    }
  });

  it("rechaza otros formatos (GIF, SVG, PDF, documentos)", () => {
    for (const a of [archivo("a.gif", "image/gif"), archivo("a.svg", "image/svg+xml"), archivo("a.pdf", "application/pdf"), archivo("a.docx", "application/octet-stream")]) {
      assert.equal(validarImagen(a).ok, false, a.name);
    }
  });

  it("sin tipo declarado, vale la extensión", () => {
    assert.equal(validarImagen(archivo("foto.jpeg", ""), JPEG).ok, true);
    assert.equal(validarImagen(archivo("foto.bmp", "")).ok, false);
    assert.equal(validarImagen(archivo("sin-extension", "")).ok, false);
  });

  it("un archivo cuyo contenido no es una imagen se rechaza aunque diga serlo", () => {
    const r = validarImagen(archivo("falsa.jpg", "image/jpeg"), TEXTO);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.mensaje, /no parece una imagen/);
  });

  it("con una cabecera incompleta no decide por el contenido (el servidor lo hará)", () => {
    assert.equal(validarImagen(archivo("foto.jpg", "image/jpeg"), new Uint8Array([1, 2, 3])).ok, true);
  });
});
