import { describe, expect, it } from "vitest";
import { ErrorArchivoMuyGrande, ErrorValidacion } from "@/shared/domain/errors";
import { leerArchivoUnico, leerFormulario, LIMITE_CUERPO_DOS_IMAGENES, LIMITE_CUERPO_EXCEL, LIMITE_CUERPO_UNA_IMAGEN, separarFormulario } from "./multipart";

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

describe("leerArchivoUnico (regla 22)", () => {
  const excel = (contenido = "datos", nombre = "emprendedoras.xlsx") => new File([contenido], nombre);

  it("lee el archivo del campo pedido, con su nombre y su contenido", async () => {
    const form = new FormData();
    form.set("archivo", excel("hola mundo"));

    const leido = await leerArchivoUnico(peticion(form), "archivo", LIMITE_CUERPO_EXCEL);

    expect(leido.nombre).toBe("emprendedoras.xlsx");
    expect(leido.contenido.toString()).toBe("hola mundo");
  });

  it("sin archivo, dice qué hacer", async () => {
    await expect(leerArchivoUnico(peticion(new FormData()), "archivo", LIMITE_CUERPO_EXCEL)).rejects.toMatchObject({
      message: "Falta el archivo. Arrastra o elige un archivo Excel (.xlsx).",
    });
  });

  it("rechaza un campo con otro nombre, un campo de más y un texto en lugar del archivo", async () => {
    const otroNombre = new FormData();
    otroNombre.set("documento", excel());
    const deMas = new FormData();
    deMas.set("archivo", excel());
    deMas.set("rol", "Admin");
    const texto = new FormData();
    texto.set("archivo", "no soy un archivo");

    await expect(leerArchivoUnico(peticion(otroNombre), "archivo", LIMITE_CUERPO_EXCEL)).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(leerArchivoUnico(peticion(deMas), "archivo", LIMITE_CUERPO_EXCEL)).rejects.toMatchObject({ detalles: [{ campo: "rol" }] });
    await expect(leerArchivoUnico(peticion(texto), "archivo", LIMITE_CUERPO_EXCEL)).rejects.toMatchObject({ message: "El campo debe ser un archivo." });
  });

  it("rechaza un cuerpo que no es multipart y uno que pasa del límite (sin leerlo entero)", async () => {
    const json = new Request("http://localhost/x", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
    const grande = new FormData();
    grande.set("archivo", excel("x".repeat(4 * 1024 * 1024)));

    await expect(leerArchivoUnico(json, "archivo", LIMITE_CUERPO_EXCEL)).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(leerArchivoUnico(peticion(grande), "archivo", LIMITE_CUERPO_EXCEL)).rejects.toBeInstanceOf(ErrorArchivoMuyGrande);
  });

  it("el límite del cuerpo es de 3 MB: 2 MB de archivo más el margen de los campos", () => {
    expect(LIMITE_CUERPO_EXCEL).toBe(3 * 1024 * 1024);
  });
});
