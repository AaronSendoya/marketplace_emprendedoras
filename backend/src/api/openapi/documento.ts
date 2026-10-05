import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import paquete from "../../../package.json";
import { registrarComponentes } from "./componentes";
import { registrarAdminUsuarios } from "./rutas/admin-usuarios";
import { registrarAuth } from "./rutas/auth";
import { registrarCatalogos } from "./rutas/catalogos";
import { registrarHealth } from "./rutas/health";
import { registrarDescuentos } from "./rutas/descuentos";
import { registrarMetricas } from "./rutas/metricas";
import { registrarPerfiles } from "./rutas/perfiles";
import { registrarProductos } from "./rutas/productos";

// Cada paso que agrega rutas suma aquí su registrar*() y, si hace falta, su etiqueta.
export function generarDocumento() {
  const registro = new OpenAPIRegistry();
  registrarComponentes(registro);
  registrarHealth(registro);
  registrarCatalogos(registro);
  registrarAuth(registro);
  registrarAdminUsuarios(registro);
  registrarPerfiles(registro);
  registrarProductos(registro);
  registrarDescuentos(registro);
  registrarMetricas(registro);

  return new OpenApiGeneratorV31(registro.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "API del catálogo Track de Mujeres 2026",
      version: paquete.version,
      description:
        "Contrato de la API para el frontend. Los errores siempre usan el formato `Error`. " +
        "Las rutas protegidas requieren `Authorization: Bearer <token>`.",
    },
    // Ruta relativa: Swagger UI llama al mismo origen desde el que se sirve.
    servers: [{ url: "/api/v1" }],
    tags: [
      { name: "Sistema", description: "Estado del servicio." },
      { name: "Catálogos", description: "Ciudades y rubros." },
      { name: "Autenticación", description: "Login por JWT (regla 5) y códigos OTP (regla 15)." },
      { name: "Admin", description: "Gestión de cuentas. Solo Admin (regla 5)." },
      { name: "Perfiles", description: "Feed 1: perfiles de emprendedoras (reglas 2, 3, 6, 11 y 18)." },
      { name: "Marketplace", description: "Feed 2 público: productos con su descuento vigente (reglas 7 y 8)." },
      { name: "Productos", description: "Gestión de los productos propios (reglas 7 y 18)." },
      { name: "Descuentos", description: "Motor de promociones: descuentos por porcentaje con vigencia (reglas 8 y 9)." },
      { name: "Métricas", description: "Clics de contacto del catálogo público, anónimos (regla 19)." },
    ],
  });
}
