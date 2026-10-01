import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ErrorArchivoMuyGrande, ErrorValidacion } from "@/shared/domain/errors";
import { LADO_MAX_PX, TAMANO_MAX_IMAGEN_BYTES } from "@/shared/domain/imagenes";
import { ImageProcessorService } from "./ImageProcessorService";

const procesador = new ImageProcessorService();

// Ruido aleatorio: no se comprime bien, así el JPEG de entrada pesa mucho más que el WebP.
const ruido = (ancho: number, alto: number) => {
  const datos = Buffer.alloc(ancho * alto * 3);
  for (let i = 0; i < datos.length; i++) datos[i] = (i * 7919 + (i >> 3) * 104729) & 255;
  return sharp(datos, { raw: { width: ancho, height: alto, channels: 3 } });
};

describe("ImageProcessorService (regla 16)", () => {
  it("convierte un JPEG grande a un WebP más liviano, dentro del lado máximo y sin ampliar", async () => {
    const jpeg = await ruido(1800, 1200).jpeg({ quality: 90 }).toBuffer();
    expect(jpeg.length).toBeLessThan(TAMANO_MAX_IMAGEN_BYTES);

    const salida = await procesador.procesar(jpeg, "perfil");
    const meta = await sharp(salida).metadata();

    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBe(LADO_MAX_PX.perfil);
    expect(meta.width! / meta.height!).toBeCloseTo(1.5, 1);
    expect(salida.length).toBeLessThan(jpeg.length);
  });

  it.each([
    ["perfil", 800],
    ["logo", 512],
    ["producto", 1200],
  ] as const)("el lado mayor de %s no pasa de %i px", async (tipo, maximo) => {
    const png = await ruido(2000, 1500).png().toBuffer();

    const meta = await sharp(await procesador.procesar(png, tipo)).metadata();

    expect(Math.max(meta.width!, meta.height!)).toBe(maximo);
  });

  it("no amplía una imagen pequeña", async () => {
    const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#336699" } }).png().toBuffer();

    const meta = await sharp(await procesador.procesar(png, "producto")).metadata();

    expect([meta.width, meta.height]).toEqual([200, 100]);
  });

  it("acepta PNG y WebP de entrada", async () => {
    const base = sharp({ create: { width: 64, height: 64, channels: 3, background: "#aa5522" } });
    const png = await base.clone().png().toBuffer();
    const webp = await base.clone().webp().toBuffer();

    for (const entrada of [png, webp]) {
      expect((await sharp(await procesador.procesar(entrada, "logo")).metadata()).format).toBe("webp");
    }
  });

  it("no conserva EXIF ni GPS", async () => {
    const conExif = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#123456" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secreto-de-prueba" }, IFD3: { GPSLatitudeRef: "S", GPSLongitudeRef: "W" } })
      .toBuffer();
    expect((await sharp(conExif).metadata()).exif).toBeDefined();

    const salida = await procesador.procesar(conExif, "perfil");

    expect((await sharp(salida).metadata()).exif).toBeUndefined();
    expect(salida.includes(Buffer.from("secreto-de-prueba"))).toBe(false);
  });

  it("aplica la orientación EXIF antes de quitarla (una foto de celular de lado sale derecha)", async () => {
    // 100x50 con orientación 6 (girar 90°): se ve como 50x100.
    const jpeg = await sharp({ create: { width: 100, height: 50, channels: 3, background: "#ff0000" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const meta = await sharp(await procesador.procesar(jpeg, "perfil")).metadata();

    expect([meta.width, meta.height]).toEqual([50, 100]);
  });

  it("detecta el tipo por el contenido: un texto renombrado a .jpg se rechaza", async () => {
    await expect(procesador.procesar(Buffer.from("esto no es una imagen"), "perfil")).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("rechaza formatos que no son JPEG, PNG ni WebP (GIF, SVG)", async () => {
    const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } }).gif().toBuffer();
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');

    await expect(procesador.procesar(gif, "perfil")).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(procesador.procesar(svg, "perfil")).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("rechaza un archivo vacío", async () => {
    await expect(procesador.procesar(Buffer.alloc(0), "perfil")).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("rechaza más de 5 MB con ErrorArchivoMuyGrande, sin procesar", async () => {
    await expect(procesador.procesar(Buffer.alloc(TAMANO_MAX_IMAGEN_BYTES + 1), "perfil")).rejects.toBeInstanceOf(ErrorArchivoMuyGrande);
  });

  it("un JPEG truncado no sale como error interno", async () => {
    const jpeg = await ruido(400, 400).jpeg().toBuffer();

    await expect(procesador.procesar(jpeg.subarray(0, 40), "perfil")).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
