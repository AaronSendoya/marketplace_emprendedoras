export const ROLES = ["Admin", "Emprendedor"] as const;

export type NombreRol = (typeof ROLES)[number];
