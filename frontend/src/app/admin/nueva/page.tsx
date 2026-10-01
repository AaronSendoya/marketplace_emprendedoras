import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioNuevaCuenta } from "@/components/organisms/FormularioNuevaCuenta";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

export const metadata: Metadata = {
  title: "Nueva cuenta — Panel del Admin",
};

export default function PaginaNuevaCuenta() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className={`flex w-fit items-center gap-2 font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Volver a cuentas
      </Link>

      <div>
        <h1 className="font-titulo text-2xl font-extrabold text-texto">Nueva cuenta de Emprendedora</h1>
        <p className="font-cuerpo text-sm text-texto-secundario">
          Se crea siempre con el rol Emprendedor; las cuentas Admin no se crean desde aquí.
        </p>
      </div>

      <FormularioNuevaCuenta />
    </div>
  );
}
