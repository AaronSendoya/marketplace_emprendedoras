import type { Metadata } from "next";
import { PantallaConexionGoogle } from "@/components/organisms/importacion/PantallaConexionGoogle";
import { motivoDeFallo } from "@/lib/google/oauth";

export const metadata: Metadata = {
  title: "Conexión con Google — Panel del Admin",
  robots: { index: false, follow: false },
};

// Donde termina la ventana de «Conectar cuenta de Google» (reglas 17 y 22). No es parte del panel (sin menú lateral): se abre en
// una ventana aparte. Solo recibe `estado=ok` o `estado=error&motivo=<código>`; nunca el token ni la cuenta. Un motivo que no
// esté en la lista queda como «no disponible», así que un enlace armado a mano no puede mostrar un texto inventado.
export default async function PaginaConexionGoogle({ searchParams }: PageProps<"/conexion-google">) {
  const { estado, motivo } = await searchParams;
  const conectada = estado === "ok";
  return <PantallaConexionGoogle conectada={conectada} motivo={motivoDeFallo(Array.isArray(motivo) ? motivo[0] : motivo)} />;
}
