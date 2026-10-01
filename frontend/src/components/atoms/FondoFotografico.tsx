import Image from "next/image";

interface PropsFondoFotografico {
  src: string;
  priority?: boolean;
}

// La foto de portada tal cual está guardada, sin escala de grises ni tinte de color (CLAUDE.md
// sección 6, regla 10: pedido explícito del cliente, 2026-09-28, revierte el tratamiento
// anterior). El degradado oscuro de la base es neutro, no un tinte de color: solo asegura que el
// texto blanco de encima siga siendo legible. Un solo lugar para este tratamiento porque lo usan
// tanto Hero (Landing) como CatalogHeader (catálogos).
export function FondoFotografico({ src, priority = false }: PropsFondoFotografico) {
  return (
    <>
      <Image src={src} alt="" fill priority={priority} sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-texto/85 via-texto/20 to-transparent" aria-hidden="true" />
    </>
  );
}
