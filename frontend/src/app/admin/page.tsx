import { CircleAlert, Users as UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { EncabezadoPaginaAdmin } from "@/components/organisms/EncabezadoPaginaAdmin";
import { Paginador } from "@/components/molecules/Paginador";
import { AdminToolbar } from "@/components/organisms/AdminToolbar";
import { MenuAccionesCuenta } from "@/components/organisms/MenuAccionesCuenta";
import { SelectorLimite } from "@/components/organisms/SelectorLimite";
import { listarUsuarios } from "@/lib/api/admin";
import { obtenerMe } from "@/lib/api/auth";
import { ErrorApi } from "@/lib/api/cliente";
import { haySesion } from "@/lib/auth/sesion";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";

export const metadata: Metadata = {
  title: "Cuentas — Panel del Admin",
};

const LIMITE_POR_DEFECTO = 10;
// Mismas opciones que ofrece SelectorLimite; el backend acepta hasta 100 por página.
const LIMITES_VALIDOS = [10, 50, 100];

function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export default async function PaginaAdminCuentas({ searchParams }: PageProps<"/admin">) {
  // Mismo guard que app/admin/layout.tsx (regla 5): Next arranca el render de layout y página en
  // paralelo para adelantar la carga de datos, así que sin esto la página llega a pedir datos
  // autenticados antes de que el redirect del layout se resuelva — no cambia lo que ve quien
  // visita el sitio (el redirect real gana igual), pero deja un error sin capturar en el servidor.
  if (!(await haySesion())) redirect("/iniciar-sesion");

  const parametros = await searchParams;
  const q = primerValor(parametros.q);
  const estado = primerValor(parametros.estado);
  const pagina = Number(primerValor(parametros.pagina)) || 1;
  const limiteParametro = Number(primerValor(parametros.limite));
  const limite = LIMITES_VALIDOS.includes(limiteParametro) ? limiteParametro : LIMITE_POR_DEFECTO;
  const conError = primerValor(parametros.error) === "estado";

  let yo: Awaited<ReturnType<typeof obtenerMe>>;
  let resultado: Awaited<ReturnType<typeof listarUsuarios>>;
  try {
    [yo, resultado] = await Promise.all([
      obtenerMe(),
      listarUsuarios({
        q: q || undefined,
        estado: estado === "activo" || estado === "inactivo" ? estado : undefined,
        pagina,
        limite,
      }),
    ]);
  } catch (error) {
    // El token pudo vencer justo entre el guard de arriba y esta petición (caso raro, pero
    // posible): vuelve a iniciar sesión en vez de mostrar la pantalla de error genérica. Cualquier
    // otro fallo (ej. el backend caído) sigue de largo hacia app/error.tsx, la red de seguridad de
    // toda la app.
    if (error instanceof ErrorApi && error.status === 401) redirect("/iniciar-sesion");
    throw error;
  }
  const { datos: usuarios, paginacion } = resultado;
  const desde = paginacion.total === 0 ? 0 : (paginacion.pagina - 1) * paginacion.limite + 1;
  const hasta = Math.min(paginacion.pagina * paginacion.limite, paginacion.total);

  function crearHref(nuevaPagina: number): string {
    const parametrosUrl = new URLSearchParams();
    if (q) parametrosUrl.set("q", q);
    if (estado) parametrosUrl.set("estado", estado);
    if (limite !== LIMITE_POR_DEFECTO) parametrosUrl.set("limite", String(limite));
    parametrosUrl.set("pagina", String(nuevaPagina));
    return `/admin?${parametrosUrl.toString()}`;
  }

  return (
    <div className="space-y-8">
      <EncabezadoPaginaAdmin
        titulo="Gestión de cuentas"
        descripcion="Administra las cuentas de administradores y emprendedoras."
        acciones={
          <Link href="/admin/nueva" className={clasesBoton("primario", "w-full sm:w-auto")}>
            Crear una cuenta nueva
          </Link>
        }
      />

      {conError && (
        <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
          No pudimos actualizar esa cuenta. Intenta de nuevo.
        </p>
      )}

      <div className={`${CLASES_PANEL_ADMIN} overflow-hidden`}>
        <div className="border-b border-borde p-4 sm:p-5">
          <AdminToolbar />
        </div>

        {usuarios.length === 0 ? (
          <div className="p-4">
            <EstadoVacio
              icono={UsersIcon}
              titulo="No se encontraron cuentas"
              descripcion={q || estado ? "Prueba ajustar la búsqueda o el filtro de estado." : "Todavía no hay cuentas para mostrar."}
            />
          </div>
        ) : (
          <>
            {/* Angosto (incluida una tablet vertical con su barra de cabecera, no con
                barra lateral): tarjetas apiladas, sin scroll horizontal de tabla; una tabla de 5
                columnas necesita unos 670 px. Desde `md`, la tabla de siempre (regla 12, sección 6). */}
            <ul className="divide-y divide-borde md:hidden">
              {usuarios.map((usuario) => (
                <li key={usuario.id} className="flex items-center gap-3 p-4">
                  <Avatar nombreCompleto={usuario.nombre_completo} tamano="md" tono={usuario.rol === "Admin" ? "secundario" : "neutro"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-cuerpo text-base font-semibold text-texto">{usuario.nombre_completo}</p>
                    <p className="truncate font-cuerpo text-sm text-texto-secundario">{usuario.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variante={usuario.rol === "Admin" ? "secundario" : "neutro"}>{usuario.rol}</Badge>
                      <Badge variante={usuario.activo ? "neutro" : "acento"} punto>
                        {usuario.activo ? "Activa" : "Suspendida"}
                      </Badge>
                    </div>
                  </div>
                  {usuario.id !== yo.id && <MenuAccionesCuenta usuario={usuario} volverA={crearHref(pagina)} />}
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
                      Rol
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-sm font-semibold text-texto-secundario">
                      Estado
                    </th>
                    <th scope="col" className="w-14 px-2 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="transition-colors hover:bg-fondo/60">
                      <td className="px-4 py-4 text-texto">
                        <div className="flex items-center gap-3.5">
                          <Avatar nombreCompleto={usuario.nombre_completo} tamano="md" tono={usuario.rol === "Admin" ? "secundario" : "neutro"} />
                          <span className="text-base font-semibold">{usuario.nombre_completo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-texto-secundario">{usuario.email}</td>
                      <td className="px-4 py-4">
                        <Badge variante={usuario.rol === "Admin" ? "secundario" : "neutro"}>{usuario.rol}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variante={usuario.activo ? "neutro" : "acento"} punto>
                          {usuario.activo ? "Activa" : "Suspendida"}
                        </Badge>
                      </td>
                      <td className="px-2 py-4 text-right">
                        {/* La propia cuenta del Admin no muestra el menú: la regla 5 del backend
                            responde 409 si intenta desactivarse a sí mismo, pero es mejor no ofrecer
                            la acción que dejarla fallar. */}
                        {usuario.id !== yo.id && <MenuAccionesCuenta usuario={usuario} volverA={crearHref(pagina)} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-borde px-4 py-4 sm:px-5 xl:flex-row xl:justify-between">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <p className="font-cuerpo text-sm text-texto-secundario">
                  Mostrando {desde} a {hasta} de {paginacion.total} {paginacion.total === 1 ? "resultado" : "resultados"}
                </p>
                <SelectorLimite valor={limite} />
              </div>
              <Paginador paginacion={paginacion} crearHref={crearHref} tactil />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
