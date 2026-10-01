// El backend ya entrega el número saneado (solo dígitos con código de país, regla 2 backend:
// "Sanitización de WhatsApp"). Esta función solo arma el enlace wa.me; nunca vuelve a limpiar
// el número ni valida su formato.
export function enlaceWhatsapp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
