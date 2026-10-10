import { notFound } from "next/navigation";
import type { ReactNode } from "react";

// Todo lo que cuelga de /dev es de desarrollo (hoy, la vitrina /dev/componentes con datos de ejemplo): fuera de él responde 404,
// como la documentación Swagger del backend (regla 17). El build de producción la incluye, pero nunca la sirve.
export default function LayoutDesarrollo({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
