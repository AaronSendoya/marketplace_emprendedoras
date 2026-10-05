import { AtSign, BarChart3, MessageCircle, MousePointerClick, Search, Store } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { EncabezadoPaginaAdmin } from "@/components/organisms/EncabezadoPaginaAdmin";
import { EncabezadoSeccionAdmin } from "@/components/organisms/EncabezadoSeccionAdmin";
import { GraficoInteraccion } from "@/components/organisms/dashboard/GraficoInteraccion";
import { GraficoRubros } from "@/components/organisms/dashboard/GraficoRubros";
import { LeyendaCanales } from "@/components/organisms/dashboard/LeyendaCanales";
import { PesoPorCanal } from "@/components/organisms/dashboard/PesoPorCanal";
import { SelectorPeriodo } from "@/components/organisms/dashboard/SelectorPeriodo";
import { SelectorTopRanking } from "@/components/organisms/dashboard/SelectorTopRanking";
import { TablaCalorPerfiles } from "@/components/organisms/dashboard/TablaCalorPerfiles";
import { TarjetaKpi } from "@/components/organisms/dashboard/TarjetaKpi";
import { listarUsuarios } from "@/lib/api/admin";
import { ErrorApi } from "@/lib/api/cliente";
import { obtenerClicsPorRubro, obtenerMapaCalorClics, obtenerResumenClics, obtenerSerieClics } from "@/lib/api/metricas";
import { haySesion } from "@/lib/auth/sesion";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import { COLOR_ENFASIS, COLOR_SECUNDARIO } from "@/lib/graficos/colores";
import { ETIQUETA_ORDEN, ORDEN_MAPA_CALOR_POR_DEFECTO, ORDENES_MAPA_CALOR } from "@/lib/metricas/mapaCalor";
import { etiquetaRangoCorto, hoyLaPaz, resolverRangoConAnterior, TOPE_RANKING_POR_DEFECTO } from "@/lib/metricas/rango";
import { calcularTendencia } from "@/lib/metricas/tendencia";
import type { OrdenMapaCalor } from "@/lib/api/tipos";

export const metadata: Metadata = {
  title: "Dashboard — Panel del Admin",
};

const TOPES_RANKING_VALIDOS = [5, 10, 20];
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

// Solo valida el formato (igual que `estado` en /admin): un valor manualmente mal escrito en la
// URL se ignora en vez de mandarse al backend. La semántica del rango (hasta >= desde, máximo 2
// años) la valida el backend (regla 19); el formulario de SelectorPeriodo ya impide construir un
// rango inválido desde la UI normal.
function fechaDeParametro(valor: string): string | undefined {
  return SOLO_FECHA.test(valor) ? valor : undefined;
}

// `TarjetaKpi` es Client Component (por el sparkline): recibe el ícono ya renderizado, no la
// referencia del componente, porque una página Server Component no puede pasarle una función como
// prop a través de ese límite (React solo serializa el elemento ya armado).
const PROPS_ICONO_KPI = { size: 20, strokeWidth: 1.75, "aria-hidden": true, className: "shrink-0" } as const;

// Vistazo general al abrir el panel (regla 19). "Emprendedoras activas" se calcula con lo que ya
// expone /admin/usuarios; clics, serie, ranking y distribución por rubro son reales (GET
// /admin/metricas/*) y reflejan el período elegido con el filtro de arriba (`desde`/`hasta` en la
// URL, mismo patrón que el resto del panel). Las búsquedas del catálogo no se registran todavía
// (fuera de la regla 19): ese "Próximamente" sigue siendo honesto, no un dato inventado.
export default async function PaginaDashboard({ searchParams }: PageProps<"/admin/dashboard">) {
  if (!(await haySesion())) redirect("/iniciar-sesion");

  const parametros = await searchParams;
  const desdeParametro = fechaDeParametro(primerValor(parametros.desde));
  const hastaParametro = fechaDeParametro(primerValor(parametros.hasta));
  const topParametro = Number(primerValor(parametros.top));
  const top = TOPES_RANKING_VALIDOS.includes(topParametro) ? topParametro : TOPE_RANKING_POR_DEFECTO;
  // Un valor que no sea uno de los tres se ignora, como `estado` en /admin: no llega al backend.
  const ordenParametro = primerValor(parametros.orden) as OrdenMapaCalor;
  const orden = ORDENES_MAPA_CALOR.includes(ordenParametro) ? ordenParametro : ORDEN_MAPA_CALOR_POR_DEFECTO;

  const hoy = hoyLaPaz();
  const { actual, anterior } = resolverRangoConAnterior(desdeParametro, hastaParametro);

  let emprendedorasActivas = 0;
  let resumenClics = { whatsapp: 0, instagram: 0 };
  let resumenAnterior = { whatsapp: 0, instagram: 0 };
  let mapaCalor: Awaited<ReturnType<typeof obtenerMapaCalorClics>> | null = null;
  let serie: Awaited<ReturnType<typeof obtenerSerieClics>> = [];
  let serieAnterior: Awaited<ReturnType<typeof obtenerSerieClics>> = [];
  let porRubro: Awaited<ReturnType<typeof obtenerClicsPorRubro>> = [];
  try {
    const [{ datos }, resumen, resumenPrevio, mapa, serieClics, serieClicsPrevia, clicsPorRubro] = await Promise.all([
      listarUsuarios({ estado: "activo", pagina: 1, limite: 100 }),
      obtenerResumenClics(actual),
      obtenerResumenClics(anterior),
      obtenerMapaCalorClics(top, actual, orden),
      obtenerSerieClics(actual),
      obtenerSerieClics(anterior),
      obtenerClicsPorRubro(actual),
    ]);
    emprendedorasActivas = datos.filter((usuario) => usuario.rol === "Emprendedor").length;
    resumenClics = resumen;
    resumenAnterior = resumenPrevio;
    mapaCalor = mapa;
    serie = serieClics;
    serieAnterior = serieClicsPrevia;
    porRubro = clicsPorRubro;
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) redirect("/iniciar-sesion");
    throw error;
  }

  // El período anterior solo se superpone si tuvo clics: con cero no hay base honesta para comparar (el
  // mismo criterio de `calcularTendencia`) y una línea plana sobre el eje no dice nada.
  const hayAnterior = resumenAnterior.whatsapp + resumenAnterior.instagram > 0;

  return (
    <div className="space-y-10">
      <EncabezadoPaginaAdmin
        titulo="Dashboard"
        descripcion="Un vistazo general al catálogo."
        acciones={<SelectorPeriodo hoy={hoy} etiquetaRango={etiquetaRangoCorto(actual.desde, actual.hasta)} />}
      />

      {/* Los cuatro indicadores como un solo conjunto: un panel con divisiones de 1 px (`gap-px` sobre el
          color del borde) en vez de cuatro cajas sueltas. Dos columnas hasta `xl`, donde caben las cuatro. */}
      <section aria-label="Indicadores del período" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-borde bg-borde xl:grid-cols-4">
        <TarjetaKpi etiqueta="Emprendedoras activas" valor={String(emprendedorasActivas)} tono="magenta" icono={<Store {...PROPS_ICONO_KPI} />} />
        <TarjetaKpi
          etiqueta="Clics a WhatsApp"
          valor={String(resumenClics.whatsapp)}
          tono="whatsapp"
          icono={<MessageCircle {...PROPS_ICONO_KPI} />}
          grafico={{
            serie: serie.map((punto) => punto.whatsapp),
            color: COLOR_ENFASIS,
            tendencia: calcularTendencia(resumenClics.whatsapp, resumenAnterior.whatsapp),
          }}
        />
        <TarjetaKpi
          etiqueta="Clics a Instagram"
          valor={String(resumenClics.instagram)}
          tono="instagram"
          icono={<AtSign {...PROPS_ICONO_KPI} />}
          grafico={{
            serie: serie.map((punto) => punto.instagram),
            color: COLOR_SECUNDARIO,
            tendencia: calcularTendencia(resumenClics.instagram, resumenAnterior.instagram),
          }}
        />
        <TarjetaKpi
          etiqueta="Clics totales"
          valor={String(resumenClics.whatsapp + resumenClics.instagram)}
          tono="tinta"
          icono={<MousePointerClick {...PROPS_ICONO_KPI} />}
        />
      </section>

      <section className={`${CLASES_PANEL_ADMIN} p-5 sm:p-7`}>
        <EncabezadoSeccionAdmin
          titulo="Interacción en el tiempo"
          descripcion={
            hayAnterior
              ? "Clics por día a WhatsApp e Instagram, frente al período anterior."
              : "Clics por día a WhatsApp e Instagram."
          }
        />
        {/* La leyenda va en su propia fila sobre el gráfico y no a la derecha del título: con la muestra del
            período anterior es ancha, y entre 768 y 1280 px le quitaba espacio al título y lo partía. */}
        <div className="mt-5">
          <LeyendaCanales conAnterior={hayAnterior} />
        </div>
        <div className="mt-4">
          <GraficoInteraccion serie={serie} serieAnterior={hayAnterior ? serieAnterior : null} />
        </div>
      </section>

      <section className={`${CLASES_PANEL_ADMIN} p-5 sm:p-7`}>
        <EncabezadoSeccionAdmin
          titulo="Canal de contacto"
          descripcion="Qué parte de los clics llega por WhatsApp y cuál por Instagram, y cómo cambió frente al período anterior."
        />
        <div className="mt-6">
          <PesoPorCanal
            actual={resumenClics}
            anterior={resumenAnterior}
            etiquetaAnterior={etiquetaRangoCorto(anterior.desde, anterior.hasta)}
          />
        </div>
      </section>

      <section className="space-y-5">
        <EncabezadoSeccionAdmin
          titulo="Emprendimientos más populares"
          descripcion={`Clics a WhatsApp e Instagram de cada emprendimiento, ordenados por ${ETIQUETA_ORDEN[orden]}.`}
          acciones={<SelectorTopRanking valor={top} />}
        />
        <div className={`${CLASES_PANEL_ADMIN} p-4 sm:p-6`}>
          {!mapaCalor || mapaCalor.filas.length === 0 ? (
            <EstadoVacio
              icono={BarChart3}
              titulo="Todavía no hay datos"
              descripcion="Se mostrará acá en cuanto el catálogo registre los clics a WhatsApp e Instagram."
            />
          ) : (
            <TablaCalorPerfiles mapa={mapaCalor} orden={orden} totalPeriodo={resumenClics.whatsapp + resumenClics.instagram} />
          )}
        </div>
      </section>

      {/* Estas dos secciones van directo sobre el fondo, sin caja (regla 13, nivel 1 de superficie). */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="space-y-5">
          <EncabezadoSeccionAdmin titulo="Clics por rubro" descripcion="Cómo se reparten los clics entre los rubros del catálogo." />
          {porRubro.length === 0 ? (
            <EstadoVacio icono={BarChart3} titulo="Todavía no hay datos" descripcion="Se mostrará acá en cuanto haya clics registrados." />
          ) : (
            <GraficoRubros datos={porRubro} />
          )}
        </section>

        <section className="space-y-5">
          <EncabezadoSeccionAdmin titulo="Términos más buscados" descripcion="Lo que las visitantes buscan en el catálogo." />
          <EstadoVacio
            icono={Search}
            titulo="Todavía no hay datos"
            descripcion="Se mostrará acá en cuanto el catálogo registre las búsquedas del visitante."
          />
        </section>
      </div>
    </div>
  );
}
