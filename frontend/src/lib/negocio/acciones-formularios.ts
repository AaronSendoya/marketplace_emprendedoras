import type { AccionesAsignacion } from "@/components/organisms/AsignarProductosModal";
import type { AccionesFormularioDescuento } from "@/components/organisms/DescuentoFormularioModal";
import type { AccionesFormularioPerfil } from "@/components/organisms/PerfilFormulario";
import type { AccionesFormularioProducto } from "@/components/organisms/ProductoFormularioModal";
import { asignarDescuentoNegocioAction, crearDescuentoNegocioAction, editarDescuentoNegocioAction, quitarDescuentoNegocioAction } from "./descuentos-acciones";
import { crearPerfilNegocioAction, editarPerfilNegocioAction } from "./perfil-acciones";
import { crearProductoNegocioAction, editarProductoNegocioAction, reemplazarImagenProductoNegocioAction } from "./productos-acciones";

// Las acciones del panel de la Emprendedora que los formularios compartidos con el Admin reciben por
// prop (`acciones`). Viven en un módulo sin "use client" porque un valor exportado desde un archivo
// cliente llega a un Server Component como referencia, no como el objeto (la pantalla de perfil, que
// es de servidor, necesita ACCIONES_PERFIL_NEGOCIO).
export const ACCIONES_PRODUCTO_NEGOCIO: AccionesFormularioProducto = {
  crear: crearProductoNegocioAction,
  editar: editarProductoNegocioAction,
  reemplazarImagen: reemplazarImagenProductoNegocioAction,
};

// `crear` recibe el perfilId por bind (la emprendedora lo conoce por /mis/perfil) y los formularios
// llaman `acciones.crear(estado, formData)`: por eso el panel lo enlaza al montar el modal.
export function accionesDescuentoNegocio(perfilId: string): AccionesFormularioDescuento {
  return {
    crear: crearDescuentoNegocioAction.bind(null, perfilId),
    editar: editarDescuentoNegocioAction,
  };
}

export const ACCIONES_ASIGNACION_NEGOCIO: AccionesAsignacion = {
  asignar: asignarDescuentoNegocioAction,
  quitar: quitarDescuentoNegocioAction,
};

export const ACCIONES_PERFIL_NEGOCIO: AccionesFormularioPerfil = {
  crear: crearPerfilNegocioAction,
  editar: editarPerfilNegocioAction,
};
