"use client";

import { Handshake, Percent, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";

const CARACTERISTICAS = [
  { Icono: Users, verbo: "Conoce", sustantivo: "emprendedoras" },
  { Icono: Percent, verbo: "Descubre", sustantivo: "promociones" },
  { Icono: Handshake, verbo: "Genera", sustantivo: "alianzas" },
];

// Solo una vez por sesión del navegador (pedido explícito, 2026-09-28: aparece la primera vez que
// se entra al sitio; si se navega de vuelta a "/" después de haberlo visto, no debe reaparecer;
// si se cierra la pestaña/navegador y se vuelve a abrir el enlace, sí). sessionStorage es
// exactamente esa semántica: vive mientras dure la pestaña, se borra al cerrarla — a diferencia
// de localStorage, que sería "para siempre" y no es lo que se pidió.
const CLAVE_SESSION = "tdm-bienvenida-vista";

function suscribirse() {
  return () => {};
}

function leerVistoCliente(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_SESSION) === "1";
  } catch {
    return false;
  }
}

// En el servidor no existe sessionStorage; se asume "ya visto" para que el primer render del
// cliente coincida con el del servidor (evita el error de hidratación de React). El valor real
// se conoce recién en el cliente, con leerVistoCliente.
function leerVistoServidor(): boolean {
  return true;
}

// Un h2, no un h1: el Hero de la página ya tiene el suyo.
//
// Aspecto (CLAUDE.md sección 6, regla 14, aprobado con el boceto del 2026-10-05): el fondo es un oscuro plano
// (`bg-texto/60`), ya no el vidrio esmerilado con degradado de antes, que era el sello de un diseño genérico. La
// ventana es una superficie blanca con borde y la sombra de los modales, e icono en fichas de naranja tenue. Entra
// con un desvanecimiento y un ascenso corto; `prefers-reduced-motion` lo desactiva (regla 6).
export function ModalBienvenida() {
  const yaVistoEnSesion = useSyncExternalStore(suscribirse, leerVistoCliente, leerVistoServidor);
  const [cerrado, setCerrado] = useState(false);
  const abierto = !yaVistoEnSesion && !cerrado;
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Marca la sesión como "ya visto" apenas se muestra, no solo al cerrarlo: así cuenta como visto
  // aunque se navegue lejos por el CTA en vez de cerrarlo con la X.
  useEffect(() => {
    if (!abierto) return;
    try {
      sessionStorage.setItem(CLAVE_SESSION, "1");
    } catch {
      // Sin almacenamiento, el modal vuelve a aparecer la próxima vez: peor caso aceptable, no
      // un error.
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;

    cerrarRef.current?.focus();
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setCerrado(true);
    }
    window.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-aparecer items-center justify-center bg-texto/60 p-4" onClick={() => setCerrado(true)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-bienvenida"
        onClick={(evento) => evento.stopPropagation()}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md animate-modal space-y-6 overflow-y-auto rounded-2xl border border-borde bg-superficie px-6 pt-9 pb-7 text-center shadow-modal sm:max-w-[30rem] sm:px-8"
      >
        <button
          ref={cerrarRef}
          type="button"
          onClick={() => setCerrado(true)}
          aria-label="Cerrar"
          className={`absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-lg text-texto-secundario transition-colors hover:bg-fondo hover:text-texto ${CLASES_FOCO_CONTROL}`}
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        <div className="space-y-3">
          <h2 id="titulo-bienvenida" className="font-titulo text-[1.75rem] leading-tight font-extrabold text-texto">
            ¡Bienvenidas!
          </h2>
          <p className="font-cuerpo text-[0.9375rem] text-texto-secundario">
            Gracias por ser parte del <span className="font-semibold text-acento">Track de Mujeres</span>.
          </p>
          <p className="font-cuerpo text-[0.9375rem] leading-relaxed text-texto-secundario">
            Este es un espacio creado para que puedas conocer a otras emprendedoras, descubrir sus negocios,
            acceder a beneficios especiales y generar nuevas conexiones dentro de nuestra comunidad.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {CARACTERISTICAS.map(({ Icono, verbo, sustantivo }) => (
            <div key={sustantivo} className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-enfasis-borde bg-enfasis-suave text-marca">
                <Icono size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="font-cuerpo text-[0.8125rem] leading-tight">
                <span className="block font-bold text-texto">{verbo}</span>
                <span className="block text-texto-secundario">{sustantivo}</span>
              </p>
            </div>
          ))}
        </div>

        <Link href="/emprendedoras" className={clasesBoton("primario", "w-full", "grande")} onClick={() => setCerrado(true)}>
          Explorar la comunidad
        </Link>
      </div>
    </div>
  );
}
