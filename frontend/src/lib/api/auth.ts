import { cache } from "react";
import { enviarJson, obtenerJsonAutenticado } from "./cliente";
import type { LoginRespuesta, Usuario } from "./tipos";

// POST /auth/login: mismo error (401) ante correo inexistente, contraseña incorrecta o cuenta
// desactivada (regla 5, backend); 429 con Retry-After tras 5 intentos fallidos en 15 minutos
// (regla 17). El mapeo a mensajes en español vive en lib/auth/acciones.ts, no aquí.
export const iniciarSesion = (email: string, password: string) =>
  enviarJson<LoginRespuesta>("/auth/login", { email, password });

// GET /auth/me: el rol y `activo` siempre se leen de la base en esa misma petición (regla 5), así
// que esto es lo único confiable para saber "quién sos" — la sola presencia de la cookie no
// alcanza para proteger una ruta (ver app/admin/layout.tsx). `cache()` de React memoiza por
// petición: el layout guard y la página protegida llaman a esto por separado sin duplicar el
// viaje real al backend (no se puede confiar en la deduplicación automática de fetch, porque
// cache: "no-store" la desactiva).
export const obtenerMe = cache(() => obtenerJsonAutenticado<Usuario>("/auth/me"));
