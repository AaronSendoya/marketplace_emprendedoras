import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";

// Mismo criterio que PaginaEmprendimientoDetalle (notFound()): id inválido, cuenta inexistente,
// Admin (sin perfil) o cuenta suspendida — todos fuera de alcance de este módulo.
export default function EmprendimientoNoEncontrado() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="font-titulo text-xl font-bold text-texto">No encontramos esta emprendedora</h1>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">
        La cuenta no existe, no es una Emprendedor activa, o el enlace está mal escrito.
      </p>
      <Link href="/admin/emprendimientos" className={clasesBoton("primario")}>
        Volver a Emprendimientos
      </Link>
    </div>
  );
}
