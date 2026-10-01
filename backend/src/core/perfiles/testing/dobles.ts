import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import type { TipoImagen } from "@/shared/domain/imagenes";
import type { IPerfilRepository } from "../domain/IPerfilRepository";
import type { CambiosPerfil, FiltrosPerfiles, NuevoPerfil, Perfil } from "../domain/Perfil";

export const perfilDePrueba = (parches: Partial<Perfil> = {}): Perfil => ({
  id: "perfil-1",
  usuarioId: "usuario-1",
  usuarioActivo: true,
  nombreEmprendedora: "Ana Pérez",
  nombreNegocio: "Dulces de Ana",
  descripcion: "Postres caseros",
  whatsapp: "59171234567",
  instagramUsername: "dulcesdeana",
  otraRedSocial: null,
  ciudad: { id: "ciudad-1", nombre: "La Paz" },
  rubro: { id: "rubro-1", nombre: "Alimentos" },
  fotoPerfilKey: "perfiles/foto-vieja.webp",
  logoKey: "logos/logo-viejo.webp",
  creadoEn: new Date("2026-09-01T00:00:00Z"),
  actualizadoEn: new Date("2026-09-01T00:00:00Z"),
  ...parches,
});

// Doble de prueba: replica la unicidad usuario-perfil y las claves foráneas de ciudad y rubro.
export class PerfilRepositoryEnMemoria implements IPerfilRepository {
  constructor(
    readonly perfiles: Perfil[] = [],
    private readonly ciudadesValidas = ["ciudad-1", "ciudad-2"],
    private readonly rubrosValidos = ["rubro-1", "rubro-2"],
  ) {}

  falloAlActualizar = false;

  async crear(datos: NuevoPerfil): Promise<Perfil> {
    if (this.perfiles.some((p) => p.usuarioId === datos.usuarioId)) throw new ErrorConflicto("Este usuario ya tiene un perfil.");
    if (!this.ciudadesValidas.includes(datos.ciudadId)) throw new ErrorValidacion("La ciudad indicada no existe.");
    if (!this.rubrosValidos.includes(datos.rubroId)) throw new ErrorValidacion("El rubro indicado no existe.");
    const perfil = perfilDePrueba({
      id: `perfil-${this.perfiles.length + 1}`,
      usuarioId: datos.usuarioId,
      nombreNegocio: datos.nombreNegocio,
      descripcion: datos.descripcion,
      whatsapp: datos.whatsapp,
      instagramUsername: datos.instagramUsername,
      otraRedSocial: datos.otraRedSocial,
      ciudad: { id: datos.ciudadId, nombre: "Ciudad" },
      rubro: { id: datos.rubroId, nombre: "Rubro" },
      fotoPerfilKey: datos.fotoPerfilKey,
      logoKey: datos.logoKey,
      creadoEn: datos.ahora,
      actualizadoEn: datos.ahora,
    });
    this.perfiles.push(perfil);
    return { ...perfil };
  }

  async buscarPorId(id: string) {
    const perfil = this.perfiles.find((p) => p.id === id);
    return perfil ? { ...perfil } : null;
  }

  async buscarPorUsuarioId(usuarioId: string) {
    const perfil = this.perfiles.find((p) => p.usuarioId === usuarioId);
    return perfil ? { ...perfil } : null;
  }

  async actualizar(id: string, cambios: CambiosPerfil, ahora: Date) {
    if (this.falloAlActualizar) throw new Error("fallo de la base");
    if (cambios.ciudadId !== undefined && !this.ciudadesValidas.includes(cambios.ciudadId)) throw new ErrorValidacion("La ciudad indicada no existe.");
    const perfil = this.perfiles.find((p) => p.id === id);
    if (!perfil) return;
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor !== undefined) (perfil as unknown as Record<string, unknown>)[clave] = valor;
    }
    perfil.actualizadoEn = ahora;
  }

  async listar(filtros: FiltrosPerfiles, pagina: ParametrosPagina): Promise<Pagina<Perfil>> {
    const coinciden = this.perfiles
      .filter((p) => p.usuarioActivo)
      .filter((p) => !filtros.ciudadId || p.ciudad.id === filtros.ciudadId)
      .filter((p) => !filtros.rubroId || p.rubro.id === filtros.rubroId);
    return { datos: coinciden.slice(desplazamiento(pagina), desplazamiento(pagina) + pagina.limite), total: coinciden.length };
  }
}

// Sin sharp: devuelve un texto reconocible y rechaza la entrada "invalida".
export class ProcesadorFalso implements IImageProcessor {
  procesados: { entrada: string; tipo: TipoImagen }[] = [];

  async procesar(entrada: Buffer, tipo: TipoImagen): Promise<Buffer> {
    const texto = entrada.toString();
    if (texto === "invalida") throw new ErrorValidacion("El archivo debe ser una imagen JPEG, PNG o WebP válida.");
    this.procesados.push({ entrada: texto, tipo });
    return Buffer.from(`webp(${tipo}):${texto}`);
  }
}
