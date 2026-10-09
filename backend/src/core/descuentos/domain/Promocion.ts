// Regla 23: una promoción pública es un descuento (regla 8) que rige ahora, de una cuenta activa y con al menos un producto activo
// asignado. Es lo que ve cualquier visitante en la vista de Promociones: nunca datos de la persona dueña.
export interface PromocionPublica {
  id: string;
  porcentaje: number;
  // Detalle opcional que explica la promoción (regla 8); nulo si no tiene.
  descripcion: string | null;
  fechaInicio: Date | null;
  // Nulo = sin fecha de fin (permanente).
  fechaFin: Date | null;
  creadoEn: Date;
  // Cuántos productos activos lo llevan.
  productosTotal: number;
  // Las claves de imagen de hasta MAXIMO_EN_MUESTRA de esos productos, los más recientes primero.
  productosMuestra: string[];
  perfil: {
    id: string;
    nombreNegocio: string;
    whatsapp: string;
    ciudad: { id: string; nombre: string };
    rubro: { id: string; nombre: string };
    logoKey: string;
  };
}

export const MAXIMO_EN_MUESTRA = 3;

export type OrdenPromociones = "recientes" | "aleatorio" | "mayor_descuento" | "termina_pronto";

export interface FiltrosPromociones {
  ciudadId?: string;
  rubroId?: string;
  perfilId?: string;
  // Cada palabra (hasta 6) debe aparecer en el nombre del negocio o en el texto del descuento.
  q?: string;
  orden?: OrdenPromociones;
  // Obligatoria con `aleatorio`: la misma semilla da siempre el mismo orden (regla 23).
  semilla?: string;
}
