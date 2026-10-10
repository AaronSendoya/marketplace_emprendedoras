"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { EntradaArchivoImagen } from "@/components/atoms/EntradaArchivoImagen";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { CampoImagen } from "@/components/organisms/CampoImagen";
import { crearProductoAction, editarProductoAction, reemplazarImagenProductoAction, type EstadoFormularioProducto } from "@/lib/admin/productos-acciones";
import type { ProductoPropio } from "@/lib/api/tipos";
import { errorDescripcionProducto, errorNombreProducto } from "@/lib/validacion/producto";
import { useTrampaDeFoco } from "@/lib/hooks/useTrampaDeFoco";
import { useEnvioSinReinicio } from "@/lib/hooks/useEnvioSinReinicio";

// Las tres escrituras del formulario de producto. Por defecto son las del Admin (revalidan
// /admin/emprendimientos/{usuarioId}); el panel de la Emprendedora pasa las suyas (revalidan
// /mi-negocio) y reutiliza el mismo formulario, las mismas validaciones y el mismo aviso de cambios
// sin guardar, sin copiarlos.
export interface AccionesFormularioProducto {
  crear: (estadoPrevio: EstadoFormularioProducto, formData: FormData) => Promise<EstadoFormularioProducto>;
  editar: (productoId: string, estadoPrevio: EstadoFormularioProducto, formData: FormData) => Promise<EstadoFormularioProducto>;
  reemplazarImagen: (productoId: string, estadoPrevio: EstadoFormularioProducto, formData: FormData) => Promise<EstadoFormularioProducto>;
}

interface PropsProductoFormularioModal {
  // `perfilId` solo hace falta cuando quien crea es un Admin (regla 18 backend); una emprendedora
  // crea siempre en su propio perfil y no lo manda.
  perfilId?: string;
  usuarioId?: string;
  producto: ProductoPropio | null;
  abierto: boolean;
  onCerrar: () => void;
  acciones?: AccionesFormularioProducto;
}

interface ErroresCampos {
  nombre?: string;
  descripcion?: string;
}

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";
const CLASES_ERROR = "flex items-center gap-2 font-cuerpo text-xs text-acento";
const ESTADO_INICIAL: EstadoFormularioProducto = {};

// Un solo modal para alta y edición: la diferencia es `perfil_id` + imagen obligatoria (alta,
// multipart) contra solo los campos de texto por PATCH (edición) más, aparte, el reemplazo de
// imagen (CampoImagen, su propia ruta PUT .../imagen).
export function ProductoFormularioModal({ perfilId, usuarioId = "", producto, abierto, onCerrar, acciones }: PropsProductoFormularioModal) {
  const productoId = producto?.id ?? "";
  const accionCrear = acciones?.crear ?? crearProductoAction.bind(null, usuarioId);
  const accionEditar = acciones ? acciones.editar.bind(null, productoId) : editarProductoAction.bind(null, productoId, usuarioId);
  const { estado, alEnviar, pendiente } = useEnvioSinReinicio(producto ? accionEditar : accionCrear, ESTADO_INICIAL);
  const accionImagen = acciones
    ? acciones.reemplazarImagen.bind(null, productoId)
    : reemplazarImagenProductoAction.bind(null, productoId, usuarioId);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Validación en vivo (onBlur): solo feedback anticipado, la fuente de verdad sigue siendo el
  // Zod del backend al enviar. `tocado` evita mostrar un error en rojo sobre un campo que el
  // usuario todavía no visitó.
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [tocado, setTocado] = useState<{ nombre?: boolean; descripcion?: boolean }>({});

  // Avisa antes de perder texto sin guardar al cerrar por accidente (fondo, "Cancelar" o
  // Escape). Cualquier cambio en el formulario principal lo activa; no cubre el reemplazo de
  // imagen de abajo (CampoImagen, su propio mini-formulario de un solo campo).
  const [sinGuardar, setSinGuardar] = useState(false);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  // El listener de Escape vive en un efecto que solo depende de `abierto` (se arma una vez por
  // apertura, no en cada tecleo): lee estos refs en vez de cerrar sobre `sinGuardar`/`onCerrar`
  // directamente, para no quedarse con un valor viejo mientras el modal sigue abierto. Los refs se
  // actualizan en su propio efecto (nunca durante el render).
  const sinGuardarRef = useRef(sinGuardar);
  const onCerrarRef = useRef(onCerrar);
  const dialogoRef = useRef<HTMLDivElement>(null);
  useTrampaDeFoco(dialogoRef, abierto);

  useEffect(() => {
    sinGuardarRef.current = sinGuardar;
    onCerrarRef.current = onCerrar;
  }, [sinGuardar, onCerrar]);

  // Reinicia la validación y el aviso de cambios al (re)abrir el modal — "adjusting state when a
  // prop changes" durante el render, en vez de un useEffect con setState adentro.
  const [abiertoPrevio, setAbiertoPrevio] = useState(abierto);
  if (abierto !== abiertoPrevio) {
    setAbiertoPrevio(abierto);
    if (abierto) {
      setErrores({});
      setTocado({});
      setSinGuardar(false);
    }
  }

  useEffect(() => {
    if (estado.guardado) onCerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.guardado]);

  useEffect(() => {
    if (!abierto) return;
    cerrarRef.current?.focus();
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (sinGuardarRef.current) setConfirmarCierre(true);
      else onCerrarRef.current();
    }
    window.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [abierto]);

  if (!abierto) return null;

  function intentarCerrar() {
    if (sinGuardar) {
      setConfirmarCierre(true);
      return;
    }
    onCerrar();
  }

  function alCambiarFormulario() {
    setSinGuardar(true);
  }

  function validarAlSalir(campo: keyof ErroresCampos, valor: string) {
    setTocado((anterior) => ({ ...anterior, [campo]: true }));
    const mensaje = campo === "nombre" ? errorNombreProducto(valor) : errorDescripcionProducto(valor);
    setErrores((anterior) => ({ ...anterior, [campo]: mensaje ?? undefined }));
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={intentarCerrar}>
        <div
          role="dialog"
          aria-modal="true"
          ref={dialogoRef}
          tabIndex={-1}
          aria-labelledby="producto-formulario-titulo"
          onClick={(evento) => evento.stopPropagation()}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-5 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
        >
          <h2 id="producto-formulario-titulo" className="font-titulo text-lg font-bold text-texto">
            {producto ? "Editar producto" : "Agregar producto"}
          </h2>

          <form onSubmit={alEnviar} onChange={alCambiarFormulario} className="space-y-4">
            {!producto && perfilId && <input type="hidden" name="perfil_id" value={perfilId} />}

            <div className="space-y-1">
              <label htmlFor="nombre" className={CLASES_LABEL}>
                Nombre
              </label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={producto?.nombre}
                required
                disabled={pendiente}
                onBlur={(evento: FormEvent<HTMLInputElement>) => validarAlSalir("nombre", evento.currentTarget.value)}
                invalido={Boolean(tocado.nombre && errores.nombre)}
              />
              {tocado.nombre && errores.nombre && (
                <p role="alert" className={CLASES_ERROR}>
                  <CircleAlert size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
                  {errores.nombre}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="descripcion" className={CLASES_LABEL}>
                Descripción (opcional)
              </label>
              <Textarea
                id="descripcion"
                name="descripcion"
                rows={2}
                defaultValue={producto?.descripcion ?? ""}
                disabled={pendiente}
                onBlur={(evento: FormEvent<HTMLTextAreaElement>) => validarAlSalir("descripcion", evento.currentTarget.value)}
                invalido={Boolean(tocado.descripcion && errores.descripcion)}
              />
              {tocado.descripcion && errores.descripcion && (
                <p role="alert" className={CLASES_ERROR}>
                  <CircleAlert size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
                  {errores.descripcion}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="precio" className={CLASES_LABEL}>
                Precio (opcional)
              </label>
              <Input
                id="precio"
                name="precio"
                type="number"
                min={0}
                step="0.01"
                defaultValue={producto?.precio ?? ""}
                disabled={pendiente}
              />
            </div>

            <label className="flex items-center gap-2 font-cuerpo text-sm text-texto">
              <input type="checkbox" name="mostrar_precio" value="true" defaultChecked={producto?.mostrar_precio ?? true} disabled={pendiente} />
              Mostrar el precio en el catálogo
            </label>

            {!producto && (
              <div className="space-y-1">
                <label htmlFor="imagen" className={CLASES_LABEL}>
                  Imagen
                </label>
                <EntradaArchivoImagen id="imagen" name="imagen" accept="image/jpeg,image/png,image/webp" required disabled={pendiente} />
              </div>
            )}

            {estado.error && (
              <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
                <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
                {estado.error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button ref={cerrarRef} type="button" onClick={intentarCerrar} disabled={pendiente} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
                Cancelar
              </button>
              <Button type="submit" disabled={pendiente} className="min-h-11 lg:min-h-0">
                {pendiente ? "Guardando…" : producto ? "Guardar los cambios" : "Agregar producto"}
              </Button>
            </div>
          </form>

          {producto && (
            <div className="border-t border-borde pt-4">
              <CampoImagen titulo="Imagen del producto" urlActual={producto.imagen_url} alt={producto.nombre} accion={accionImagen} />
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        abierto={confirmarCierre}
        onCerrar={() => setConfirmarCierre(false)}
        onConfirmar={async () => {
          setSinGuardar(false);
          onCerrar();
        }}
        titulo="¿Descartar los cambios?"
        descripcion="Perderás lo que escribiste en este formulario."
        textoConfirmar="Descartar"
        variante="peligro"
      />
    </>
  );
}
