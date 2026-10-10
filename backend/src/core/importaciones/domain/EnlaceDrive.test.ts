import { describe, expect, it } from "vitest";
import { ID_DE_DRIVE, interpretarEnlaceDeDrive } from "./EnlaceDrive";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_-0123";

describe("interpretarEnlaceDeDrive (regla 22)", () => {
  it.each([
    ["el que genera Google Forms", `https://drive.google.com/open?id=${ID}`],
    ["el de «compartir» de un archivo", `https://drive.google.com/file/d/${ID}/view?usp=drive_link`],
    ["el de «compartir» con el usuario de la cuenta", `https://drive.google.com/file/d/${ID}/view?usp=sharing`],
    ["el de descarga directa", `https://drive.google.com/uc?export=download&id=${ID}`],
    ["el de docs.google.com", `https://docs.google.com/uc?id=${ID}`],
    ["sin esquema", `drive.google.com/open?id=${ID}`],
    ["con http", `http://drive.google.com/open?id=${ID}`],
    ["con espacios alrededor", `  https://drive.google.com/open?id=${ID}  `],
    ["con el host en mayúsculas", `https://DRIVE.GOOGLE.COM/open?id=${ID}`],
  ])("reconoce %s", (_nombre, enlace) => {
    expect(interpretarEnlaceDeDrive(enlace)).toEqual({ tipo: "archivo", id: ID });
  });

  it("una celda vacía o de solo espacios es «sin imagen»", () => {
    expect(interpretarEnlaceDeDrive("")).toEqual({ tipo: "vacio" });
    expect(interpretarEnlaceDeDrive("   \n ")).toEqual({ tipo: "vacio" });
  });

  it.each([
    `https://drive.google.com/drive/folders/${ID}`,
    `https://drive.google.com/drive/u/2/folders/${ID}?usp=sharing`,
  ])("una carpeta no es una imagen: %s", (enlace) => {
    expect(interpretarEnlaceDeDrive(enlace)).toEqual({ tipo: "carpeta" });
  });

  it.each([
    ["otro sitio", `https://ejemplo.com/open?id=${ID}`],
    ["un sitio que solo se parece", `https://drive.google.com.evil.com/open?id=${ID}`],
    ["un subdominio ajeno", `https://evil.drive.google.com/open?id=${ID}`],
    ["una dirección interna (nunca se pide)", `http://localhost:3001/open?id=${ID}`],
    ["una dirección de metadatos de la nube", "http://169.254.169.254/latest/meta-data/"],
    ["un esquema que no es web", `ftp://drive.google.com/open?id=${ID}`],
    ["un esquema peligroso", `javascript:alert(1)//drive.google.com/open?id=${ID}`],
    ["sin id", "https://drive.google.com/open"],
    ["con un id demasiado corto", "https://drive.google.com/open?id=abc"],
    ["con caracteres que no son de un id", "https://drive.google.com/open?id=1AbC../../etc/passwd_xxxxxxxxx"],
    ["un id con una comilla", `https://drive.google.com/open?id=${ID}'--`],
    ["un id enorme", `https://drive.google.com/open?id=${"a".repeat(500)}`],
    ["texto cualquiera", "la subo después"],
    ["solo un nombre de archivo", "foto-perfil.jpg"],
  ])("rechaza %s", (_nombre, enlace) => {
    expect(interpretarEnlaceDeDrive(enlace).tipo).toBe("invalido");
  });

  it("el id solo puede tener letras, números, guion y guion bajo", () => {
    expect(ID_DE_DRIVE.test(ID)).toBe(true);
    for (const malo of ["", "abc", "a b a b a b a b a b", "../../../../../x", "id;rm -rf", "id%2e%2e%2f%2e%2e", `${"a".repeat(129)}`]) {
      expect(ID_DE_DRIVE.test(malo), malo).toBe(false);
    }
  });

  it("devuelve el texto original recortado cuando es inválido, para el mensaje", () => {
    expect(interpretarEnlaceDeDrive("  hola  ")).toEqual({ tipo: "invalido", texto: "hola" });
  });
});
