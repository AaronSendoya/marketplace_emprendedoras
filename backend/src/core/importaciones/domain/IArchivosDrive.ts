import { ErrorConflicto } from "@/shared/domain/errors";

// Regla 22 (2026-10-09) y regla 17: lo que la importación necesita de Google Drive. Es un puerto: el caso de uso no sabe que detrás hay
// una API HTTP. El token es el de la cuenta de Google que conectó el Admin (solo lectura, una hora, nunca se guarda).

export type MotivoDeFalloDeDrive =
  // No existe, no es de esa cuenta o no la dejan descargarlo: Drive responde igual (404) para no revelar qué archivos existen.
  | "sin_acceso"
  // El token venció o la persona lo revocó.
  | "conexion_vencida"
  // Pasa del tope de la descarga.
  | "muy_grande"
  // Red, tiempo agotado o un error de Google.
  | "error";

export class ErrorArchivoDrive extends Error {
  constructor(readonly motivo: MotivoDeFalloDeDrive) {
    super(`Drive: ${motivo}`);
  }
}

// La conexión con Google dejó de valer en medio de una importación. Se responde 409 con un detalle propio para que el frontend pida
// conectar de nuevo y reanude con las filas pendientes (nada se creó con una conexión que ya no servía).
export class ErrorConexionGoogle extends ErrorConflicto {
  constructor() {
    const mensaje = "La conexión con Google venció o no es válida. Vuelve a conectar la cuenta y continúa.";
    super(mensaje, [{ campo: "google", mensaje }]);
  }
}

export interface ArchivoDeDrive {
  nombre: string;
  tipoMime: string;
  // `null` si Drive no lo informa (un archivo propio de Google Docs, por ejemplo).
  bytes: number | null;
  puedeDescargar: boolean;
}

export type ConsultaDeArchivo = { estado: "ok"; archivo: ArchivoDeDrive } | { estado: "sin_acceso" } | { estado: "error" };

export interface IArchivosDrive {
  // El correo de la cuenta que dueña del token. `null` si Drive no lo informa. Lanza ErrorArchivoDrive("conexion_vencida").
  cuenta(token: string): Promise<string | null>;
  // Solo metadatos: no descarga nada. Lanza ErrorArchivoDrive("conexion_vencida").
  consultar(id: string, token: string): Promise<ConsultaDeArchivo>;
  // El contenido, cortado en `maximoBytes`. Lanza ErrorArchivoDrive con el motivo.
  descargar(id: string, token: string, maximoBytes: number): Promise<Buffer>;
}
