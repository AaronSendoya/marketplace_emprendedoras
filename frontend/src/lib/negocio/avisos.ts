import type { Descuento, ProductoPropio } from "@/lib/api/tipos";
import { diasHastaLaPaz, formatearFechaLaPaz } from "@/lib/formato/fecha";
import { formatearPorcentaje } from "@/lib/formato/precio";
import { RUTAS_NEGOCIO, rutaNuevoProducto } from "./rutas";

export type TonoAviso = "atencion" | "promocion" | "programada" | "info";

export interface AvisoNegocio {
  id: string;
  tono: TonoAviso;
  texto: string;
  accion?: { etiqueta: string; href: string };
}

const DIAS_POR_VENCER = 7;
const MAXIMO_AVISOS = 4;

function cuandoTermina(dias: number): string {
  if (dias <= 0) return "termina hoy";
  if (dias === 1) return "termina mañana";
  return `termina en ${dias} días`;
}

// Orientación para la emprendedora, no un sistema de notificaciones: solo lo que sale de sus propios
// productos y promociones (/mis/productos y /mis/descuentos). La vigencia ya viene decidida por el
// backend en `estado` (regla 8); las fechas solo se usan para decir cuándo. No hay un aviso de
// "perfil incompleto": ningún endpoint de la Emprendedora lo informa (CLAUDE.md sección 6, regla 11).
// Las más urgentes van primero y se corta en MAXIMO_AVISOS.
export function calcularAvisos(productos: ProductoPropio[], descuentos: Descuento[], ahora: Date = new Date()): AvisoNegocio[] {
  const verPromociones = { etiqueta: "Ver promociones", href: RUTAS_NEGOCIO.promociones };
  const porcentaje = (descuento: Descuento) => formatearPorcentaje(descuento.porcentaje);

  const atencion: AvisoNegocio[] = [];
  const promociones: AvisoNegocio[] = [];
  const informativos: AvisoNegocio[] = [];

  const publicados = productos.filter((producto) => producto.activo).length;
  const ocultos = productos.length - publicados;

  if (productos.length === 0) {
    atencion.push({
      id: "sin-productos",
      tono: "atencion",
      texto: "Todavía no tienes productos. Agrega el primero para que aparezca en tu catálogo.",
      accion: { etiqueta: "Agregar producto", href: rutaNuevoProducto },
    });
  } else if (publicados === 0) {
    atencion.push({
      id: "sin-publicados",
      tono: "atencion",
      texto: "Ninguno de tus productos está publicado: tus clientes no ven nada en tu catálogo.",
      accion: { etiqueta: "Revisar", href: RUTAS_NEGOCIO.productos },
    });
  } else if (ocultos > 0) {
    informativos.push({
      id: "productos-ocultos",
      tono: "info",
      texto: `Tienes ${ocultos} ${ocultos === 1 ? "producto oculto: tus clientes no lo ven" : "productos ocultos: tus clientes no los ven"}.`,
      accion: { etiqueta: "Revisar", href: RUTAS_NEGOCIO.productos },
    });
  }

  const vigentes = descuentos.filter((descuento) => descuento.estado === "vigente");
  const programadas = descuentos.filter((descuento) => descuento.estado === "programado");

  const porVencer = new Set<string>();
  for (const descuento of vigentes) {
    if (!descuento.fecha_fin) continue;
    const dias = diasHastaLaPaz(descuento.fecha_fin, ahora);
    if (dias > DIAS_POR_VENCER) continue;
    porVencer.add(descuento.id);
    atencion.push({
      id: `por-vencer-${descuento.id}`,
      tono: "atencion",
      texto: `Tu promoción del ${porcentaje(descuento)} ${cuandoTermina(dias)}.`,
      accion: verPromociones,
    });
  }

  // Una promoción sin productos no le descuenta nada a nadie: es lo único de ella que pide acción, así
  // que reemplaza a su aviso de "vigente"/"empieza" en vez de sumarse (dos líneas sobre lo mismo).
  const sinProductos = new Set<string>();
  for (const descuento of [...vigentes, ...programadas]) {
    if (descuento.producto_ids.length > 0) continue;
    sinProductos.add(descuento.id);
    atencion.push({
      id: `sin-productos-${descuento.id}`,
      tono: "atencion",
      texto: `Tu promoción del ${porcentaje(descuento)} todavía no tiene productos.`,
      accion: { etiqueta: "Elegir productos", href: RUTAS_NEGOCIO.promociones },
    });
  }

  const vigentesSinAviso = vigentes.filter((descuento) => !porVencer.has(descuento.id) && !sinProductos.has(descuento.id));
  const programadasConAviso = programadas.filter((descuento) => !sinProductos.has(descuento.id));
  if (vigentesSinAviso.length > 2) {
    promociones.push({ id: "vigentes", tono: "promocion", texto: `Tienes ${vigentesSinAviso.length} promociones vigentes.`, accion: verPromociones });
  } else {
    for (const descuento of vigentesSinAviso) {
      promociones.push({
        id: `vigente-${descuento.id}`,
        tono: "promocion",
        texto: `Tu promoción del ${porcentaje(descuento)} está vigente${descuento.fecha_fin ? ` hasta el ${formatearFechaLaPaz(descuento.fecha_fin, "si-distinto", ahora)}` : ""}.`,
        accion: verPromociones,
      });
    }
  }

  if (programadasConAviso.length > 2) {
    promociones.push({ id: "programadas", tono: "programada", texto: `Tienes ${programadasConAviso.length} promociones programadas.`, accion: verPromociones });
  } else {
    for (const descuento of programadasConAviso) {
      promociones.push({
        id: `programada-${descuento.id}`,
        tono: "programada",
        texto: `Tu promoción del ${porcentaje(descuento)} empieza${descuento.fecha_inicio ? ` el ${formatearFechaLaPaz(descuento.fecha_inicio, "si-distinto", ahora)}` : " pronto"}.`,
        accion: verPromociones,
      });
    }
  }

  return [...atencion, ...promociones, ...informativos].slice(0, MAXIMO_AVISOS);
}
