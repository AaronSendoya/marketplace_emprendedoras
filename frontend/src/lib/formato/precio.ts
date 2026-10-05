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

// "15%" o "12,5%": hasta 2 decimales (el backend no admite más, regla 8) con coma decimal, sin
// ceros de relleno.
const formateadorPorcentaje = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 });

export function formatearPorcentaje(valor: number): string {
  return `${formateadorPorcentaje.format(valor)}%`;
}
