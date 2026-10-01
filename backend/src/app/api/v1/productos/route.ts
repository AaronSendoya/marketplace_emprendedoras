import { actorDe, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearCreateProducto } from "@/api/composicion/productos";
import { crearProducto } from "@/api/controllers/productos.controller";
import { exigirImagen } from "@/api/http/imagenes";
import { leerFormulario, LIMITE_CUERPO_UNA_IMAGEN, separarFormulario } from "@/api/http/multipart";
import { validarDatos } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaCrearProductoForm } from "@/api/openapi/rutas/productos";

export const POST = withErrorHandling(
  requireAuth(async (request, _contexto, usuario) => {
    const { texto, archivos } = await separarFormulario(await leerFormulario(request, LIMITE_CUERPO_UNA_IMAGEN), ["imagen"]);
    // Un precio vacío en el formulario (precio=) significa "sin precio".
    if (texto.precio === "") delete texto.precio;
    const campos = validarDatos(EsquemaCrearProductoForm, texto, "formulario");

    return crearProducto(
      crearCreateProducto(),
      actorDe(usuario),
      {
        perfilId: campos.perfil_id,
        nombre: campos.nombre,
        descripcion: campos.descripcion || null,
        precio: campos.precio ?? null,
        mostrarPrecio: campos.mostrar_precio,
        imagen: exigirImagen(archivos.imagen, "imagen"),
      },
      urlImagenPorDefecto(),
    );
  }),
);
