"use client";

import { Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { ProductoFormularioModal } from "@/components/organisms/ProductoFormularioModal";
import type { ProductoPropio } from "@/lib/api/tipos";
import { ACCIONES_PRODUCTO_NEGOCIO } from "@/lib/negocio/acciones-formularios";
import { RUTAS_NEGOCIO } from "@/lib/negocio/rutas";
import { TarjetaProductoNegocio } from "./TarjetaProductoNegocio";

interface PropsProductosNegocio {
  productos: ProductoPropio[];
  // `?nuevo=1` en la URL (el "Agregar producto" del inicio): abre el formulario al llegar.
  abrirCrear: boolean;
}

export function ProductosNegocio({ productos, abrirCrear }: PropsProductosNegocio) {
  const router = useRouter();
  const [crearAbierto, setCrearAbierto] = useState(abrirCrear);
  const [abrirCrearPrevio, setAbrirCrearPrevio] = useState(abrirCrear);

  // Si ya estamos en esta pantalla y la URL vuelve a pedir el formulario, se abre; no hace falta un
  // efecto, basta reaccionar al cambio del valor durante el render.
  if (abrirCrear !== abrirCrearPrevio) {
    setAbrirCrearPrevio(abrirCrear);
    if (abrirCrear) setCrearAbierto(true);
  }

  function cerrarCrear() {
    setCrearAbierto(false);
    // Quita `?nuevo=1`: si no, recargar la página volvería a abrir el formulario.
    if (abrirCrear) router.replace(RUTAS_NEGOCIO.productos);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-texto sm:text-3xl">Mis productos</h1>
          <p className="mt-1 max-w-xl font-cuerpo text-sm text-texto-secundario">
            Los productos publicados aparecen en tu catálogo; los ocultos no, pero siguen guardados.
          </p>
        </div>
        <Button onClick={() => setCrearAbierto(true)} className="min-h-11 shrink-0 sm:px-5">
          Agregar producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <EstadoVacio
          icono={Package}
          titulo="Todavía no tienes productos"
          descripcion="Agrega el primero, con su foto y su precio, para que tus clientes lo vean en tu catálogo."
          accion={{ etiqueta: "Agregar tu primer producto", onClick: () => setCrearAbierto(true) }}
          className="bg-superficie"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {productos.map((producto) => (
            <TarjetaProductoNegocio key={producto.id} producto={producto} />
          ))}
        </div>
      )}

      <ProductoFormularioModal producto={null} abierto={crearAbierto} onCerrar={cerrarCrear} acciones={ACCIONES_PRODUCTO_NEGOCIO} />
    </div>
  );
}
