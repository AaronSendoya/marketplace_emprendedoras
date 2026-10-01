import type { UsuarioAutenticado } from "@/core/auth/domain/Usuario";
import { MySqlUsuarioRepository } from "@/core/auth/infrastructure/MySqlUsuarioRepository";
import { GetMiPerfilUseCase, GetPerfilesUseCase, GetPerfilUseCase } from "@/core/perfiles/application/ConsultasPerfil";
import { CreatePerfilUseCase } from "@/core/perfiles/application/CreatePerfilUseCase";
import { ReemplazarImagenPerfilUseCase } from "@/core/perfiles/application/ReemplazarImagenPerfilUseCase";
import { UpdatePerfilUseCase } from "@/core/perfiles/application/UpdatePerfilUseCase";
import type { Actor } from "@/core/perfiles/domain/Perfil";
import { MySqlPerfilRepository } from "@/core/perfiles/infrastructure/MySqlPerfilRepository";
import { imageStoragePorDefecto } from "@/shared/infrastructure/crearImageStorage";
import { ImageProcessorService } from "@/shared/infrastructure/ImageProcessorService";
import { logger } from "@/shared/infrastructure/logger";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

// Cableado de los casos de uso de perfiles: las rutas no lo repiten.
function dependencias() {
  const db = getMySqlClient();
  return {
    perfiles: new MySqlPerfilRepository(db),
    usuarios: new MySqlUsuarioRepository(db),
    procesador: new ImageProcessorService(),
    almacenamiento: imageStoragePorDefecto(),
    clock: new SystemClock(),
  };
}

export const actorDe = (usuario: UsuarioAutenticado): Actor => ({ id: usuario.id, rol: usuario.rol });

export function urlImagenPorDefecto(): (clave: string) => string {
  const almacenamiento = imageStoragePorDefecto();
  return (clave) => almacenamiento.urlPublica(clave);
}

export const crearGetPerfiles = () => new GetPerfilesUseCase(dependencias().perfiles);
export const crearGetPerfil = () => new GetPerfilUseCase(dependencias().perfiles);
export const crearGetMiPerfil = () => new GetMiPerfilUseCase(dependencias().perfiles);

export function crearCreatePerfil(): CreatePerfilUseCase {
  const { perfiles, usuarios, procesador, almacenamiento, clock } = dependencias();
  return new CreatePerfilUseCase(perfiles, usuarios, procesador, almacenamiento, clock, logger);
}

export function crearUpdatePerfil(): UpdatePerfilUseCase {
  const { perfiles, clock } = dependencias();
  return new UpdatePerfilUseCase(perfiles, clock, logger);
}

export function crearReemplazarImagenPerfil(): ReemplazarImagenPerfilUseCase {
  const { perfiles, procesador, almacenamiento, clock } = dependencias();
  return new ReemplazarImagenPerfilUseCase(perfiles, procesador, almacenamiento, clock, logger);
}
