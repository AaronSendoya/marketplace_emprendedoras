import { ChevronRight, FileSpreadsheet, Plus, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { Paginador } from "@/components/molecules/Paginador";
import { EncabezadoPaginaAdmin } from "@/components/organisms/EncabezadoPaginaAdmin";
import { EmprendimientosToolbar } from "@/components/organisms/EmprendimientosToolbar";
import { filtroPerfilDeLaUrl, FiltroPerfilEmprendimiento, FILTROS_PERFIL, ETIQUETA_FILTRO_PERFIL, type FiltroPerfil } from "@/components/organisms/FiltroPerfilEmprendimiento";
import { SelectorLimite } from "@/components/organisms/SelectorLimite";
import { listarUsuarios } from "@/lib/api/admin";
import { obtenerPerfilDeUsuario } from "@/lib/api/perfiles";
import { CLASES_FOCO_ENLACE, CLASES_PANEL_ADMIN } from "@/lib/estilos";
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
  const filtroPerfil = filtroPerfilDeLaUrl(primerValor(parametros.perfil));

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

  // Cuántas tienen y cuántas no tienen perfil, dentro de la búsqueda: salen antes de filtrar y de paginar,
  // así los números de los botones no cambian al elegir uno.
  const cantidades: Record<FiltroPerfil, number> = {
    todas: filas.length,
    con: filas.filter((fila) => fila.perfil !== null).length,
    sin: filas.filter((fila) => fila.perfil === null).length,
  };

  // El filtro por perfil va ANTES de paginar (como la búsqueda): el total, las páginas y el "Mostrando
  // x a y de z" cuentan solo lo filtrado.
  const filasFiltradas = filtroPerfil === "todas" ? filas : filas.filter((fila) => (filtroPerfil === "con") === (fila.perfil !== null));

  const total = filasFiltradas.length;
  const desde = total === 0 ? 0 : (pagina - 1) * limite;
  const paginaDeFilas = filasFiltradas.slice(desde, desde + limite);
  const mostrandoDesde = total === 0 ? 0 : desde + 1;
  const mostrandoHasta = Math.min(desde + limite, total);

  function crearHref(nuevaPagina: number): string {
    const parametrosUrl = new URLSearchParams();
    if (q) parametrosUrl.set("q", q);
    if (limite !== LIMITE_POR_DEFECTO) parametrosUrl.set("limite", String(limite));
    if (filtroPerfil !== "todas") parametrosUrl.set("perfil", filtroPerfil);
    parametrosUrl.set("pagina", String(nuevaPagina));
    return `/admin/emprendimientos?${parametrosUrl.toString()}`;
  }

  // Cambiar de filtro vuelve a la primera página: sin `pagina`.
  function crearHrefFiltro(filtro: FiltroPerfil): string {
    const parametrosUrl = new URLSearchParams();
    if (q) parametrosUrl.set("q", q);
    if (limite !== LIMITE_POR_DEFECTO) parametrosUrl.set("limite", String(limite));
    if (filtro !== "todas") parametrosUrl.set("perfil", filtro);
    const consulta = parametrosUrl.toString();
    return consulta ? `/admin/emprendimientos?${consulta}` : "/admin/emprendimientos";
  }

  return (
    <div className="space-y-8">
      <EncabezadoPaginaAdmin
        titulo="Emprendimientos"
        descripcion={
          <>
            Administra el perfil, los productos y los descuentos de cada emprendedora activa.
            {cantidades.sin > 0 && (
              <span className="mt-2 block font-medium text-texto">
                {cantidades.sin} de {cantidades.todas} {cantidades.todas === 1 ? "emprendedora" : "emprendedoras"}
                {q && " en esta búsqueda"} todavía {cantidades.sin === 1 ? "no tiene" : "no tienen"} perfil.
                {filtroPerfil !== "sin" && (
                  <>
                    {" "}
                    <Link href={crearHrefFiltro("sin")} className={`font-semibold text-acento hover:text-acento-hover ${CLASES_FOCO_ENLACE}`}>
                      Ver cuáles
                    </Link>
                  </>
                )}
              </span>
            )}
          </>
        }
        acciones={
          <Link href="/admin/emprendimientos/importar" className={clasesBoton("secundario", "min-h-11 w-full sm:w-auto lg:min-h-0")}>
            <FileSpreadsheet size={16} strokeWidth={1.75} aria-hidden="true" />
            Importar desde Excel
          </Link>
        }
      />

      <div className={`${CLASES_PANEL_ADMIN} overflow-hidden`}>
        <div className="space-y-3 border-b border-borde p-4 sm:p-5">
          <EmprendimientosToolbar />
          <FiltroPerfilEmprendimiento
            activo={filtroPerfil}
            opciones={FILTROS_PERFIL.map((filtro) => ({ filtro, cantidad: cantidades[filtro], href: crearHrefFiltro(filtro) }))}
          />
        </div>

        {total === 0 ? (
          <div className="p-4">
            <EstadoVacio
              icono={Store}
              titulo={filtroPerfil === "todas" ? "No se encontraron emprendedoras" : `No hay emprendedoras ${ETIQUETA_FILTRO_PERFIL[filtroPerfil].toLowerCase()}`}
              descripcion={
                filtroPerfil !== "todas"
                  ? q
                    ? "Prueba ajustar la búsqueda o elegir otro filtro."
                    : "Prueba con otro filtro."
                  : q
                    ? "Prueba ajustar la búsqueda."
                    : "Todavía no hay cuentas Emprendedor activas."
              }
            />
          </div>
        ) : (
          <>
            {/* Angosto: tarjetas apiladas y la fila entera es el enlace, sin scroll horizontal de
                tabla. Desde `md`, la tabla de siempre (regla 12, sección 6). */}
            <ul className="divide-y divide-borde md:hidden">
              {paginaDeFilas.map(({ usuario, perfil }) => (
                <li key={usuario.id}>
                  <Link
                    href={`/admin/emprendimientos/${usuario.id}`}
                    className={`flex items-center gap-3 p-4 transition-colors hover:bg-fondo/60 ${CLASES_FOCO_ENLACE}`}
                  >
                    <Avatar nombreCompleto={usuario.nombre_completo} tamano="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-cuerpo text-base font-semibold text-texto">{usuario.nombre_completo}</p>
                      <p className="truncate font-cuerpo text-sm text-texto-secundario">{usuario.email}</p>
                      <p className="mt-1.5 truncate font-cuerpo text-sm text-texto-secundario">
                        {perfil ? perfil.nombre_negocio : <Badge variante="acento">Sin perfil</Badge>}
                      </p>
                    </div>
                    {perfil ? (
                      <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-texto-secundario" />
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 font-cuerpo text-xs font-medium text-acento">
                        <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                        Crear perfil
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left font-cuerpo text-sm">
                <thead className="border-b border-borde bg-fondo">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 text-sm font-semibold text-texto-secundario">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-sm font-semibold text-texto-secundario">
                      Correo
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-sm font-semibold text-texto-secundario">
                      Negocio
                    </th>
                    <th scope="col" className="w-14 px-2 py-3">
                      <span className="sr-only">Administrar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {paginaDeFilas.map(({ usuario, perfil }) => (
                    <tr key={usuario.id} className="transition-colors hover:bg-fondo/60">
                      <td className="px-4 py-4 text-texto">
                        <div className="flex items-center gap-3.5">
                          <Avatar nombreCompleto={usuario.nombre_completo} tamano="md" />
                          <span className="text-base font-semibold">{usuario.nombre_completo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-texto-secundario">{usuario.email}</td>
                      <td className="px-4 py-4 text-texto">
                        {perfil ? perfil.nombre_negocio : <Badge variante="acento">Sin perfil</Badge>}
                      </td>
                      <td className="px-2 py-4 text-right">
                        <Link
                          href={`/admin/emprendimientos/${usuario.id}`}
                          className={`inline-flex min-h-11 lg:min-h-0 items-center gap-1 rounded-md p-2 font-cuerpo text-sm font-medium whitespace-nowrap text-acento transition-colors hover:text-acento-hover ${CLASES_FOCO_ENLACE}`}
                        >
                          {perfil ? "Administrar" : "Crear perfil"}
                          {perfil ? (
                            <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
                          ) : (
                            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                          )}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-borde px-4 py-4 sm:px-5 xl:flex-row xl:justify-between">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <p className="font-cuerpo text-sm text-texto-secundario">
                  Mostrando {mostrandoDesde} a {mostrandoHasta} de {total} {total === 1 ? "resultado" : "resultados"}
                </p>
                <SelectorLimite valor={limite} />
              </div>
              <Paginador paginacion={{ pagina, limite, total }} crearHref={crearHref} tactil />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
