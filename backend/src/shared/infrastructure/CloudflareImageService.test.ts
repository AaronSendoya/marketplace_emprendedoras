import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { CloudflareImageService } from "./CloudflareImageService";
import { crearImageStorage } from "./crearImageStorage";
import { ImageStorageEnMemoria } from "./ImageStorageEnMemoria";

const config = { accountId: "cuenta", accessKeyId: "clave", secretAccessKey: "secreto", bucket: "catalogo-dev", publicUrl: "https://cdn.ejemplo.com" };

function construir() {
  const enviados: unknown[] = [];
  const servicio = new CloudflareImageService(config, { send: async (comando: unknown) => void enviados.push(comando) } as never);
  return { servicio, enviados };
}

describe("CloudflareImageService (regla 16)", () => {
  it("guarda como image/webp con caché inmutable de un año, en el bucket y la clave indicados", async () => {
    const { servicio, enviados } = construir();

    await servicio.guardar("perfiles/abc.webp", Buffer.from("webp"));

    expect(enviados[0]).toBeInstanceOf(PutObjectCommand);
    expect((enviados[0] as PutObjectCommand).input).toEqual({
      Bucket: "catalogo-dev",
      Key: "perfiles/abc.webp",
      Body: Buffer.from("webp"),
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("borra la clave indicada", async () => {
    const { servicio, enviados } = construir();

    await servicio.borrar("perfiles/abc.webp");

    expect(enviados[0]).toBeInstanceOf(DeleteObjectCommand);
    expect((enviados[0] as DeleteObjectCommand).input).toEqual({ Bucket: "catalogo-dev", Key: "perfiles/abc.webp" });
  });

  it("arma la URL pública con la URL configurada y la clave", () => {
    expect(construir().servicio.urlPublica("logos/x.webp")).toBe("https://cdn.ejemplo.com/logos/x.webp");
  });

  it("propaga el fallo del proveedor (no lo traga)", async () => {
    const servicio = new CloudflareImageService(config, { send: async () => Promise.reject(new Error("R2 caído")) } as never);

    await expect(servicio.guardar("a.webp", Buffer.from("x"))).rejects.toThrow("R2 caído");
  });
});

describe("crearImageStorage", () => {
  const sinR2 = { R2_ACCOUNT_ID: undefined, R2_ACCESS_KEY_ID: undefined, R2_SECRET_ACCESS_KEY: undefined, R2_BUCKET: undefined, R2_PUBLIC_URL: undefined };

  it("con R2 completo devuelve el adaptador de Cloudflare", () => {
    const almacenamiento = crearImageStorage({
      APP_ENV: "development",
      R2_ACCOUNT_ID: "a",
      R2_ACCESS_KEY_ID: "b",
      R2_SECRET_ACCESS_KEY: "c",
      R2_BUCKET: "d",
      R2_PUBLIC_URL: "https://cdn.ejemplo.com",
    });

    expect(almacenamiento).toBeInstanceOf(CloudflareImageService);
  });

  it("sin R2 y fuera de producción usa la memoria", () => {
    expect(crearImageStorage({ APP_ENV: "development", ...sinR2 })).toBeInstanceOf(ImageStorageEnMemoria);
  });

  it("sin R2 en producción falla", () => {
    expect(() => crearImageStorage({ APP_ENV: "production", ...sinR2 })).toThrow("R2 no está configurado");
  });
});

describe("ImageStorageEnMemoria", () => {
  it("guarda, reconoce y borra claves", async () => {
    const almacenamiento = new ImageStorageEnMemoria();

    await almacenamiento.guardar("a.webp", Buffer.from("x"));
    expect(almacenamiento.existe("a.webp")).toBe(true);
    await almacenamiento.borrar("a.webp");
    await almacenamiento.borrar("no-existe.webp");

    expect(almacenamiento.claves()).toEqual([]);
  });
});
