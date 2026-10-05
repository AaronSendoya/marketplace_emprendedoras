"use server";

import { registrarClic } from "@/lib/api/metricas";
import type { TipoClic } from "@/lib/api/tipos";

// Dispara el registro del clic (regla 19). Nunca debe mostrarle nada al visitante ni bloquear la
// apertura del enlace de WhatsApp/Instagram: se llama fire-and-forget (sin await) desde un
// useTransition en el componente, y cualquier error se descarta acá mismo.
export async function registrarClicAction(perfilId: string, tipo: TipoClic): Promise<void> {
  try {
    await registrarClic(perfilId, tipo);
  } catch {
    // Un perfil inexistente, el backend caído, lo que sea: una métrica no entregada no es un
    // problema que el visitante deba ver ni que deba interrumpir la navegación.
  }
}
