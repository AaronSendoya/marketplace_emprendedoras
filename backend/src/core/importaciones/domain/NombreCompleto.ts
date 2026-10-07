// Regla 10: el Excel trae el nombre en un solo campo y la base lo guarda separado. Con 3 o más palabras, las dos últimas
// son los apellidos y el resto los nombres; con 2, la primera es el nombre y la segunda el apellido paterno.
// Los casos que esa regla no resuelve con certeza se señalan para que el Admin los revise.

export type AvisoDeNombre = "una_palabra" | "tres_palabras" | "apellido_compuesto";

export interface NombreSeparado {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  avisos: AvisoDeNombre[];
}

// Partículas que suelen formar parte de un apellido compuesto ("de la Cruz", "del Castillo", "San Martín").
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "san", "santa", "da", "di", "do", "van", "von"]);

const mayusculaInicial = (palabra: string) => (palabra ? palabra.charAt(0).toLocaleUpperCase("es") + palabra.slice(1).toLocaleLowerCase("es") : palabra);

// Un nombre que viene todo en mayúsculas o todo en minúsculas se pasa a mayúscula inicial en cada palabra; uno que ya trae
// mezcla de mayúsculas y minúsculas se respeta tal cual (alguien puede escribir "De la Cruz" a propósito).
export function conMayusculaInicial(texto: string): string {
  const letras = texto.replace(/[^\p{L}]/gu, "");
  if (!letras || (letras !== letras.toLocaleUpperCase("es") && letras !== letras.toLocaleLowerCase("es"))) return texto;
  return texto
    .split(" ")
    .map((palabra, i) => (i > 0 && PARTICULAS.has(palabra.toLocaleLowerCase("es")) ? palabra.toLocaleLowerCase("es") : mayusculaInicial(palabra)))
    .join(" ");
}

export function separarNombreCompleto(entrada: string): NombreSeparado {
  const texto = conMayusculaInicial(entrada.replace(/\s+/g, " ").trim());
  const palabras = texto.split(" ").filter(Boolean);
  const avisos: AvisoDeNombre[] = [];

  if (palabras.length === 0) return { nombres: "", apellidoPaterno: "", apellidoMaterno: null, avisos: ["una_palabra"] };
  if (palabras.length === 1) return { nombres: palabras[0], apellidoPaterno: "", apellidoMaterno: null, avisos: ["una_palabra"] };
  if (palabras.length === 2) return { nombres: palabras[0], apellidoPaterno: palabras[1], apellidoMaterno: null, avisos };

  if (palabras.length === 3) avisos.push("tres_palabras");
  if (palabras.slice(1).some((palabra) => PARTICULAS.has(palabra.toLocaleLowerCase("es")))) avisos.push("apellido_compuesto");
  return {
    nombres: palabras.slice(0, -2).join(" "),
    apellidoPaterno: palabras[palabras.length - 2],
    apellidoMaterno: palabras[palabras.length - 1],
    avisos,
  };
}
