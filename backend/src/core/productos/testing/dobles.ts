import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import { ErrorValidacion } from "@/shared/domain/errors";
import type { IProductoRepository } from "../domain/IProductoRepository";
import type { CambiosProducto, FiltrosMarketplace, NuevoProducto, Producto } from "../domain/Producto";

export const productoDePrueba = (parches: Partial<Producto> = {}): Producto => ({
  id: "producto-1",
  perfilId: "perfil-1",
  nombre: "Torta de chocolate",
  descripcion: "Con cobertura",
  precio: 100,
  mostrarPrecio: true,
  imagenKey: "productos/vieja.webp",
  activo: true,
  creadoEn: new Date("2026-09-01T00:00:00Z"),
  actualizadoEn: new Date("2026-09-01T00:00:00Z"),
  porcentajeVigente: null,
  precioConDescuento: null,
  perfil: {
    id: "perfil-1",
    usuarioId: "usuario-1",
    usuarioActivo: true,
    nombreNegocio: "Dulces de Ana",
    whatsapp: "59171234567",
    ciudad: { id: "ciudad-1", nombre: "La Paz" },
    rubro: { id: "rubro-1", nombre: "Alimentos" },
    logoKey: "logos/logo.webp",
  },
  ...parches,
});

// Doble de prueba: no calcula descuentos (eso lo hace el SQL, probado en integración).
export class ProductoRepositoryEnMemoria implements IProductoRepository {
  constructor(
    readonly productos: Producto[] = [],
    private readonly perfilesValidos = ["perfil-1", "perfil-2"],
  ) {}

  falloAlActualizar = false;

  async crear(datos: NuevoProducto): Promise<Producto> {
    if (!this.perfilesValidos.includes(datos.perfilId)) throw new ErrorValidacion("El perfil indicado no existe.");
    const producto = productoDePrueba({
      id: `producto-${this.productos.length + 1}`,
      perfilId: datos.perfilId,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      precio: datos.precio,
      mostrarPrecio: datos.mostrarPrecio,
      imagenKey: datos.imagenKey,
      creadoEn: datos.ahora,
      actualizadoEn: datos.ahora,
      perfil: { ...productoDePrueba().perfil, id: datos.perfilId, usuarioId: datos.perfilId === "perfil-1" ? "usuario-1" : "usuario-2" },
    });
    this.productos.push(producto);
    return { ...producto };
  }

  async buscarPorId(id: string) {
    const producto = this.productos.find((p) => p.id === id);
    return producto ? { ...producto } : null;
  }

  async actualizar(id: string, cambios: CambiosProducto, ahora: Date) {
    if (this.falloAlActualizar) throw new Error("fallo de la base");
    const producto = this.productos.find((p) => p.id === id);
    if (!producto) return;
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor !== undefined) (producto as unknown as Record<string, unknown>)[clave] = valor;
    }
    producto.actualizadoEn = ahora;
  }

  async listarMarketplace(_ahora: Date, filtros: FiltrosMarketplace, pagina: ParametrosPagina): Promise<Pagina<Producto>> {
    const coinciden = this.productos
      .filter((p) => p.activo && p.perfil.usuarioActivo)
      .filter((p) => !filtros.perfilId || p.perfilId === filtros.perfilId);
    return { datos: coinciden.slice(desplazamiento(pagina), desplazamiento(pagina) + pagina.limite), total: coinciden.length };
  }

  async listarPorPerfil(perfilId: string, _ahora: Date, pagina: ParametrosPagina): Promise<Pagina<Producto>> {
    const propios = this.productos.filter((p) => p.perfilId === perfilId);
    return { datos: propios.slice(desplazamiento(pagina), desplazamiento(pagina) + pagina.limite), total: propios.length };
  }
}
