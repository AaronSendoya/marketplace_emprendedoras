import { describe, expect, it } from "vitest";
import { serializarDescuento } from "@/api/controllers/descuentos.controller";
import { serializarPerfil } from "@/api/controllers/perfiles.controller";
import { serializarProductoPropio, serializarProductoPublico } from "@/api/controllers/productos.controller";
import { serializarUsuario } from "@/api/controllers/usuario.serializador";
import { descuentoDePrueba } from "@/core/descuentos/testing/dobles";
import { perfilDePrueba } from "@/core/perfiles/testing/dobles";
import { productoDePrueba } from "@/core/productos/testing/dobles";
import { usuarioDePrueba } from "@/core/auth/testing/dobles";
import { sanearDatos } from "@/shared/infrastructure/ConsoleLogger";

// Regla 17 (exposición de datos sensibles): cada respuesta se arma con una lista explícita de
// campos. Se llenan los objetos de dominio con valores centinela en TODOS los campos y se comprueba
// qué llega a la respuesta: lo que no está en la lista blanca no puede salir.
const url = (clave: string) => `https://cdn.ejemplo.com/${clave}`;
const claves = (objeto: object) => Object.keys(objeto).sort();

describe("lista blanca de campos de cada respuesta (caja blanca)", () => {
  it("usuario: nunca el hash de la contraseña ni la versión del token", () => {
    const usuario = usuarioDePrueba({ passwordHash: "CENTINELA_HASH", tokenVersion: 987654 });
    const cuerpo = serializarUsuario(usuario);

    expect(claves(cuerpo)).toEqual(
      ["activo", "apellido_materno", "apellido_paterno", "creado_en", "email", "email_verificado_en", "id", "nombre_completo", "nombres", "rol"].sort(),
    );
    expect(JSON.stringify(cuerpo)).not.toMatch(/CENTINELA_HASH|987654|passwordHash|password|token/i);
  });

  it("perfil (público): sin correo, sin id de la cuenta y sin claves internas de las imágenes", () => {
    const cuerpo = serializarPerfil(perfilDePrueba({ usuarioId: "CENTINELA_USUARIO", usuarioActivo: true, fotoPerfilKey: "perfiles/a.webp", logoKey: "logos/b.webp" }), url);

    expect(claves(cuerpo)).toEqual(
      ["actualizado_en", "ciudad", "creado_en", "descripcion", "emprendedora", "foto_perfil_url", "id", "instagram_username", "logo_url", "nombre_negocio", "otra_red_social", "rubro", "whatsapp"].sort(),
    );
    const texto = JSON.stringify(cuerpo);
    expect(texto).not.toMatch(/CENTINELA_USUARIO|usuario_id|usuarioId|email|correo|_key|Key/);
  });

  it("producto (público): con el precio oculto no sale ni el precio ni el descuento, y nunca el id de la cuenta", () => {
    const producto = productoDePrueba({ precio: 8888.77, mostrarPrecio: false, porcentajeVigente: 41, precioConDescuento: 5244.23 });
    producto.perfil.usuarioId = "CENTINELA_USUARIO";
    const cuerpo = serializarProductoPublico(producto, url);

    expect(claves(cuerpo)).toEqual(
      ["consultar_precio", "creado_en", "descripcion", "id", "imagen_url", "nombre", "perfil", "porcentaje", "precio", "precio_con_descuento"].sort(),
    );
    expect(claves(cuerpo.perfil)).toEqual(["ciudad", "id", "logo_url", "nombre_negocio", "rubro", "whatsapp"].sort());
    const texto = JSON.stringify(cuerpo);
    expect(texto).not.toMatch(/8888|5244|"porcentaje":41|CENTINELA_USUARIO|activo|_key/);
    expect(cuerpo).toMatchObject({ precio: null, porcentaje: null, precio_con_descuento: null, consultar_precio: true });
  });

  it("producto (propio): sí muestra el precio real y el estado, pero tampoco el id de la cuenta", () => {
    const producto = productoDePrueba({ precio: 8888.77, mostrarPrecio: false });
    producto.perfil.usuarioId = "CENTINELA_USUARIO";
    const cuerpo = serializarProductoPropio(producto, url);

    expect(claves(cuerpo)).toEqual(
      ["activo", "actualizado_en", "creado_en", "descripcion", "id", "imagen_url", "mostrar_precio", "nombre", "perfil_id", "porcentaje", "precio", "precio_con_descuento"].sort(),
    );
    expect(cuerpo.precio).toBe(8888.77);
    expect(JSON.stringify(cuerpo)).not.toMatch(/CENTINELA_USUARIO|usuario_id/);
  });

  it("descuento: sin el id de la cuenta dueña", () => {
    const cuerpo = serializarDescuento({ ...descuentoDePrueba({ perfilUsuarioId: "CENTINELA_USUARIO" }), estado: "vigente" });

    expect(claves(cuerpo)).toEqual(["creado_en", "descripcion", "estado", "fecha_fin", "fecha_inicio", "id", "perfil_id", "porcentaje", "producto_ids"].sort());
    expect(JSON.stringify(cuerpo)).not.toContain("CENTINELA_USUARIO");
  });
});

describe("el registro de eventos tapa lo sensible aunque se le entregue por error", () => {
  it("redacta por nombre de campo y por contenido (correo, JWT, Bearer)", () => {
    const registrado = JSON.stringify(
      sanearDatos({
        password: "clave-secreta",
        codigoOtp: "123456",
        otp: "123456",
        email: "persona@ejemplo.com",
        whatsapp: "59171234567",
        authorization: "Bearer abc.def.ghi",
        anidado: { token: "t", mensaje: "escribió a persona@ejemplo.com con eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.firmafirmafirma" },
        error: new Error("falló para persona@ejemplo.com"),
      }),
    );

    for (const secreto of ["clave-secreta", "123456", "persona@ejemplo.com", "59171234567", "Bearer abc", "eyJhbGci"]) {
      expect(registrado, `se coló: ${secreto}`).not.toContain(secreto);
    }
  });
});
