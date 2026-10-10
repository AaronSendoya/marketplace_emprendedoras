import { AVISOS, type Aviso, type CampoDeImagen } from "../domain/Avisos";
import { evaluarArchivoDeDrive } from "../domain/EvaluarArchivoDrive";
import { ErrorArchivoDrive, type ConsultaDeArchivo, type IArchivosDrive } from "../domain/IArchivosDrive";
import { TAMANO_MAX_IMAGEN_DRIVE_BYTES } from "@/shared/domain/imagenes";

// Regla 22 (2026-10-09): antes de importar, la vista previa comprueba en Drive la foto y el logo de cada fila con la cuenta de Google
// que conectó el Admin. Solo lee metadatos (no descarga nada) y no escribe nada. Un problema es siempre una advertencia de la fila.
export const MAXIMO_DE_FILAS_A_VERIFICAR = 25;
// Cuántas consultas a Drive a la vez: son solo metadatos, pero Drive limita las peticiones por segundo.
const CONSULTAS_SIMULTANEAS = 4;

export type EstadoDeImagen = "sin_imagen" | "ok" | "problema" | "sin_comprobar";
export type EstadoDeConexion = "ok" | "sin_conexion" | "vencida";

export interface ImagenVerificada {
  estado: EstadoDeImagen;
  aviso: Aviso | null;
}

export interface FilaAVerificar {
  fila: number;
  fotoDriveId: string;
  logoDriveId: string;
}

export interface FilaVerificada {
  fila: number;
  foto: ImagenVerificada;
  logo: ImagenVerificada;
}

export interface ResultadoDeVerificacion {
  conexion: EstadoDeConexion;
  // El correo de la cuenta conectada, para decirle al Admin con cuál está trabajando.
  cuenta: string | null;
  filas: FilaVerificada[];
}

async function enParalelo<T>(elementos: T[], limite: number, tarea: (elemento: T) => Promise<void>): Promise<void> {
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(limite, elementos.length) }, async () => {
    while (siguiente < elementos.length) await tarea(elementos[siguiente++]);
  });
  await Promise.all(trabajadores);
}

const sinComprobar = (id: string): ImagenVerificada => ({ estado: id ? "sin_comprobar" : "sin_imagen", aviso: null });

export class VerificarImagenesDriveUseCase {
  constructor(private readonly drive: IArchivosDrive) {}

  async ejecutar(filas: FilaAVerificar[], token: string | null): Promise<ResultadoDeVerificacion> {
    const sinResultado = (conexion: EstadoDeConexion, cuenta: string | null): ResultadoDeVerificacion => ({
      conexion,
      cuenta,
      filas: filas.map((f) => ({ fila: f.fila, foto: sinComprobar(f.fotoDriveId), logo: sinComprobar(f.logoDriveId) })),
    });
    if (!token) return sinResultado("sin_conexion", null);

    let cuenta: string | null = null;
    try {
      cuenta = await this.drive.cuenta(token);
    } catch (error) {
      if (error instanceof ErrorArchivoDrive && error.motivo === "conexion_vencida") return sinResultado("vencida", null);
      // Cualquier otro fallo se verá archivo por archivo («no pudimos comprobar»).
    }

    const ids = [...new Set(filas.flatMap((f) => [f.fotoDriveId, f.logoDriveId]).filter(Boolean))];
    const consultas = new Map<string, ConsultaDeArchivo>();
    let vencida = false;
    await enParalelo(ids, CONSULTAS_SIMULTANEAS, async (id) => {
      if (vencida) return;
      try {
        consultas.set(id, await this.drive.consultar(id, token));
      } catch (error) {
        if (error instanceof ErrorArchivoDrive && error.motivo === "conexion_vencida") vencida = true;
        else consultas.set(id, { estado: "error" });
      }
    });
    if (vencida) return sinResultado("vencida", cuenta);

    const imagenDe = (campo: CampoDeImagen, id: string): ImagenVerificada => {
      if (!id) return { estado: "sin_imagen", aviso: null };
      const consulta = consultas.get(id);
      if (!consulta || consulta.estado === "error") return { estado: "problema", aviso: AVISOS.imagenNoSeComprobo(campo) };
      if (consulta.estado === "sin_acceso") return { estado: "problema", aviso: AVISOS.imagenSinAcceso(campo, cuenta) };
      const veredicto = evaluarArchivoDeDrive(consulta.archivo);
      switch (veredicto.estado) {
        case "ok":
          return { estado: "ok", aviso: null };
        case "sin_acceso":
          return { estado: "problema", aviso: AVISOS.imagenSinAcceso(campo, cuenta) };
        case "no_es_imagen":
          return { estado: "problema", aviso: AVISOS.imagenNoEsImagen(campo, veredicto.tipo) };
        case "muy_grande":
          return { estado: "problema", aviso: AVISOS.imagenMuyGrande(campo, veredicto.megabytes, TAMANO_MAX_IMAGEN_DRIVE_BYTES / (1024 * 1024)) };
      }
    };

    return {
      conexion: "ok",
      cuenta,
      filas: filas.map((f) => ({ fila: f.fila, foto: imagenDe("foto", f.fotoDriveId), logo: imagenDe("logo", f.logoDriveId) })),
    };
  }
}
