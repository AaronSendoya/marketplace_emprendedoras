"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Children, useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";

interface PropsCarrusel {
  // Qué contiene, para quien usa un lector de pantalla: «Emprendedoras», «Promociones».
  etiqueta: string;
  // Cada cuánto avanza solo (CLAUDE.md sección 6, regla 6, «Carruseles del Inicio»): 5 s para emprendedoras, 4,5 s para promociones.
  ritmoMs: number;
  // El color del indicador de posición: el del área que muestra (regla 14, punto k): magenta para las emprendedoras, púrpura para las
  // promociones y naranja para los productos.
  tono?: "acento" | "secundario" | "enfasis";
  // Una tarjeta por hijo. Son Server Components ya dibujados: aquí solo se desplazan.
  children: ReactNode;
}

const COLOR_DE_LA_BARRA = { acento: "bg-acento", secundario: "bg-secundario", enfasis: "bg-enfasis" } as const;

// Duración de cada desplazamiento (~500 ms, ni instantáneo ni lento) y cuánto se deja en paz al carrusel tras un gesto de la persona.
const DURACION_MS = 520;
const PAUSA_TRAS_GESTO_MS = 8000;
// Al sacar el cursor de encima no avanza de inmediato: espera un momento, para que no salte justo cuando la persona se va.
const PAUSA_TRAS_SOLTAR_MS = 1500;

const suavizar = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Carrusel de tarjetas del Inicio (regla 14, punto k, y regla 6). Una tira con desplazamiento nativo y ajuste a cada tarjeta
// (`scroll-snap`), así que sin JavaScript sigue siendo una tira que se puede deslizar. Con JavaScript suma: flechas, un botón de
// pausa, un indicador de posición y el avance automático, que NUNCA corre mientras la persona lo usa: se pausa con el cursor
// encima, con el foco del teclado dentro, tras cualquier gesto, con la pestaña oculta o el carrusel fuera de pantalla, y no
// existe con `prefers-reduced-motion`. En escritorio muestra tres tarjetas (el conjunto se desplaza) y en móvil una con la siguiente
// asomando, para que se note que hay más. Al llegar al final vuelve suavemente al principio.
export function CarruselTarjetas({ etiqueta, ritmoMs, tono = "enfasis", children }: PropsCarrusel) {
  const tarjetas = Children.toArray(children);
  const total = tarjetas.length;

  const region = useRef<HTMLDivElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const animacion = useRef<number | null>(null);
  // Lo que el temporizador necesita leer sin reiniciarse cada vez que algo cambia.
  const estado = useRef({ cursorEncima: false, focoDentro: false, enVista: true, enPausa: false, pausaHasta: 0, primero: 0, visibles: 1 });

  const [enPausa, setEnPausa] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const [posicion, setPosicion] = useState({ primero: 0, visibles: 1, ratio: 0, ancho: 1 });

  const medir = useCallback(() => {
    const el = pista.current;
    const primera = el?.children[0] as HTMLElement | undefined;
    if (!el || !primera) return;
    const segunda = el.children[1] as HTMLElement | undefined;
    const hueco = segunda ? segunda.offsetLeft - primera.offsetLeft - primera.offsetWidth : 0;
    const paso = primera.offsetWidth + hueco;
    // Cuántas tarjetas enteras caben (con un margen para el redondeo de los píxeles).
    const visibles = Math.max(1, Math.floor((el.clientWidth + hueco) / paso + 0.02));
    const primero = Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / paso)));
    const recorrido = el.scrollWidth - el.clientWidth;
    estado.current.primero = primero;
    estado.current.visibles = visibles;
    setPosicion({ primero, visibles, ratio: recorrido > 0 ? el.scrollLeft / recorrido : 0, ancho: Math.min(1, el.clientWidth / el.scrollWidth) });
  }, [total]);

  const cancelarAnimacion = useCallback(() => {
    if (animacion.current !== null) {
      cancelAnimationFrame(animacion.current);
      animacion.current = null;
      if (pista.current) pista.current.style.scrollSnapType = "";
    }
  }, []);

  // Lleva la tarjeta `indice` al borde izquierdo con una transición de ~500 ms. Durante ella se apaga el ajuste a las tarjetas:
  // si no, pelearía con cada fotograma de la animación.
  const irA = useCallback(
    (indice: number) => {
      const el = pista.current;
      const objetivo = el?.children[indice] as HTMLElement | undefined;
      const primera = el?.children[0] as HTMLElement | undefined;
      if (!el || !objetivo || !primera) return;
      cancelarAnimacion();
      const destino = objetivo.offsetLeft - primera.offsetLeft;
      const desde = el.scrollLeft;
      const diferencia = destino - desde;
      if (Math.abs(diferencia) < 1) return;
      if (sinMovimiento) {
        el.scrollLeft = destino;
        return;
      }
      el.style.scrollSnapType = "none";
      const inicio = performance.now();
      const fotograma = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / DURACION_MS);
        el.scrollLeft = desde + diferencia * suavizar(t);
        if (t < 1) animacion.current = requestAnimationFrame(fotograma);
        else {
          animacion.current = null;
          el.style.scrollSnapType = "";
        }
      };
      animacion.current = requestAnimationFrame(fotograma);
    },
    [cancelarAnimacion, sinMovimiento],
  );

  const siguiente = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const { primero, visibles } = estado.current;
    const alFinal = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    irA(alFinal ? 0 : Math.min(primero + visibles, Math.max(0, total - visibles)));
  }, [irA, total]);

  const anterior = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const { primero, visibles } = estado.current;
    irA(el.scrollLeft <= 2 ? Math.max(0, total - visibles) : Math.max(0, primero - visibles));
  }, [irA, total]);

  // Cualquier gesto de la persona deja al carrusel quieto un rato y corta la animación en curso.
  const gesto = useCallback(() => {
    estado.current.pausaHasta = Date.now() + PAUSA_TRAS_GESTO_MS;
    cancelarAnimacion();
  }, [cancelarAnimacion]);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const actualizar = () => setSinMovimiento(consulta.matches);
    actualizar();
    consulta.addEventListener("change", actualizar);
    return () => consulta.removeEventListener("change", actualizar);
  }, []);

  // Medidas: al cargar, al cambiar el ancho y al desplazarse.
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    let pendiente = 0;
    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        medir();
      });
    };
    el.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      observador.disconnect();
      el.removeEventListener("scroll", alDesplazar);
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, [medir]);

  // Solo avanza solo mientras se ve en pantalla.
  useEffect(() => {
    const el = region.current;
    if (!el) return;
    const observador = new IntersectionObserver(([entrada]) => (estado.current.enVista = entrada.isIntersecting), { threshold: 0.25 });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  useEffect(() => () => cancelarAnimacion(), [cancelarAnimacion]);

  // El avance automático.
  useEffect(() => {
    if (sinMovimiento || total < 2) return;
    const temporizador = setInterval(() => {
      const e = estado.current;
      const el = pista.current;
      if (!el || e.enPausa || e.cursorEncima || e.focoDentro || !e.enVista || document.hidden || Date.now() < e.pausaHasta) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      siguiente();
    }, ritmoMs);
    return () => clearInterval(temporizador);
  }, [ritmoMs, sinMovimiento, total, siguiente]);

  function alEntrarElPuntero(evento: PointerEvent) {
    if (evento.pointerType === "mouse") estado.current.cursorEncima = true;
  }
  function alSalirElPuntero(evento: PointerEvent) {
    if (evento.pointerType !== "mouse") return;
    estado.current.cursorEncima = false;
    estado.current.pausaHasta = Math.max(estado.current.pausaHasta, Date.now() + PAUSA_TRAS_SOLTAR_MS);
  }
  // Solo el foco del teclado pausa: tras pulsar una flecha con el ratón el foco se queda en el botón y no debe detener el carrusel para siempre.
  function alEnfocar(evento: FocusEvent) {
    estado.current.focoDentro = (evento.target as HTMLElement).matches(":focus-visible");
  }
  function alDesenfocar(evento: FocusEvent) {
    if (region.current?.contains(evento.relatedTarget as Node | null)) return;
    estado.current.focoDentro = false;
    estado.current.pausaHasta = Math.max(estado.current.pausaHasta, Date.now() + PAUSA_TRAS_SOLTAR_MS);
  }

  function alAnterior() {
    gesto();
    anterior();
  }
  function alSiguiente() {
    gesto();
    siguiente();
  }

  function alternarPausa() {
    estado.current.enPausa = !estado.current.enPausa;
    setEnPausa(estado.current.enPausa);
  }

  if (total === 0) return null;

  // Los controles solo se dibujan donde hay algo que desplazar: con 3 o menos caben todas desde 1180 px, con 2 o menos desde 768 px.
  const controles = total <= 1 ? "hidden" : total <= 2 ? "md:hidden" : total <= 3 ? "rejilla:hidden" : "";
  const ultimo = Math.min(total, posicion.primero + posicion.visibles);
  const BOTON = `flex size-11 items-center justify-center rounded-full border border-borde-fuerte bg-superficie text-texto transition-colors hover:border-texto-secundario hover:bg-fondo motion-reduce:transition-none ${CLASES_FOCO_CONTROL}`;

  return (
    <div
      ref={region}
      role="region"
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      onPointerEnter={alEntrarElPuntero}
      onPointerLeave={alSalirElPuntero}
      onPointerDown={gesto}
      onTouchStart={gesto}
      onWheel={gesto}
      onKeyDown={gesto}
      onFocus={alEnfocar}
      onBlur={alDesenfocar}
    >
      {/* El margen negativo y el relleno dejan sitio a la elevación y a la sombra de las tarjetas, que el desplazamiento recortaría. */}
      <div
        ref={pista}
        className="relative -mx-2 -my-3 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-2 px-2 py-3 [scrollbar-width:none] md:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {tarjetas.map((tarjeta, indice) => (
          <div
            key={indice}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${indice + 1} de ${total}`}
            className="min-w-0 shrink-0 basis-[84%] snap-start md:basis-[calc((100%-1.5rem)/2)] rejilla:basis-[calc((100%-3rem)/3)]"
          >
            {tarjeta}
          </div>
        ))}
      </div>

      <div className={`mt-5 flex items-center gap-3 ${controles}`.trim()}>
        <button type="button" onClick={alAnterior} aria-label="Anterior" className={BOTON}>
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {!sinMovimiento && (
          <button
            type="button"
            onClick={alternarPausa}
            aria-label={enPausa ? "Reanudar el avance automático" : "Pausar el avance automático"}
            className={BOTON}
          >
            {enPausa ? <Play size={17} strokeWidth={1.75} aria-hidden="true" /> : <Pause size={17} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        )}
        <button type="button" onClick={alSiguiente} aria-label="Siguiente" className={BOTON}>
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>

        {/* La posición: una barra discreta y, desde `sm`, «1–3 de 24». Solo informa; no se toca. */}
        <div aria-hidden="true" className="ml-1 h-1 min-w-0 flex-1 rounded-full bg-borde">
          <div
            className={`relative h-full rounded-full ${COLOR_DE_LA_BARRA[tono]}`}
            style={{ width: `${posicion.ancho * 100}%`, left: `${posicion.ratio * (1 - posicion.ancho) * 100}%` }}
          />
        </div>
        <p className="hidden shrink-0 font-cuerpo text-sm text-texto-secundario tabular-nums sm:block">
          {posicion.primero + 1}
          {ultimo > posicion.primero + 1 ? `–${ultimo}` : ""} de {total}
        </p>
      </div>
    </div>
  );
}
