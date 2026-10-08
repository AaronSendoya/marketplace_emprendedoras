import ExcelJS from "exceljs";
import type { ICatalogoRepository } from "@/core/catalogos/domain/ICatalogoRepository";
import type { CeldasDeFila } from "../domain/FilaImportacion";

// Datos de prueba de la importación (regla 22): el catálogo real de ciudades y rubros, los encabezados exactos del formulario
// de Google Forms y un generador de `.xlsx` sintéticos. Ninguna persona real: todo es inventado.

export const CIUDADES = ["La Paz", "Cochabamba", "Santa Cruz", "Tarija", "Sucre", "Potosí", "Oruro", "El Alto", "Cobija", "Trinidad"].map((nombre, i) => ({
  id: `ciudad-${i + 1}`,
  nombre,
}));

// Los 8 rubros oficiales del cliente (sección 3 de CLAUDE.md), en el orden alfabético en que los devuelve la API.
export const RUBROS = [
  "Alimentos y bebidas",
  "Artesanías o productos hechos a mano",
  "Belleza y cuidado personal",
  "Comercio",
  "Diseño o confección",
  "Manufactura",
  "Salud y bienestar",
  "Tecnología y servicios profesionales",
].map((nombre, i) => ({ id: `rubro-${i + 1}`, nombre }));

export const idDeCiudad = (nombre: string) => CIUDADES.find((c) => c.nombre === nombre)!.id;
export const idDeRubro = (nombre: string) => RUBROS.find((r) => r.nombre === nombre)!.id;

export const catalogoEnMemoria: ICatalogoRepository = {
  listarCiudades: async () => CIUDADES,
  listarRubros: async () => RUBROS,
};

// Los 14 encabezados del Excel real, en su orden, con el espacio final que trae el último.
export const ENCABEZADOS_DE_GOOGLE_FORMS = [
  "Marca temporal",
  "Dirección de correo electrónico",
  "Nombre Completo",
  "Número de WhatsApp",
  "Ciudad",
  "Sube tu foto",
  "Nombre de tu emprendimiento",
  "Breve descripción",
  "Sube el logo de tu emprendimiento",
  "Rubro",
  "Instagram de tu emprendimiento",
  "Otra red social",
  "¿Te gustaría ofrecer algo especial a las emprendedoras del Track de Mujeres 2026?",
  "Cuéntanos sobre tu beneficio ",
];

export const celdasDePrueba = (parches: CeldasDeFila = {}): CeldasDeFila => ({
  correo: "ana.perez@ejemplo.com",
  nombreCompleto: "Ana Maria Perez Rojas",
  whatsapp: "71234567",
  ciudad: "La Paz",
  emprendimiento: "Dulces de Ana",
  descripcion: "Postres caseros y tortas por encargo.",
  rubro: "Alimentos y bebidas",
  instagram: "@dulcesdeana",
  ...parches,
});

export type ValorDeCelda = string | number | Date | null;

// Una fila con las 14 columnas del formulario, en su orden (incluidas las que la importación ignora: marca temporal, fotos, logo
// y beneficio). El WhatsApp va como número, igual que lo guarda Excel.
export const filaDeFormulario = (parches: Partial<Record<ClaveFila, ValorDeCelda>> = {}): ValorDeCelda[] => {
  const base: Record<ClaveFila, ValorDeCelda> = {
    marca: new Date("2026-09-16T13:23:55Z"),
    correo: "ana.perez@ejemplo.com",
    nombre: "Ana María Pérez Rojas",
    whatsapp: 71234567,
    ciudad: "La Paz",
    foto: "https://drive.google.com/open?id=1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    emprendimiento: "Dulces de Ana",
    descripcion: "Postres caseros y tortas por encargo.",
    logo: "https://drive.google.com/open?id=1BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    rubro: "Alimentos y bebidas",
    instagram: "@dulcesdeana",
    otraRed: "",
    ofrece: "Si",
    beneficio: "10% de descuento en tortas",
    ...parches,
  };
  return [
    base.marca,
    base.correo,
    base.nombre,
    base.whatsapp,
    base.ciudad,
    base.foto,
    base.emprendimiento,
    base.descripcion,
    base.logo,
    base.rubro,
    base.instagram,
    base.otraRed,
    base.ofrece,
    base.beneficio,
  ];
};
type ClaveFila =
  | "marca"
  | "correo"
  | "nombre"
  | "whatsapp"
  | "ciudad"
  | "foto"
  | "emprendimiento"
  | "descripcion"
  | "logo"
  | "rubro"
  | "instagram"
  | "otraRed"
  | "ofrece"
  | "beneficio";

export interface OpcionesExcel {
  encabezados?: string[];
  filas: ValorDeCelda[][];
  nombreHoja?: string;
  // Números de fila (como los ve Excel) que quedan ocultos, como hace un filtro.
  ocultas?: number[];
  // Filas de texto antes de los encabezados (un título, por ejemplo).
  filasArriba?: string[][];
  // Hojas adicionales (nombre y filas).
  otrasHojas?: { nombre: string; filas: ValorDeCelda[][] }[];
}

// Un `.xlsx` real, escrito con la misma librería que lo lee: sirve para probar el lector y el análisis de punta a punta.
export async function crearExcelDePrueba({ encabezados = ENCABEZADOS_DE_GOOGLE_FORMS, filas, nombreHoja = "Respuestas de formulario 1", ocultas = [], filasArriba = [], otrasHojas = [] }: OpcionesExcel): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(nombreHoja);
  for (const arriba of filasArriba) hoja.addRow(arriba);
  hoja.addRow(encabezados);
  for (const fila of filas) hoja.addRow(fila);
  for (const numero of ocultas) hoja.getRow(numero).hidden = true;
  for (const otra of otrasHojas) {
    const extra = libro.addWorksheet(otra.nombre);
    for (const fila of otra.filas) extra.addRow(fila);
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}
