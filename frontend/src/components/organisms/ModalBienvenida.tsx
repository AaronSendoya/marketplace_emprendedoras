"use client";

import { Handshake, Percent, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

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
    <div
      // Vidrio esmerilado (pedido explícito): desenfoca lo que queda detrás (`backdrop-blur`) en
      // vez de taparlo con un color plano, con un degradado sutil encima — solo el neutro `texto`
      // en distintas opacidades, sin un color de marca de adorno (regla 2, sección 6: los tres
      // colores tienen un rol fijo, nunca decorativo).
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-texto/75 via-texto/45 to-texto/75 p-4 backdrop-blur-sm"
      onClick={() => setCerrado(true)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-bienvenida"
        onClick={(evento) => evento.stopPropagation()}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-md space-y-6 overflow-y-auto rounded-lg bg-superficie p-8 text-center shadow-lg sm:max-w-lg"
      >
        <button
          ref={cerrarRef}
          type="button"
          onClick={() => setCerrado(true)}
          aria-label="Cerrar"
          className={`absolute top-4 right-4 text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        <div className="space-y-2">
          <h2 id="titulo-bienvenida" className="font-titulo text-2xl font-extrabold text-texto">
            ¡Bienvenidas!
          </h2>
          <p className="font-cuerpo text-sm text-texto-secundario">
            Gracias por ser parte del <span className="font-semibold text-acento">Track de Mujeres</span>.
          </p>
          <p className="font-cuerpo text-sm text-texto-secundario">
            Este es un espacio creado para que puedas conocer a otras emprendedoras, descubrir sus negocios,
            acceder a beneficios especiales y generar nuevas conexiones dentro de nuestra comunidad.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {CARACTERISTICAS.map(({ Icono, verbo, sustantivo }) => (
            <div key={sustantivo} className="flex flex-col items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-acento-suave text-acento">
                <Icono size={20} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="font-cuerpo text-xs leading-tight">
                <span className="block font-bold text-acento">{verbo}</span>
                <span className="block text-texto-secundario">{sustantivo}</span>
              </p>
            </div>
          ))}
        </div>

        <Link href="/emprendedoras" className={clasesBoton("primario", "w-full")} onClick={() => setCerrado(true)}>
          Explorar la comunidad
        </Link>
      </div>
    </div>
  );
}
