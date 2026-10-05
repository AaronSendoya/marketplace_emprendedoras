// Rutas del panel de la Emprendedora ("Mi negocio"). Un solo lugar para la navegación, los avisos
// y las acciones (revalidar y redirigir), en vez de repetir el texto de cada ruta.
export const RUTAS_NEGOCIO = {
  inicio: "/mi-negocio",
  perfil: "/mi-negocio/perfil",
  productos: "/mi-negocio/productos",
  promociones: "/mi-negocio/promociones",
} as const;

// Los parámetros que abren directo un formulario desde el inicio ("Agregar producto", "Crear
// promoción", "Editar perfil") sin que la pantalla de destino guarde estado propio: la URL lo dice.
export const PARAMETROS_NEGOCIO = {
  nuevoProducto: "nuevo",
  nuevaPromocion: "nueva",
  editarPerfil: "editar",
  perfilGuardado: "guardado",
} as const;

export const rutaNuevoProducto = `${RUTAS_NEGOCIO.productos}?${PARAMETROS_NEGOCIO.nuevoProducto}=1`;
export const rutaNuevaPromocion = `${RUTAS_NEGOCIO.promociones}?${PARAMETROS_NEGOCIO.nuevaPromocion}=1`;
export const rutaEditarPerfil = `${RUTAS_NEGOCIO.perfil}?${PARAMETROS_NEGOCIO.editarPerfil}=1`;
