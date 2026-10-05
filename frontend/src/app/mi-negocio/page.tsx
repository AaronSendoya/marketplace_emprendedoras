import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { AvisosNegocio } from "@/components/organisms/negocio/AvisosNegocio";
import { BienvenidaNegocio } from "@/components/organisms/negocio/BienvenidaNegocio";
import { IdentidadNegocio } from "@/components/organisms/negocio/IdentidadNegocio";
import { TarjetasAdministrar } from "@/components/organisms/negocio/TarjetasAdministrar";
import { obtenerMe } from "@/lib/api/auth";
import { calcularAvisos } from "@/lib/negocio/avisos";
import { cargarDescuentos, cargarPerfil, cargarProductos } from "@/lib/negocio/datos";

export const metadata: Metadata = {
  title: "Mi negocio — Pista 8",
};

// Resumen: quién es el negocio, las tres cosas que se pueden administrar y un par de avisos. Todo
// sale de los endpoints de la propia emprendedora (/mis/*), sin analítica (sección 6, regla 11).
export default async function PaginaInicioNegocio() {
  const [usuario, perfil] = await Promise.all([obtenerMe(), cargarPerfil()]);
  if (!perfil) return <BienvenidaNegocio nombrePersona={usuario.nombres} />;

  const [productos, descuentos] = await Promise.all([cargarProductos(), cargarDescuentos()]);
  const avisos = calcularAvisos(productos, descuentos);

  return (
    <div className="space-y-10">
      <IdentidadNegocio
        perfil={perfil}
        nivelTitulo="h1"
        accion={
          <Link href={`/emprendedoras/${perfil.id}`} target="_blank" rel="noopener noreferrer" className={`${clasesBoton("secundario")} min-h-11 w-full sm:w-auto`}>
            <ExternalLink size={16} strokeWidth={1.6} aria-hidden="true" />
            Ver mi página pública
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </Link>
        }
      />

      <section aria-labelledby="titulo-administrar" className="space-y-4">
        <div>
          <p className="font-cuerpo text-xs font-semibold tracking-wider text-texto-secundario uppercase">Mi negocio</p>
          <h2 id="titulo-administrar" className="mt-1 font-titulo text-xl font-bold text-texto sm:text-2xl">
            ¿Qué quieres administrar?
          </h2>
        </div>
        <TarjetasAdministrar perfil={perfil} productos={productos} descuentos={descuentos} />
      </section>

      <AvisosNegocio avisos={avisos} />
    </div>
  );
}
