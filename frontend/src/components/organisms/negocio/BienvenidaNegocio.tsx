import { Package, Percent, Store, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { CLASES_TARJETA_NEGOCIO } from "@/lib/estilos";
import { RUTAS_NEGOCIO } from "@/lib/negocio/rutas";

interface PropsBienvenidaNegocio {
  nombrePersona: string;
}

const PASOS: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  { Icono: Store, titulo: "Crea el perfil de tu negocio", texto: "Nombre, descripción, fotos y cómo contactarte." },
  { Icono: Package, titulo: "Agrega tus productos", texto: "Con foto y precio, para que aparezcan en tu catálogo." },
  { Icono: Percent, titulo: "Crea promociones", texto: "Un descuento por porcentaje en los productos que elijas." },
];

// Primera vez, todavía sin perfil: no hay nada que "administrar", así que el inicio se reduce a
// empezar por lo único posible. Las otras dos secciones se desbloquean al crear el perfil.
export function BienvenidaNegocio({ nombrePersona }: PropsBienvenidaNegocio) {
  const nombre = nombrePersona.split(" ")[0];

  return (
    <section aria-labelledby="titulo-bienvenida" className={`px-5 py-8 sm:px-10 sm:py-12 ${CLASES_TARJETA_NEGOCIO}`}>
      <p className="font-cuerpo text-xs font-semibold tracking-wider text-texto-secundario uppercase">Mi negocio</p>
      <h1 id="titulo-bienvenida" className="mt-2 font-titulo text-2xl font-extrabold tracking-tight text-texto sm:text-3xl">
        Te damos la bienvenida, {nombre}
      </h1>
      <p className="mt-3 max-w-xl font-cuerpo text-[15px] text-texto-secundario">
        Todavía no has creado el perfil de tu negocio. Es lo primero que ven tus clientes en el catálogo, y con él se habilitan tus productos y
        promociones.
      </p>

      <ol className="mt-8 grid gap-5 sm:grid-cols-3">
        {PASOS.map(({ Icono, titulo, texto }, indice) => (
          <li key={titulo} className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fondo text-texto-secundario">
              <Icono size={20} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <div>
              <p className="font-cuerpo text-sm font-semibold text-texto">
                <span className="sr-only">Paso {indice + 1}: </span>
                {titulo}
              </p>
              <p className="mt-0.5 font-cuerpo text-sm text-texto-secundario">{texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link href={RUTAS_NEGOCIO.perfil} className={`${clasesBoton("primario")} mt-8 min-h-11 w-full sm:w-auto sm:px-6`}>
        Crear el perfil de mi negocio
      </Link>
    </section>
  );
}
