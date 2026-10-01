import { describe, expect, it } from "vitest";
import type { GetMarketplaceUseCase } from "@/core/productos/application/ConsultasProducto";
import type { DeactivateProductoUseCase } from "@/core/productos/application/GestionProductoUseCases";
import { productoDePrueba } from "@/core/productos/testing/dobles";
import { desactivarProducto, listarMarketplace, serializarProductoPropio, serializarProductoPublico } from "./productos.controller";

const url = (clave: string) => `https://cdn.ejemplo.com/${clave}`;
const conDescuento = { precio: 100, porcentajeVigente: 15, precioConDescuento: 85 };

describe("serializarProductoPublico (reglas 7, 8 y 18)", () => {
  it("con precio visible y descuento vigente: precio, porcentaje y precio con descuento", () => {
    const cuerpo = serializarProductoPublico(productoDePrueba(conDescuento), url);

    expect(cuerpo).toMatchObject({ precio: 100, porcentaje: 15, precio_con_descuento: 85, consultar_precio: false });
  });

  it("con precio visible y sin descuento: solo el precio", () => {
    expect(serializarProductoPublico(productoDePrueba(), url)).toMatchObject({ precio: 100, porcentaje: null, precio_con_descuento: null, consultar_precio: false });
  });

  it("con el precio oculto no viaja ni el precio, ni el porcentaje, ni el precio con descuento", () => {
    const cuerpo = serializarProductoPublico(productoDePrueba({ ...conDescuento, mostrarPrecio: false }), url);

    expect(cuerpo).toMatchObject({ precio: null, porcentaje: null, precio_con_descuento: null, consultar_precio: true });
    expect(JSON.stringify(cuerpo)).not.toMatch(/\b(100|85)\b/);
  });

  it("sin precio: consultar_precio, aunque tenga un descuento asignado", () => {
    const cuerpo = serializarProductoPublico(productoDePrueba({ precio: null, porcentajeVigente: 15 }), url);

    expect(cuerpo).toMatchObject({ precio: null, porcentaje: null, precio_con_descuento: null, consultar_precio: true });
  });

  it("un precio 0 visible no se confunde con \"sin precio\"", () => {
    expect(serializarProductoPublico(productoDePrueba({ precio: 0 }), url)).toMatchObject({ precio: 0, consultar_precio: false });
  });

  it("incluye el negocio con su WhatsApp y URLs completas; nunca el id de la cuenta ni claves", () => {
    const cuerpo = serializarProductoPublico(productoDePrueba(), url);

    expect(cuerpo.imagen_url).toBe("https://cdn.ejemplo.com/productos/vieja.webp");
    expect(cuerpo.perfil).toEqual({
      id: "perfil-1",
      nombre_negocio: "Dulces de Ana",
      whatsapp: "59171234567",
      ciudad: { id: "ciudad-1", nombre: "La Paz" },
      rubro: { id: "rubro-1", nombre: "Alimentos" },
      logo_url: "https://cdn.ejemplo.com/logos/logo.webp",
    });
    expect(JSON.stringify(cuerpo)).not.toMatch(/usuario-1|_key|activo/);
  });
});

describe("serializarProductoPropio", () => {
  it("la dueña ve el precio real aunque esté oculto, y el estado activo", () => {
    const cuerpo = serializarProductoPropio(productoDePrueba({ ...conDescuento, mostrarPrecio: false, activo: false }), url);

    expect(cuerpo).toMatchObject({ precio: 100, mostrar_precio: false, activo: false, porcentaje: 15, precio_con_descuento: 85, perfil_id: "perfil-1" });
  });
});

describe("controlador de productos", () => {
  it("listarMarketplace responde la página con la paginación", async () => {
    const usecase = { ejecutar: async () => ({ datos: [productoDePrueba()], total: 7 }) } as unknown as GetMarketplaceUseCase;

    const cuerpo = await listarMarketplace(usecase, {}, { pagina: 3, limite: 1 }, url).then((r) => r.json());

    expect(cuerpo.paginacion).toEqual({ pagina: 3, limite: 1, total: 7 });
    expect(cuerpo.datos[0].id).toBe("producto-1");
  });

  it("desactivarProducto responde 204 sin cuerpo", async () => {
    const usecase = { ejecutar: async () => undefined } as unknown as DeactivateProductoUseCase;

    const respuesta = await desactivarProducto(usecase, { id: "usuario-1", rol: "Emprendedor" }, "producto-1");

    expect(respuesta.status).toBe(204);
    expect(await respuesta.text()).toBe("");
  });
});
