import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";

// Cubre dos casos (docs/file-conventions/not-found.md): una URL que no coincide con ninguna
// ruta, y cualquier notFound() de un segmento que no tenga su propio not-found.tsx.
export default function PaginaNoEncontrada() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-titulo text-xl font-bold text-texto">Página no encontrada</h1>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">
        La página que buscas no existe o cambió de dirección.
      </p>
      <Link href="/" className={clasesBoton("primario")}>
        Volver al inicio
      </Link>
    </main>
  );
}
