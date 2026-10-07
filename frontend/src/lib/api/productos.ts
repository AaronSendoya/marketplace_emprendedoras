import { actualizarJsonAutenticado, enviarFormDataAutenticado, obtenerJson, obtenerJsonAutenticado, reemplazarFormDataAutenticado } from "./cliente";
import type { FiltrosProductos, Pagina, PaginaProductos, ParametrosPagina, ProductoPropio, ProductoPublico } from "./tipos";

// GET /marketplace/productos: Feed 2 (promociones), público. Regla 8 (backend): la vigencia del
// descuento se evalúa al consultar, así que no conviene cachear por más tiempo del que se
// tolere de retraso (valor por defecto del cliente: 30 s, ver cliente.ts). Con texto de búsqueda
// (`q`) no se cachea: la búsqueda en vivo pide una consulta distinta por cada pausa al escribir y
// guardarlas todas llenaría la caché de Next con textos que casi nadie repite.
export const listarProductos = (filtros: FiltrosProductos = {}) =>
  obtenerJson<PaginaProductos>("/marketplace/productos", { parametros: { ...filtros }, revalidarSegundos: filtros.q ? 0 : undefined });

export const obtenerProducto = (id: string) => obtenerJson<ProductoPublico>(`/marketplace/productos/${id}`);

// GET /admin/usuarios/{id}/productos (módulo "Emprendimientos"): todos los productos del perfil de
// esa cuenta, activos o no, con el precio real. Sin perfil, la lista viene vacía (no es un error).
export const listarProductosDeUsuario = (usuarioId: string, pagina: ParametrosPagina = {}) =>
  obtenerJsonAutenticado<Pagina<ProductoPropio>>(`/admin/usuarios/${usuarioId}/productos`, { parametros: { ...pagina } });

// GET /mis/productos (panel de la Emprendedora): mismo formato que el de arriba, pero de la cuenta
// autenticada. Sin perfil, la lista viene vacía.
export const listarMisProductos = (pagina: ParametrosPagina = {}) =>
  obtenerJsonAutenticado<Pagina<ProductoPropio>>("/mis/productos", { parametros: { ...pagina } });

// POST /productos (multipart/form-data): el FormData trae `perfil_id`, nombre, descripción, precio,
// mostrar_precio y la imagen (obligatoria), armados por el formulario del panel.
export const crearProductoAdmin = (formData: FormData) => enviarFormDataAutenticado<ProductoPropio>("/productos", formData);

export interface DatosEditarProducto {
  nombre?: string;
  descripcion?: string | null;
  precio?: number | null;
  mostrar_precio?: boolean;
  activo?: boolean;
}

// PATCH /productos/{id}: edita los campos de texto y también activa/desactiva (`activo`), para no
// necesitar una llamada aparte con DELETE solo para eso (mismo criterio que MenuAccionesCuenta con
// las cuentas).
export const editarProductoAdmin = (productoId: string, datos: DatosEditarProducto) =>
  actualizarJsonAutenticado<ProductoPropio>(`/productos/${productoId}`, datos);

// PUT /productos/{id}/imagen (multipart/form-data con `archivo`).
export const reemplazarImagenProducto = (productoId: string, formData: FormData) =>
  reemplazarFormDataAutenticado<ProductoPropio>(`/productos/${productoId}/imagen`, formData);
