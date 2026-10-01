// Formatea un monto en bolivianos para mostrarlo. NUNCA calcula precios con descuento ni decide
// vigencia (reglas 7 y 8, backend): ese cálculo ya llega resuelto en precio_con_descuento.
const formateador = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
  minimumFractionDigits: 2,
});

export function formatearPrecio(monto: number): string {
  return formateador.format(monto);
}
