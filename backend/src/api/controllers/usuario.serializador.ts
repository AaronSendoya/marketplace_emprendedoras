import { nombreCompleto, type Usuario, type UsuarioAutenticado, type UsuarioConPerfil } from "@/core/auth/domain/Usuario";

// Allow-list explícito: nunca se serializa el objeto completo (evita filtrar passwordHash si el
// dominio agrega un campo sensible más adelante).
export function serializarUsuario(usuario: UsuarioAutenticado | Usuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombres: usuario.nombres,
    apellido_paterno: usuario.apellidoPaterno,
    apellido_materno: usuario.apellidoMaterno,
    nombre_completo: nombreCompleto(usuario),
    rol: usuario.rol,
    activo: usuario.activo,
    email_verificado_en: usuario.emailVerificadoEn ? usuario.emailVerificadoEn.toISOString() : null,
    creado_en: usuario.creadoEn.toISOString(),
  };
}

// Regla 18: la cuenta del listado del Admin con el nombre de su negocio (o `null` si todavía no tiene perfil).
export function serializarUsuarioConPerfil(usuario: UsuarioConPerfil) {
  return {
    ...serializarUsuario(usuario),
    perfil: usuario.perfil ? { id: usuario.perfil.id, nombre_negocio: usuario.perfil.nombreNegocio } : null,
  };
}
