"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { desconectarGoogleAction, estadoGoogleAction } from "@/lib/admin/importacion-acciones";
import { CANAL_DE_CONEXION_GOOGLE, MOTIVOS_DE_FALLO, motivoDeFallo } from "@/lib/google/oauth";
import { MENSAJES_IMPORTACION } from "./mensajes";

// La cuenta de Google conectada para cargar las imágenes de Drive (reglas 17 y 22), vista desde la página del importador. La página
// nunca ve el token: solo pregunta al servidor «¿hay una cuenta conectada?» (el servidor lee la cookie `httpOnly`).
export type EstadoConexionGoogle =
  | { fase: "cargando" }
  // El servidor no tiene configurada la conexión con Google: el importador funciona sin imágenes de Drive.
  | { fase: "no_disponible" }
  | { fase: "desconectada" }
  | { fase: "conectada"; cuenta: string | null }
  | { fase: "error"; mensaje: string };

export interface ConexionGoogleEnLaPagina {
  estado: EstadoConexionGoogle;
  // Se abrió la ventana de Google y se espera a que la persona termine en ella.
  conectando: boolean;
  // Por qué no se pudo conectar (lo que dijo la ventana, o que el navegador la bloqueó).
  aviso: string | null;
  conectar: () => void;
  desconectar: () => Promise<void>;
  // Vuelve a preguntar al servidor (ej. tras un «la conexión venció»).
  refrescar: () => Promise<EstadoConexionGoogle>;
}

const RUTA_PARA_CONECTAR = "/admin/google/conectar";
const NOMBRE_DE_LA_VENTANA = "conexion-google";
const ANCHO = 520;
const ALTO = 720;

const MENSAJE_VENTANA_BLOQUEADA =
  "Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.";

// Le pregunta al servidor (que lee la cookie `httpOnly`) y traduce la respuesta; nunca lanza.
async function consultarEstado(): Promise<EstadoConexionGoogle> {
  try {
    const respuesta = await estadoGoogleAction();
    if (!respuesta.ok) return { fase: "error", mensaje: respuesta.error };
    if (!respuesta.disponible) return { fase: "no_disponible" };
    return respuesta.conectada ? { fase: "conectada", cuenta: respuesta.cuenta } : { fase: "desconectada" };
  } catch {
    return { fase: "error", mensaje: MENSAJES_IMPORTACION.noSePudoConsultarGoogle };
  }
}

// `alCambiar` se llama cada vez que el servidor responde sobre la conexión (con el estado de antes y el de ahora): así la pantalla
// reacciona al evento (se conectó, se cambió de cuenta, venció) sin vigilar el estado con un efecto.
export function useConexionGoogle(alCambiar?: (anterior: EstadoConexionGoogle, nuevo: EstadoConexionGoogle) => void): ConexionGoogleEnLaPagina {
  const [estado, setEstado] = useState<EstadoConexionGoogle>({ fase: "cargando" });
  const [conectando, setConectando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const estadoActual = useRef<EstadoConexionGoogle>({ fase: "cargando" });
  const alCambiarActual = useRef(alCambiar);
  useEffect(() => {
    alCambiarActual.current = alCambiar;
  });

  const aplicar = useCallback((siguiente: EstadoConexionGoogle) => {
    const anterior = estadoActual.current;
    estadoActual.current = siguiente;
    setEstado(siguiente);
    alCambiarActual.current?.(anterior, siguiente);
  }, []);

  const refrescar = useCallback(async (): Promise<EstadoConexionGoogle> => {
    const siguiente = await consultarEstado();
    aplicar(siguiente);
    return siguiente;
  }, [aplicar]);

  // La primera consulta, al abrir la pantalla. Si la pantalla se cierra antes de la respuesta, no se actualiza nada.
  useEffect(() => {
    let vigente = true;
    void consultarEstado().then((siguiente) => {
      if (vigente) aplicar(siguiente);
    });
    return () => {
      vigente = false;
    };
  }, [aplicar]);

  // La ventana de Google termina en `/conexion-google`, que avisa por este canal (mismo navegador y mismo sitio). El mensaje
  // solo dice «hubo un cambio»: lo que vale es lo que responde el servidor, no lo que diga el mensaje.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const canal = new BroadcastChannel(CANAL_DE_CONEXION_GOOGLE);
    canal.onmessage = (evento: MessageEvent<{ estado?: unknown; motivo?: unknown } | null>) => {
      setConectando(false);
      if (evento.data?.estado === "ok") {
        setAviso(null);
        void refrescar();
      } else if (evento.data?.estado === "error") {
        setAviso(MOTIVOS_DE_FALLO[motivoDeFallo(evento.data.motivo)]);
      }
    };
    return () => canal.close();
  }, [refrescar]);

  // Sin canal (o si el aviso no llegó), al volver a esta pestaña se vuelve a preguntar mientras se espera la conexión.
  useEffect(() => {
    if (!conectando) return;
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      void refrescar().then((nuevo) => {
        if (nuevo.fase === "conectada") setConectando(false);
      });
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [conectando, refrescar]);

  const conectar = useCallback(() => {
    setAviso(null);
    const izquierda = Math.max(0, Math.round(window.screenX + (window.outerWidth - ANCHO) / 2));
    const arriba = Math.max(0, Math.round(window.screenY + (window.outerHeight - ALTO) / 2));
    const ventana = window.open(RUTA_PARA_CONECTAR, NOMBRE_DE_LA_VENTANA, `popup=yes,width=${ANCHO},height=${ALTO},left=${izquierda},top=${arriba}`);
    if (!ventana) {
      setAviso(MENSAJE_VENTANA_BLOQUEADA);
      return;
    }
    ventana.focus();
    setConectando(true);
  }, []);

  const desconectar = useCallback(async () => {
    setAviso(null);
    setConectando(false);
    try {
      await desconectarGoogleAction();
    } finally {
      await refrescar();
    }
  }, [refrescar]);

  return { estado, conectando, aviso, conectar, desconectar, refrescar };
}
