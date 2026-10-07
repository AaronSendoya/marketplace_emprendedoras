import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { EmprendedoraCard } from "@/components/molecules/EmprendedoraCard";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { listarPerfiles } from "@/lib/api/perfiles";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

const LIMITE = 6;

// Vitrina de la landing: perfiles de verdad, no datos de ejemplo (responde a la crítica de que la Home no mostraba
// nada real). Server Component async: se llama al backend directo, sin pasar por un efecto en el cliente. Si el
// catálogo está vacío la sección no se rompe, solo no muestra nada: nunca un placeholder inventado en su lugar.
// Las tarjetas entran una tras otra al cargar (regla 6).
// El botón "Ver todas" es un contorno, no un enlace de texto suelto (regla 14).
export async function VitrinaEmprendedoras() {
  const { datos: perfiles } = await listarPerfiles({ limite: LIMITE });
  if (perfiles.length === 0) return null;

  return (
    <section className={`mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-8 px-4 py-14 sm:px-6 sm:py-16 lg:px-8`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="font-titulo text-2xl font-extrabold tracking-tight text-texto sm:text-[1.75rem]">Conoce a nuestras emprendedoras</h2>
          <p className="font-cuerpo text-[0.9375rem] text-texto-secundario">Algunos de los negocios de la comunidad Track de Mujeres.</p>
        </div>
        <Link href="/emprendedoras" className={clasesBoton("contorno", "", "compacto")}>
          Ver todas
          <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>

      <CatalogGrid>
        {perfiles.map((perfil) => (
          <EmprendedoraCard key={perfil.id} perfil={perfil} />
        ))}
      </CatalogGrid>
    </section>
  );
}
