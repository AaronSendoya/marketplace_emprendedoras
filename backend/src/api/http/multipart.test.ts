import { describe, expect, it } from "vitest";
import { ErrorArchivoMuyGrande, ErrorValidacion } from "@/shared/domain/errors";
import { leerFormulario, LIMITE_CUERPO_DOS_IMAGENES, LIMITE_CUERPO_UNA_IMAGEN, separarFormulario } from "./multipart";

const peticion = (form: FormData) => new Request("http://localhost/x", { method: "POST", body: form });
const archivo = (contenido: string, nombre = "a.png") => new File([contenido], nombre, { type: "image/png" });

describe("leerFormulario", () => {
  it("lee campos de texto y archivos", async () => {
    const form = new FormData();
    form.set("nombre", "Negocio");
    form.set("logo", archivo("contenido"));

    const leido = await leerFormulario(peticion(form), LIMITE_CUERPO_UNA_IMAGEN);

    expect(leido.get("nombre")).toBe("Negocio");
    expect(await (leido.get("logo") as File).text()).toBe("contenido");
  });

  it("rechaza un cuerpo que no es multipart", async () => {
    const request = new Request("http://localhost/x", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });

    await expect(leerFormulario(request, 1000)).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("rechaza con ErrorArchivoMuyGrande si Content-Length declara más del límite, sin leer el cuerpo", async () => {
    const form = new FormData();
    form.set("logo", archivo("x".repeat(2000)));
    const request = peticion(form);

    await expect(leerFormulario(request, 1000)).rejects.toBeInstanceOf(ErrorArchivoMuyGrande);
  });

  it("corta la lectura al pasar el límite aunque no haya Content-Length", async () => {
    const trozo = new Uint8Array(400);
    const cuerpo = new ReadableStream<Uint8Array>({
      start(controlador) {
        for (let i = 0; i < 5; i++) controlador.enqueue(trozo);
        controlador.close();
      },
    });
    const request = new Request("http://localhost/x", {
      method: "POST",
      body: cuerpo,
      headers: { "content-type": "multipart/form-data; boundary=abc" },
      duplex: "half",
    } as RequestInit);

    await expect(leerFormulario(request, 1000)).rejects.toBeInstanceOf(ErrorArchivoMuyGrande);
  });

  it("un multipart mal formado da 400, no un error interno", async () => {
    const request = new Request("http://localhost/x", {
      method: "POST",
      body: "esto no es multipart",
      headers: { "content-type": "multipart/form-data; boundary=abc" },
    });

    await expect(leerFormulario(request, 1000)).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("el tope para dos imágenes cubre dos archivos de 5 MB más los campos", () => {
    expect(LIMITE_CUERPO_DOS_IMAGENES).toBeGreaterThan(2 * 5 * 1024 * 1024);
    expect(LIMITE_CUERPO_DOS_IMAGENES).toBeLessThanOrEqual(12 * 1024 * 1024); // proxyClientMaxBodySize de next.config.ts
  });
});

describe("separarFormulario", () => {
  it("separa texto y archivos", async () => {
    const form = new FormData();
    form.set("a", "1");
    form.set("logo", archivo("xyz"));

    const { texto, archivos } = await separarFormulario(form, ["logo"]);

    expect(texto).toEqual({ a: "1" });
    expect(archivos.logo.toString()).toBe("xyz");
  });

  it("ignora un archivo vacío (input de archivo sin elegir)", async () => {
    const form = new FormData();
    form.set("logo", archivo(""));

    expect((await separarFormulario(form, ["logo"])).archivos).toEqual({});
  });

  it("rechaza un archivo en un campo no esperado", async () => {
    const form = new FormData();
    form.set("otro", archivo("x"));

    await expect(separarFormulario(form, ["logo"])).rejects.toMatchObject({ detalles: [{ campo: "otro" }] });
  });

  it("rechaza un campo repetido", async () => {
    const form = new FormData();
    form.append("a", "1");
    form.append("a", "2");

    await expect(separarFormulario(form, [])).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
