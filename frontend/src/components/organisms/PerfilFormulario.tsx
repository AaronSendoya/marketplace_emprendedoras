"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { EntradaArchivoImagen } from "@/components/atoms/EntradaArchivoImagen";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Textarea } from "@/components/atoms/Textarea";
import { crearPerfilAction, editarPerfilAction, type EstadoFormularioPerfil } from "@/lib/admin/perfiles-acciones";
import type { Perfil, ReferenciaCatalogo } from "@/lib/api/tipos";

const ESTADO_INICIAL: EstadoFormularioPerfil = {};

// Alta y edición del perfil. Por defecto son las acciones del Admin; el panel de la Emprendedora
// pasa las suyas (mismo formulario, otra ruta a revalidar y a dónde volver después de guardar).
export interface AccionesFormularioPerfil {
  crear: (estadoPrevio: EstadoFormularioPerfil, formData: FormData) => Promise<EstadoFormularioPerfil>;
  editar: (perfilId: string, estadoPrevio: EstadoFormularioPerfil, formData: FormData) => Promise<EstadoFormularioPerfil>;
}

interface PropsPerfilFormulario {
  // Solo lo manda un Admin (crea el perfil en nombre de una cuenta); una emprendedora crea el suyo.
  usuarioId?: string;
  perfil: Perfil | null;
  ciudades: ReferenciaCatalogo[];
  rubros: ReferenciaCatalogo[];
  acciones?: AccionesFormularioPerfil;
  // Enlace "Cancelar" antes del botón de guardar (el panel de la Emprendedora vuelve a la vista del
  // perfil); el Admin no lo usa.
  cancelarHref?: string;
}

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";

// Alta y edición comparten el mismo formulario de datos: la diferencia es si hay perfil (edición,
// PATCH sin imágenes) o no (alta, multipart con usuario_id y las dos imágenes, regla 18 backend).
export function PerfilFormulario({ usuarioId = "", perfil, ciudades, rubros, acciones, cancelarHref }: PropsPerfilFormulario) {
  const perfilId = perfil?.id ?? "";
  const accionCrear = acciones?.crear ?? crearPerfilAction.bind(null, usuarioId);
  const accionEditar = acciones ? acciones.editar.bind(null, perfilId) : editarPerfilAction.bind(null, perfilId, usuarioId);
  const [estado, accion, pendiente] = useActionState(perfil ? accionEditar : accionCrear, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-4">
      {!perfil && usuarioId && <input type="hidden" name="usuario_id" value={usuarioId} />}

      <div className="space-y-1">
        <label htmlFor="nombre_negocio" className={CLASES_LABEL}>
          Nombre del negocio
        </label>
        <Input id="nombre_negocio" name="nombre_negocio" defaultValue={perfil?.nombre_negocio} required disabled={pendiente} />
      </div>

      <div className="space-y-1">
        <label htmlFor="descripcion" className={CLASES_LABEL}>
          Descripción
        </label>
        <Textarea id="descripcion" name="descripcion" rows={3} defaultValue={perfil?.descripcion} required disabled={pendiente} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="whatsapp" className={CLASES_LABEL}>
            WhatsApp
          </label>
          <Input id="whatsapp" name="whatsapp" placeholder="+591 71234567" defaultValue={perfil?.whatsapp} required disabled={pendiente} />
        </div>
        <div className="space-y-1">
          <label htmlFor="instagram" className={CLASES_LABEL}>
            Instagram (opcional)
          </label>
          <Input id="instagram" name="instagram" placeholder="@mitienda" defaultValue={perfil?.instagram_username ?? ""} disabled={pendiente} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="otra_red_social" className={CLASES_LABEL}>
          Otra red social (opcional)
        </label>
        <Input id="otra_red_social" name="otra_red_social" defaultValue={perfil?.otra_red_social ?? ""} disabled={pendiente} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="ciudad_id" className={CLASES_LABEL}>
            Ciudad
          </label>
          <Select id="ciudad_id" name="ciudad_id" defaultValue={perfil?.ciudad.id} required disabled={pendiente}>
            <option value="" disabled>
              Selecciona una ciudad
            </option>
            {ciudades.map((ciudad) => (
              <option key={ciudad.id} value={ciudad.id}>
                {ciudad.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="rubro_id" className={CLASES_LABEL}>
            Rubro
          </label>
          <Select id="rubro_id" name="rubro_id" defaultValue={perfil?.rubro.id} required disabled={pendiente}>
            <option value="" disabled>
              Selecciona un rubro
            </option>
            {rubros.map((rubro) => (
              <option key={rubro.id} value={rubro.id}>
                {rubro.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {!perfil && (
        <div className="grid gap-4 border-t border-borde pt-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="foto_perfil" className={CLASES_LABEL}>
              Foto de perfil
            </label>
            <EntradaArchivoImagen id="foto_perfil" name="foto_perfil" accept="image/jpeg,image/png,image/webp" disabled={pendiente} />
            <label className="flex items-center gap-2 font-cuerpo text-xs text-texto-secundario">
              <input type="checkbox" name="usar_foto_predeterminada" value="true" disabled={pendiente} />
              Usar la foto predeterminada
            </label>
          </div>
          <div className="space-y-1">
            <label htmlFor="logo" className={CLASES_LABEL}>
              Logo
            </label>
            <EntradaArchivoImagen id="logo" name="logo" accept="image/jpeg,image/png,image/webp" disabled={pendiente} />
            <label className="flex items-center gap-2 font-cuerpo text-xs text-texto-secundario">
              <input type="checkbox" name="usar_logo_predeterminado" value="true" disabled={pendiente} />
              Usar el logo predeterminado
            </label>
          </div>
        </div>
      )}

      {estado.error && (
        <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
          {estado.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {cancelarHref && (
          <Link href={cancelarHref} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
            Cancelar
          </Link>
        )}
        <Button type="submit" disabled={pendiente} className="min-h-11 lg:min-h-0">
          {pendiente ? "Guardando…" : perfil ? "Guardar los cambios" : "Crear el perfil"}
        </Button>
      </div>
    </form>
  );
}
