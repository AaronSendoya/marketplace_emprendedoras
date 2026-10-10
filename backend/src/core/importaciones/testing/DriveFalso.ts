import { ErrorArchivoDrive, type ConsultaDeArchivo, type IArchivosDrive, type MotivoDeFalloDeDrive } from "../domain/IArchivosDrive";

// Un Google Drive de mentira para las pruebas de la importación (regla 22): los archivos que existen, para qué cuenta y qué pasa al
// bajarlos. Registra qué se consultó y se descargó, y cuántas descargas hubo a la vez.

export interface ArchivoFalso {
  nombre?: string;
  tipoMime?: string;
  // `null` = Drive no informa el peso.
  bytes?: number | null;
  puedeDescargar?: boolean;
  contenido?: string | Buffer;
  // La consulta funciona pero bajarlo falla con este motivo.
  fallaAlDescargar?: MotivoDeFalloDeDrive;
  // La consulta responde que no hay acceso (404 de Drive).
  sinAcceso?: boolean;
  // La consulta falla por un error de Google (5xx, red).
  errorAlConsultar?: boolean;
}

export class DriveFalso implements IArchivosDrive {
  readonly archivos = new Map<string, ArchivoFalso>();
  correo: string | null = "empresa@gmail.com";
  readonly tokenValido = "ya29.token-de-prueba-valido-0000000000";
  readonly consultas: string[] = [];
  readonly descargas: string[] = [];
  // Mayor número de descargas en curso al mismo tiempo.
  maximoSimultaneas = 0;
  private activas = 0;

  agregar(id: string, archivo: ArchivoFalso = {}): this {
    this.archivos.set(id, archivo);
    return this;
  }

  private comprobar(token: string) {
    if (token !== this.tokenValido) throw new ErrorArchivoDrive("conexion_vencida");
  }

  async cuenta(token: string): Promise<string | null> {
    this.comprobar(token);
    return this.correo;
  }

  async consultar(id: string, token: string): Promise<ConsultaDeArchivo> {
    this.comprobar(token);
    this.consultas.push(id);
    const archivo = this.archivos.get(id);
    if (!archivo || archivo.sinAcceso) return { estado: "sin_acceso" };
    if (archivo.errorAlConsultar) return { estado: "error" };
    const contenido = archivo.contenido === undefined ? "imagen" : archivo.contenido;
    return {
      estado: "ok",
      archivo: {
        nombre: archivo.nombre ?? "foto.jpg",
        tipoMime: archivo.tipoMime ?? "image/jpeg",
        bytes: archivo.bytes === undefined ? Buffer.byteLength(contenido) : archivo.bytes,
        puedeDescargar: archivo.puedeDescargar ?? true,
      },
    };
  }

  async descargar(id: string, token: string, maximoBytes: number): Promise<Buffer> {
    this.comprobar(token);
    this.descargas.push(id);
    this.activas += 1;
    this.maximoSimultaneas = Math.max(this.maximoSimultaneas, this.activas);
    try {
      // Cede el turno: así dos descargas lanzadas a la vez se ven como simultáneas.
      await new Promise((resolver) => setTimeout(resolver, 1));
      const archivo = this.archivos.get(id);
      if (!archivo || archivo.sinAcceso) throw new ErrorArchivoDrive("sin_acceso");
      if (archivo.fallaAlDescargar) throw new ErrorArchivoDrive(archivo.fallaAlDescargar);
      const contenido = Buffer.from(archivo.contenido ?? "imagen");
      if (contenido.length > maximoBytes) throw new ErrorArchivoDrive("muy_grande");
      return contenido;
    } finally {
      this.activas -= 1;
    }
  }
}
