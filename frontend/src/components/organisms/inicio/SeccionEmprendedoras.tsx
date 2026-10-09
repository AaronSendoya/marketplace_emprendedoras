import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { EmprendedoraCard } from "@/components/molecules/EmprendedoraCard";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { cargarEmprendedoras, MAXIMO_EN_CARRUSEL, MINIMO_PARA_CARRUSEL } from "@/lib/inicio/datos";
import { muestraAleatoria } from "@/lib/inicio/muestra";
import { CarruselTarjetas } from "./CarruselTarjetas";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

// Con 1 o 2 emprendedoras: lo que ocupan las tarjetas y, en el resto de la fila, un panel que invita al catálogo (para que la
// sección no sea una tarjeta sola en un hueco enorme). Con dos, el panel ocupa una fila entera desde `md` (dos columnas).
const COLUMNAS_DEL_PANEL: Record<number, string> = { 1: "md:col-span-1 rejilla:col-span-2", 2: "md:col-span-2 rejilla:col-span-1" };

// «¿Quién está?» (CLAUDE.md sección 6, regla 14, punto k). Todas las emprendedoras activas entran en el sorteo: el orden es al azar en
// cada visita (lo decide este componente en el servidor) y se muestran hasta 24; el botón del encabezado lleva el total real. Sin
// emprendedoras la sección no se dibuja: nunca se inventan.
export async function SeccionEmprendedoras() {
  const { elementos: perfiles, total } = await cargarEmprendedoras();
  if (perfiles.length === 0) return null;

  const muestra = muestraAleatoria(perfiles, MAXIMO_EN_CARRUSEL);
  const conCarrusel = muestra.length >= MINIMO_PARA_CARRUSEL;

  return (
    <section aria-labelledby="inicio-emprendedoras" className="pt-16 pb-16 sm:pt-20 sm:pb-20">
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} px-4 sm:px-6 lg:px-8`}>
        <EncabezadoSeccion
          id="inicio-emprendedoras"
          eyebrow="Emprendedoras"
          titulo="Conoce a quienes están detrás de cada negocio"
          bajada="Perfiles reales de la comunidad. Mira qué ofrecen y escríbeles directo."
          accion={
            <Link href="/emprendedoras" className={clasesBoton("contorno", "", "compacto")}>
              {total >= MINIMO_PARA_CARRUSEL ? `Ver las ${total} emprendedoras` : "Ver todas las emprendedoras"}
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          }
        />

        {conCarrusel ? (
          <CarruselTarjetas etiqueta="Emprendedoras" ritmoMs={5000} tono="acento">
            {muestra.map((perfil) => (
              <EmprendedoraCard key={perfil.id} perfil={perfil} />
            ))}
          </CarruselTarjetas>
        ) : (
          <div className="entrada-escalonada grid grid-cols-1 gap-6 md:grid-cols-2 rejilla:grid-cols-3">
            {muestra.map((perfil) => (
              <EmprendedoraCard key={perfil.id} perfil={perfil} />
            ))}
            <div className={`flex flex-col justify-center gap-4 rounded-superficie bg-pie p-8 text-white shadow-tarjeta sm:p-10 ${COLUMNAS_DEL_PANEL[muestra.length]}`}>
              <h3 className="font-titulo text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-[1.75rem]">El catálogo crece con cada emprendedora que se suma</h3>
              <p className="max-w-md font-cuerpo text-base text-pie-texto">Mira el catálogo completo para ver todos los negocios y filtrarlos por ciudad o por rubro.</p>
              <Link href="/emprendedoras" className={clasesBoton("primario", "mt-2 self-start", "grande")}>
                Ver todas las emprendedoras
                <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
