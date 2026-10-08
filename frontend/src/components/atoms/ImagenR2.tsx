import Image, { type ImageProps } from "next/image";

// Toda imagen que viene de Cloudflare R2 (foto de perfil, logo, imagen de un producto) se muestra con este componente y no con
// `next/image` a secas (CLAUDE.md regla 16, decidido el 2026-10-08). Va `unoptimized`: el navegador pide el archivo directamente
// a R2 y nada pasa por el optimizador de Next. Ya se guardan reducidas y en WebP (regla 16), y el optimizador guarda copias en
// el disco de este servidor que siguen sirviéndose aunque la imagen se borre de R2, lo que contradice que eliminar una cuenta
// borre todo (regla 5; comprobado: R2 daba 404 y el optimizador seguía respondiendo 200). Con `unoptimized`, `sizes` no se usa.
// Los logos y banners locales de PISTA8 sí pasan por `next/image`; una regla de ESLint impide importarlo en cualquier otro sitio.
export function ImagenR2(props: Omit<ImageProps, "unoptimized" | "loader">) {
  // eslint-disable-next-line jsx-a11y/alt-text -- `alt` llega en `props`, igual que en `next/image`
  return <Image {...props} unoptimized />;
}
