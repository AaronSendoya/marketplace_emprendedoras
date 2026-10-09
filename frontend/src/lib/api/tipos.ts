// Tipos calcados de backend/docs/openapi.json (fuente de verdad del contrato). No se declaran a
// mano sin mirar el esquema: un campo que falte o esté mal tipado aquí no lo avisa nadie hasta
// que algo se rompe en pantalla.

export interface ReferenciaCatalogo {
  id: string;
  nombre: string;
}

export type Ciudad = ReferenciaCatalogo;
export type Rubro = ReferenciaCatalogo;

// POST /perfiles/{id}/clics (regla 19): evento anónimo, sin ningún dato del visitante.
export type TipoClic = "whatsapp" | "instagram";

// GET /admin/metricas/resumen.
export interface ResumenClics {
  whatsapp: number;
  instagram: number;
}

// GET /admin/metricas/mapa-calor (regla 19): las cuentas con más clics del período, cruzadas con el
// tiempo. El backend decide qué representa cada columna según los días del período (hasta 45 días,
// un día; hasta 180, una semana de lunes a domingo; más, un mes) y recorta la primera y la última
// al período: el frontend solo dibuja lo que llega.
export type GranularidadMapaCalor = "dia" | "semana" | "mes";

// Con qué se arma y se ordena el top: los clics totales o los de un solo canal.
export type OrdenMapaCalor = "total" | "whatsapp" | "instagram";

// Días de La Paz (YYYY-MM-DD), ambos inclusive.
export interface ColumnaMapaCalor {
  inicio: string;
  fin: string;
}

export interface CeldaMapaCalor {
  whatsapp: number;
  instagram: number;
}

// `celdas` trae una por columna, en el mismo orden; los totales de la fila son la suma de sus celdas.
// `total_anterior` son los clics totales de la cuenta en el período inmediatamente anterior de igual
// duración (0 si no tuvo), con los que se calcula la tendencia.
export interface FilaMapaCalor {
  perfil_id: string;
  nombre_negocio: string;
  whatsapp: number;
  instagram: number;
  total: number;
  total_anterior: number;
  celdas: CeldaMapaCalor[];
}

export interface MapaCalorClics {
  granularidad: GranularidadMapaCalor;
  columnas: ColumnaMapaCalor[];
  filas: FilaMapaCalor[];
}

// GET /admin/metricas/serie: un punto por día de La Paz, completo (días sin clics vienen en 0).
export interface ItemSerieClic {
  fecha: string;
  whatsapp: number;
  instagram: number;
}

// GET /admin/metricas/por-rubro.
export interface ItemRubroClic {
  rubro: string;
  total: number;
}

export interface Health {
  estado: "ok";
  base_de_datos: "ok";
}

// Feed 1 (GET /perfiles, GET /perfiles/{id}). Regla 3 (backend): instagram_username y
// otra_red_social son independientes entre sí, ambos opcionales.
export interface Perfil {
  id: string;
  nombre_negocio: string;
  descripcion: string;
  whatsapp: string;
  instagram_username: string | null;
  otra_red_social: string | null;
  ciudad: ReferenciaCatalogo;
  rubro: ReferenciaCatalogo;
  emprendedora: string;
  foto_perfil_url: string;
  logo_url: string;
  creado_en: string;
  actualizado_en: string;
}

// Perfil resumido que trae cada producto (regla 8, backend): lo mínimo para mostrar el negocio
// dueño sin otra petición.
export interface PerfilResumen {
  id: string;
  nombre_negocio: string;
  whatsapp: string;
  ciudad: ReferenciaCatalogo;
  rubro: ReferenciaCatalogo;
  logo_url: string;
}

// Feed 2 (GET /marketplace/productos, GET /marketplace/productos/{id}). Reglas 7 y 8 (backend):
// el frontend nunca calcula precio, porcentaje ni cuándo mostrar "Consultar Precio"; ya vienen
// resueltos. Ver src/lib/formato/precio.ts para cómo se interpretan estos cuatro campos juntos.
export interface ProductoPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string;
  precio: number | null;
  porcentaje: number | null;
  precio_con_descuento: number | null;
  consultar_precio: boolean;
  creado_en: string;
  perfil: PerfilResumen;
}

// GET /admin/usuarios/{id}/productos (y GET /mis/productos, mismo formato): a diferencia de
// ProductoPublico, trae el precio real (aunque esté oculto), `mostrar_precio` y `activo` — lo que
// hace falta para administrar el producto, no solo para mostrarlo en el catálogo.
export interface ProductoPropio {
  id: string;
  perfil_id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string;
  precio: number | null;
  mostrar_precio: boolean;
  activo: boolean;
  porcentaje: number | null;
  precio_con_descuento: number | null;
  creado_en: string;
  actualizado_en: string;
}

// GET /admin/usuarios/{id}/descuentos (y GET /mis/descuentos, mismo formato). `estado` se calcula
// al consultar (regla 8, backend): el frontend no decide vigencia, solo la muestra.
// Calculado por el backend al consultar (regla 8), no es una columna: programado aún no empieza,
// vencido ya caducó.
export type EstadoDescuento = "programado" | "vigente" | "vencido";

export interface Descuento {
  id: string;
  perfil_id: string;
  porcentaje: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  // Detalle opcional que explica la promoción: hasta 280 caracteres (regla 8); `null` si no tiene.
  descripcion: string | null;
  estado: EstadoDescuento;
  producto_ids: string[];
  creado_en: string;
}

export interface Paginacion {
  pagina: number;
  limite: number;
  total: number;
}

export interface Pagina<T> {
  datos: T[];
  paginacion: Paginacion;
}

// `GET /perfiles`: `similares` es `true` cuando el texto buscado no tuvo ninguna coincidencia exacta y `datos` son
// perfiles parecidos (regla 20 del contrato compartido).
export interface PaginaPerfiles extends Pagina<Perfil> {
  similares: boolean;
}

// `GET /marketplace/productos`: lo mismo para los productos (regla 21).
export interface PaginaProductos extends Pagina<ProductoPublico> {
  similares: boolean;
}

// Códigos de error del backend (MATRIZ_PERMISOS.md, sección Convenciones). Cada uno tiene su
// código HTTP fijo; se usa para decidir cómo reaccionar (ej. 429 muestra el tiempo de espera),
// nunca para mostrar el `mensaje` crudo del backend como si fuera el único texto posible.
export type CodigoError =
  | "VALIDACION"
  | "NO_AUTENTICADO"
  | "PROHIBIDO"
  | "NO_ENCONTRADO"
  | "CONFLICTO"
  | "ARCHIVO_MUY_GRANDE"
  | "DEMASIADAS_SOLICITUDES"
  | "ERROR_INTERNO";

export interface DetalleError {
  campo: string;
  mensaje: string;
}

export interface ErrorRespuesta {
  error: {
    codigo: CodigoError;
    mensaje: string;
    detalles?: DetalleError[];
  };
}

// Parámetros compartidos por los dos feeds (GET /perfiles y GET /marketplace/productos):
// mismos nombres, mismos límites (openapi.json: limite 1-50 por defecto 20, pagina 1-100000).
export interface ParametrosPagina {
  pagina?: number;
  limite?: number;
}

export interface FiltrosPerfiles extends ParametrosPagina {
  ciudad_id?: string;
  rubro_id?: string;
  q?: string;
}

export interface FiltrosProductos extends ParametrosPagina {
  perfil_id?: string;
  ciudad_id?: string;
  rubro_id?: string;
  q?: string;
  // Regla 21 (backend, «Solo con descuento»): solo los productos con un descuento vigente (también con el precio oculto o
  // ausente). No se combina con `q`. Se manda como texto (`"true"`), que es lo que espera la API en la URL.
  con_descuento?: "true";
  // Regla 23 (backend): solo los productos asignados a ese descuento mientras rige (los de una promoción). No se combina con `q`.
  descuento_id?: string;
  // Regla 23: `aleatorio` exige `semilla` (la misma semilla da siempre el mismo orden) y no se combina con `q`.
  orden?: "recientes" | "aleatorio";
  semilla?: string;
}

// Promociones públicas (regla 23, backend; `docs/openapi.json`, GET /marketplace/promociones): un descuento que rige ahora, el negocio
// que lo ofrece y cuántos productos lleva. Los productos se piden aparte con `descuento_id`.
export interface PromocionPublica {
  id: string;
  porcentaje: number;
  descripcion: string | null;
  fecha_inicio: string | null;
  // `null` = sin fecha de fin (permanente).
  fecha_fin: string | null;
  productos_total: number;
  // Hasta 3 imágenes de esos productos (URLs).
  productos_muestra: string[];
  perfil: PerfilResumen;
}

export type OrdenPromociones = "recientes" | "aleatorio" | "mayor_descuento" | "termina_pronto";

export interface FiltrosPromociones extends ParametrosPagina {
  perfil_id?: string;
  ciudad_id?: string;
  rubro_id?: string;
  q?: string;
  orden?: OrdenPromociones;
  semilla?: string;
}

export type PaginaPromociones = Pagina<PromocionPublica>;

// GET /admin/usuarios (regla 5): busca por texto libre en nombres, apellidos y correo, y filtra
// por estado.
export interface FiltrosUsuarios extends ParametrosPagina {
  q?: string;
  estado?: "activo" | "inactivo";
}

// POST /auth/login. El rol y `activo` siempre se leen de la base en cada petición autenticada
// (regla 5, backend), nunca del token; por eso el frontend no los duplica en la cookie de sesión.
export type Rol = "Admin" | "Emprendedor";

export interface Usuario {
  id: string;
  email: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  nombre_completo: string;
  rol: Rol;
  activo: boolean;
  email_verificado_en: string | null;
  creado_en: string;
}

// POST /admin/usuarios. `password_temporal` es `null` cuando el Admin definió la contraseña él
// mismo; si el sistema la generó, viene una sola vez en esta respuesta (regla 12, backend: no se
// puede recuperar después, el Admin debe copiarla y entregarla ahora).
export interface UsuarioCreado {
  usuario: Usuario;
  password_temporal: string | null;
}

// DELETE /admin/usuarios/{id}: lo que se eliminó junto con la cuenta (regla 5, backend).
export interface CuentaEliminada {
  perfiles: number;
  productos: number;
  descuentos: number;
  clics: number;
  imagenes: number;
}

// Respuesta genérica de confirmación (ej. POST /admin/usuarios/verificacion-correo).
export interface Mensaje {
  mensaje: string;
}

export interface LoginRespuesta {
  token: string;
  usuario: Usuario;
}

// Importación de emprendedoras desde Excel (regla 22, backend; `docs/openapi.json`, tag "Importaciones"). Los mensajes de cada
// aviso los arma el backend: el frontend los muestra tal cual.
export type EstadoFilaImportacion = "lista" | "revisar" | "error" | "ya_existe" | "repetida";

export interface AvisoImportacion {
  campo: string;
  codigo: string;
  severidad: "error" | "revisar" | "info";
  mensaje: string;
  // También va al reporte "por revisar" que se descarga al terminar.
  reporte: boolean;
}

// Lo que la vista previa muestra y el Admin corrige de cada fila, y lo que `validar` e `importar` reciben de vuelta.
export interface DatosFilaImportacion {
  correo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  whatsapp: string;
  ciudad_id: string;
  ciudad_texto: string;
  rubro_id: string;
  rubro_texto: string;
  nombre_negocio: string;
  descripcion: string;
  instagram: string;
  otra_red_social: string;
}

export interface FilaAnalizadaImportacion {
  fila: number;
  oculta: boolean;
  estado: EstadoFilaImportacion;
  datos: DatosFilaImportacion;
  avisos: AvisoImportacion[];
  ya_existe: boolean;
  repetida_de: number | null;
  // Lo que decían las columnas de Instagram y de otra red social, para el reporte "por revisar".
  textos: { instagram: string; otra_red: string };
}

// Cómo se leyeron los encabezados del archivo (regla 22, «Tolerancia con el formato»): el archivo se acepta aunque falten
// columnas o traiga otras, y la vista previa lo dice.
export interface ColumnasAnalisisImportacion {
  reconocidas: string[];
  // Se ignoran a propósito: marca temporal, fotos, logo y beneficio.
  ignoradas: string[];
  opcionales_ausentes: string[];
  // Obligatorias que el archivo no trae: cada fila queda con el error de ese dato y se completa en la vista previa.
  obligatorias_ausentes: string[];
  // No se parecen a ninguna columna esperada: no se usan.
  desconocidas: string[];
  // Se leyeron como una columna esperada por parecerse a ella (una errata): el Admin lo confirma.
  aproximadas: { encabezado: string; columna: string }[];
}

export interface AnalisisImportacion {
  hoja: string;
  hojas: string[];
  columnas: ColumnasAnalisisImportacion;
  filas: FilaAnalizadaImportacion[];
  resumen: { total: number; listas: number; revisar: number; con_error: number; ya_existen: number; repetidas: number; ocultas: number };
}

export interface FilaAValidarImportacion {
  fila: number;
  datos: DatosFilaImportacion;
}

export interface ValidacionFilaImportacion {
  fila: number;
  estado: EstadoFilaImportacion;
  avisos: AvisoImportacion[];
  ya_existe: boolean;
}

export interface ResultadoFilaImportacion {
  fila: number;
  correo: string;
  estado: "creada" | "omitida" | "error";
  cuenta_creada: boolean;
  perfil_creado: boolean;
  // Solo si se creó la cuenta, y solo en esta respuesta: nunca se guarda en el servidor (regla 5).
  password_temporal: string | null;
  avisos: AvisoImportacion[];
  mensaje: string | null;
}
