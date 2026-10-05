import { House, Package, Percent, Store, type LucideIcon } from "lucide-react";
import { RUTAS_NEGOCIO } from "@/lib/negocio/rutas";

export interface ElementoNavegacionNegocio {
  href: string;
  etiqueta: string;
  // Texto de la barra inferior del móvil, donde cuatro pestañas no admiten "Mis productos".
  etiquetaCorta: string;
  Icono: LucideIcon;
  // Productos y Promociones necesitan un perfil (el backend responde 409 "Primero crea tu perfil"):
  // sin perfil no se ofrecen, igual que el Admin no muestra esas pestañas.
  soloConPerfil: boolean;
}

const ELEMENTOS: ElementoNavegacionNegocio[] = [
  { href: RUTAS_NEGOCIO.inicio, etiqueta: "Resumen", etiquetaCorta: "Resumen", Icono: House, soloConPerfil: false },
  { href: RUTAS_NEGOCIO.perfil, etiqueta: "Mi perfil", etiquetaCorta: "Perfil", Icono: Store, soloConPerfil: false },
  { href: RUTAS_NEGOCIO.productos, etiqueta: "Mis productos", etiquetaCorta: "Productos", Icono: Package, soloConPerfil: true },
  { href: RUTAS_NEGOCIO.promociones, etiqueta: "Mis promociones", etiquetaCorta: "Promociones", Icono: Percent, soloConPerfil: true },
];

export function elementosNavegacion(tienePerfil: boolean): ElementoNavegacionNegocio[] {
  return ELEMENTOS.filter((elemento) => tienePerfil || !elemento.soloConPerfil);
}

// El href más largo que calce gana: "/mi-negocio" es prefijo de todos los demás, así que un simple
// "empieza con" dejaría "Resumen" encendido en cualquier pantalla (mismo criterio que AdminSidebar).
export function hrefActivoNegocio(pathname: string, elementos: ElementoNavegacionNegocio[]): string | undefined {
  const candidatos = elementos.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
