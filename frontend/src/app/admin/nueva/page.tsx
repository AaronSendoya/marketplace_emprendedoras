import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPaginaAdmin } from "@/components/organisms/EncabezadoPaginaAdmin";
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
        className={`flex min-h-11 w-fit items-center gap-2 font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento lg:min-h-0 ${CLASES_FOCO_ENLACE}`}
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Volver a cuentas
      </Link>

      <EncabezadoPaginaAdmin
        titulo="Nueva cuenta de Emprendedora"
        descripcion="Se crea siempre con el rol Emprendedor; las cuentas Admin no se crean desde aquí."
      />

      <FormularioNuevaCuenta />
    </div>
  );
}
