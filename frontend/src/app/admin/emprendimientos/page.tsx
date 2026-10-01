import { ChevronRight, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { Paginador } from "@/components/molecules/Paginador";
import { EmprendimientosToolbar } from "@/components/organisms/EmprendimientosToolbar";
import { SelectorLimite } from "@/components/organisms/SelectorLimite";
import { listarUsuarios } from "@/lib/api/admin";
import { obtenerPerfilDeUsuario } from "@/lib/api/perfiles";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { haySesion } from "@/lib/auth/sesion";

export const metadata: Metadata = {
  title: "Emprendimientos — Panel del Admin",
};

const LIMITE_POR_DEFECTO = 10;
const LIMITES_VALIDOS = [10, 50, 100];
// Techo de cuentas Emprendedor activas que esta pantalla sabe manejar en una sola pasada (ver
// comentario más abajo, sobre por qué la paginación se resuelve en memoria).
const TOPE_CUENTAS_ACTIVAS = 100;

function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export default async function PaginaEmprendimientos({ searchParams }: PageProps<"/admin/emprendimientos">) {
  if (!(await haySesion())) redirect("/iniciar-sesion");

  const parametros = await searchParams;
  const q = primerValor(parametros.q);
  const pagina = Number(primerValor(parametros.pagina)) || 1;
  const limiteParametro = Number(primerValor(parametros.limite));
  const limite = LIMITES_VALIDOS.includes(limiteParametro) ? limiteParametro : LIMITE_POR_DEFECTO;

  // El backend no filtra por rol en /admin/usuarios (regla 5: solo busca y filtra por estado), así
  // que esta pantalla pide de una sola vez hasta TOPE_CUENTAS_ACTIVAS cuentas activas que calcen con
  // `q` y se queda con las Emprendedor; la paginación de la tabla (pagina/limite de la URL) se
  // resuelve después, en memoria, sobre esa lista ya filtrada — paginar en el backend antes de
  // filtrar por rol daría un total inconsistente (una página podría traer menos Emprendedoras de
  // las que caben, por las cuentas Admin que también cuenta ese total).
  const { datos: cuentas } = await listarUsuarios({ q: q || undefined, estado: "activo", pagina: 1, limite: TOPE_CUENTAS_ACTIVAS });
  const emprendedoras = cuentas.filter((usuario) => usuario.rol === "Emprendedor");

  // N+1 deliberado: con el volumen de cuentas de este catálogo (decenas, no miles), traer el perfil
  // de cada fila es más simple que inventar un endpoint de "perfiles por lote", y esta pantalla no
  // se visita con la frecuencia del catálogo público.
  const perfiles = await Promise.all(emprendedoras.map((usuario) => obtenerPerfilDeUsuario(usuario.id)));
  const filas = emprendedoras.map((usuario, indice) => ({ usuario, perfil: perfiles[indice] }));

  const total = filas.length;
  const desde = total === 0 ? 0 : (pagina - 1) * limite;
  const paginaDeFilas = filas.slice(desde, desde + limite);
  const mostrandoDesde = total === 0 ? 0 : desde + 1;
  const mostrandoHasta = Math.min(desde + limite, total);

  function crearHref(nuevaPagina: number): string {
    const parametrosUrl = new URLSearchParams();
    if (q) parametrosUrl.set("q", q);
    if (limite !== LIMITE_POR_DEFECTO) parametrosUrl.set("limite", String(limite));
    parametrosUrl.set("pagina", String(nuevaPagina));
    return `/admin/emprendimientos?${parametrosUrl.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-titulo text-2xl font-extrabold text-texto">Emprendimientos</h1>
        <p className="mt-1 font-cuerpo text-sm text-texto-secundario">
          Administra el perfil, los productos y los descuentos de cada emprendedora activa.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-borde bg-superficie">
        <div className="border-b border-borde p-4">
          <EmprendimientosToolbar />
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <Store size={28} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            <p className="font-cuerpo text-sm font-medium text-texto">No se encontraron emprendedoras</p>
            <p className="font-cuerpo text-sm text-texto-secundario">
              {q ? "Prueba ajustar la búsqueda." : "Todavía no hay cuentas Emprendedor activas."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-cuerpo text-sm">
                <thead className="border-b border-borde bg-fondo">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                      Correo
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                      Negocio
                    </th>
                    <th scope="col" className="w-12 px-2 py-3">
                      <span className="sr-only">Administrar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {paginaDeFilas.map(({ usuario, perfil }) => (
                    <tr key={usuario.id} className="transition-colors hover:bg-fondo/60">
                      <td className="px-4 py-3 text-texto">
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <Avatar nombreCompleto={usuario.nombre_completo} />
                          <span className="font-medium">{usuario.nombre_completo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-texto-secundario">{usuario.email}</td>
                      <td className="px-4 py-3">
                        {perfil ? perfil.nombre_negocio : <Badge variante="neutro">Sin perfil</Badge>}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Link
                          href={`/admin/emprendimientos/${usuario.id}`}
                          className={`inline-flex items-center gap-1 rounded-md p-2 font-cuerpo text-sm font-medium text-acento transition-colors hover:text-acento-hover ${CLASES_FOCO_ENLACE}`}
                        >
                          Administrar
                          <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-borde px-4 py-3 sm:flex-row sm:justify-between">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <p className="font-cuerpo text-sm text-texto-secundario">
                  Mostrando {mostrandoDesde} a {mostrandoHasta} de {total} {total === 1 ? "resultado" : "resultados"}
                </p>
                <SelectorLimite valor={limite} />
              </div>
              <Paginador paginacion={{ pagina, limite, total }} crearHref={crearHref} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
