// El backend ya entrega el número saneado (solo dígitos con código de país, regla 2 backend:
// "Sanitización de WhatsApp"). Esta función solo arma el enlace wa.me; nunca vuelve a limpiar
// el número ni valida su formato.
export function enlaceWhatsapp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

// Solo para mostrarlo legible ("59171234567" → "+591 71234567"). Un celular boliviano se separa
// del código de país; cualquier otro número se muestra con el "+" delante, sin adivinar su formato.
export function formatearWhatsapp(numero: string): string {
  if (numero.startsWith("591") && numero.length === 11) return `+591 ${numero.slice(3)}`;
  return `+${numero}`;
}
