"use client";

import { Percent } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { DescuentoFormularioModal } from "@/components/organisms/DescuentoFormularioModal";
import type { Descuento, ProductoPropio } from "@/lib/api/tipos";
import { accionesDescuentoNegocio } from "@/lib/negocio/acciones-formularios";
import { RUTAS_NEGOCIO } from "@/lib/negocio/rutas";
import { ordenarPromociones } from "@/lib/negocio/vigencia";
import { TarjetaPromocionNegocio } from "./TarjetaPromocionNegocio";

interface PropsPromocionesNegocio {
  perfilId: string;
  descuentos: Descuento[];
  productos: ProductoPropio[];
  // `?nueva=1` en la URL (el "Crear promoción" del inicio): abre el formulario al llegar.
  abrirCrear: boolean;
}

export function PromocionesNegocio({ perfilId, descuentos, productos, abrirCrear }: PropsPromocionesNegocio) {
  const router = useRouter();
  const [crearAbierto, setCrearAbierto] = useState(abrirCrear);
  const [abrirCrearPrevio, setAbrirCrearPrevio] = useState(abrirCrear);

  // Ver ProductosNegocio: reaccionar durante el render al cambio de la URL, sin efecto.
  if (abrirCrear !== abrirCrearPrevio) {
    setAbrirCrearPrevio(abrirCrear);
    if (abrirCrear) setCrearAbierto(true);
  }

  function cerrarCrear() {
    setCrearAbierto(false);
    if (abrirCrear) router.replace(RUTAS_NEGOCIO.promociones);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-texto sm:text-3xl">Mis promociones</h1>
          <p className="mt-1 max-w-xl font-cuerpo text-sm text-texto-secundario">
            Un descuento por porcentaje que aplica a los productos que elijas, durante las fechas que definas.
          </p>
        </div>
        <Button variante="promocion" onClick={() => setCrearAbierto(true)} className="min-h-11 shrink-0 sm:px-5">
          Crear promoción
        </Button>
      </div>

      {descuentos.length === 0 ? (
        <EstadoVacio
          icono={Percent}
          titulo="Todavía no tienes promociones"
          descripcion="Crea una, elige a qué productos aplica y cuándo empieza y termina."
          accion={{ etiqueta: "Crear promoción", onClick: () => setCrearAbierto(true) }}
          className="bg-superficie"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordenarPromociones(descuentos).map((descuento) => (
            <TarjetaPromocionNegocio key={descuento.id} descuento={descuento} perfilId={perfilId} productos={productos} />
          ))}
        </div>
      )}

      <DescuentoFormularioModal
        descuento={null}
        abierto={crearAbierto}
        onCerrar={cerrarCrear}
        acciones={accionesDescuentoNegocio(perfilId)}
        etiqueta="promoción"
      />
    </div>
  );
}
