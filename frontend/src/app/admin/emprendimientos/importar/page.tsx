import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPaginaAdmin } from "@/components/organisms/EncabezadoPaginaAdmin";
import { ImportadorEmprendedoras } from "@/components/organisms/importacion/ImportadorEmprendedoras";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

export const metadata: Metadata = {
  title: "Importar emprendedoras — Panel del Admin",
};

// Regla 22 (backend): crear muchas cuentas y perfiles de una vez desde el Excel de Google Forms. El layout de /admin ya exige una
// sesión de Admin. Los catálogos llegan aquí (y no se piden desde el navegador) porque la vista previa deja corregir la ciudad y
// el rubro de cada fila.
export default async function PaginaImportarEmprendedoras() {
  const [ciudades, rubros] = await Promise.all([listarCiudades(), listarRubros()]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/emprendimientos"
        className={`flex min-h-11 w-fit items-center gap-2 font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento lg:min-h-0 ${CLASES_FOCO_ENLACE}`}
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Volver a emprendimientos
      </Link>

      <EncabezadoPaginaAdmin
        titulo="Importar emprendedoras desde Excel"
        descripcion="Arrastra el archivo de respuestas de Google Forms para crear varias cuentas y perfiles de una vez. Las fotos y los logos se cargan desde Drive si conectas una cuenta de Google con acceso a la carpeta."
      />

      <ImportadorEmprendedoras ciudades={ciudades} rubros={rubros} />
    </div>
  );
}
