"use client";

import { CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { clasesBoton } from "@/components/atoms/Button";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import type { ConexionGoogleEnLaPagina } from "@/lib/importacion/useConexionGoogle";

interface PropsTarjeta {
  conexion: ConexionGoogleEnLaPagina;
  // Un aviso de la pantalla que se suma al de la ventana de Google (ej. «la conexión venció»).
  avisoDeLaPantalla?: string | null;
}

const ID_TITULO = "titulo-cuenta-google";

// La cuenta de Google que da acceso a las fotos y los logos de Drive (reglas 17 y 22). Va en el paso 1 y en el paso 2: se puede
// conectar antes de subir el archivo o después, y volver a conectar si la conexión (una hora) vence. Conectar abre una ventana
// aparte; aquí nunca se escribe una contraseña de Google.
export function TarjetaCuentaGoogle({ conexion, avisoDeLaPantalla = null }: PropsTarjeta) {
  const { estado, conectando, aviso, conectar, desconectar, refrescar } = conexion;
  const mensaje = aviso ?? avisoDeLaPantalla;

  return (
    <section aria-labelledby={ID_TITULO} className={`${CLASES_PANEL_ADMIN} space-y-3 p-4`}>
      <h3 id={ID_TITULO} className="font-titulo text-base font-bold text-texto">
        Cuenta de Google para cargar las fotos y los logos
      </h3>

      {estado.fase === "cargando" && (
        <p role="status" className="flex items-center gap-2 font-cuerpo text-sm text-texto-secundario">
          <LoaderCircle size={16} strokeWidth={2} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          Comprobando la conexión con Google…
        </p>
      )}

      {estado.fase === "no_disponible" && (
        <p className="flex items-start gap-2 font-cuerpo text-sm text-texto-secundario">
          <Info size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            El servidor no tiene configurada la conexión con Google. Las fotos y los logos de cada perfil quedarán con la imagen predeterminada; se
            suben a mano desde cada emprendimiento.
          </span>
        </p>
      )}

      {estado.fase === "error" && (
        <div className="space-y-2">
          <p className="flex items-start gap-2 font-cuerpo text-sm text-texto">
            <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />
            <span>{estado.mensaje}</span>
          </p>
          <button type="button" onClick={() => void refrescar()} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
            Reintentar
          </button>
        </div>
      )}

      {estado.fase === "desconectada" && (
        <div className="space-y-3">
          <p className="font-cuerpo text-sm text-texto-secundario">
            Las fotos y los logos están en Drive y solo los ve quien tenga acceso a esa carpeta. Conecta una cuenta de Google que lo tenga: solo se
            pide permiso de lectura, la conexión dura una hora y no se guarda en el servidor.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin/google/conectar"
              target="_blank"
              rel="noopener"
              onClick={(evento) => {
                evento.preventDefault();
                conectar();
              }}
              className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}
            >
              Conectar cuenta de Google
            </a>
            {conectando && (
              <p role="status" className="flex items-center gap-2 font-cuerpo text-xs text-texto-secundario">
                <LoaderCircle size={14} strokeWidth={2} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                Termina en la ventana de Google; aquí se actualiza solo.
              </p>
            )}
          </div>
          <p className="font-cuerpo text-xs text-texto-secundario">
            Si Google muestra «Google no ha verificado esta aplicación», es lo esperado: elige «Configuración avanzada» y continúa.
          </p>
        </div>
      )}

      {estado.fase === "conectada" && (
        <div className="space-y-3">
          <p role="status" className="flex items-start gap-2 font-cuerpo text-sm text-texto">
            <CircleCheck size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-salvia" />
            <span className="min-w-0 break-words">
              {estado.cuenta ? (
                <>
                  Conectada como <strong className="font-semibold break-all">{estado.cuenta}</strong>.
                </>
              ) : (
                "Cuenta de Google conectada."
              )}{" "}
              Las fotos y los logos del Excel se comprueban en Drive y se cargan al importar.
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/google/conectar"
              target="_blank"
              rel="noopener"
              onClick={(evento) => {
                evento.preventDefault();
                conectar();
              }}
              className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}
            >
              Cambiar de cuenta
            </a>
            <button type="button" onClick={() => void desconectar()} className={clasesBoton("contorno", "min-h-11 lg:min-h-0")}>
              Desconectar
            </button>
            {conectando && (
              <p role="status" className="flex items-center gap-2 font-cuerpo text-xs text-texto-secundario">
                <LoaderCircle size={14} strokeWidth={2} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                Termina en la ventana de Google.
              </p>
            )}
          </div>
        </div>
      )}

      {mensaje && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-aviso-borde bg-aviso-suave px-3 py-2.5 font-cuerpo text-sm text-texto">
          <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />
          <span>{mensaje}</span>
        </p>
      )}
    </section>
  );
}
