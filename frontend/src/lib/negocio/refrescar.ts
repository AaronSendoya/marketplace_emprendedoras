import "server-only";
import { revalidatePath } from "next/cache";
import { RUTAS_NEGOCIO } from "./rutas";

// Después de guardar algo, se refresca todo el panel (inicio, perfil, productos y promociones):
// los conteos y los avisos del inicio dependen de los mismos datos que cambia cada formulario.
export function refrescarNegocio(): void {
  revalidatePath(RUTAS_NEGOCIO.inicio, "layout");
}
