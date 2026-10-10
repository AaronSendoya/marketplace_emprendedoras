"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Component, type ReactNode } from "react";
import { reportarError } from "@/lib/errores/reportar";

interface Props {
  // Qué es lo que no se pudo mostrar («el gráfico de interacción»). Entra en el aviso y en el reporte.
  nombre: string;
  children: ReactNode;
  // Un aviso corto para una pieza pequeña (un indicador de una cuadrícula). Sin él, el aviso ocupa el ancho de la sección.
  compacto?: boolean;
  className?: string;
}

interface Estado {
  fallo: boolean;
}

const BOTON =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-borde bg-superficie px-3.5 font-cuerpo text-sm font-medium text-texto transition-colors hover:border-acento hover:text-acento focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 focus-visible:outline-none lg:min-h-0 lg:py-1.5";

// Un error al dibujar una SECCIÓN de la pantalla (un gráfico, un visor, un selector) no tiene por qué tirar la página entera: este
// límite lo contiene, deja el resto en pie y ofrece reintentar solo esa parte. Es el nivel «no crítico» del control de errores: la
// pantalla de respaldo de página completa (`PantallaDeError`) queda para lo que de verdad impide mostrar la página.
//
// Tiene que ser una clase: React solo ofrece `getDerivedStateFromError` y `componentDidCatch` en componentes de clase. Sus props son
// todas serializables a propósito: un Server Component puede usarlo sin pasarle funciones.
export class LimiteDeError extends Component<Props, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error): void {
    reportarError("seccion", error, this.props.nombre);
  }

  reintentar = () => this.setState({ fallo: false });

  render() {
    if (!this.state.fallo) return this.props.children;
    const { nombre, compacto = false, className = "" } = this.props;

    if (compacto) {
      return (
        <div role="alert" className={`flex flex-col items-start gap-2 bg-superficie p-4 ${className}`.trim()}>
          <p className="flex items-start gap-2 font-cuerpo text-sm text-texto">
            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />
            No pudimos mostrar {nombre}.
          </p>
          <button type="button" onClick={this.reintentar} className={BOTON}>
            <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      );
    }
    return (
      <div role="alert" className={`flex flex-col items-start gap-3 rounded-lg border border-aviso-borde bg-aviso-suave p-4 sm:flex-row sm:items-center ${className}`.trim()}>
        <TriangleAlert size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-aviso" />
        <p className="min-w-0 flex-1 font-cuerpo text-sm text-texto">No pudimos mostrar {nombre}. El resto de la página sigue funcionando.</p>
        <button type="button" onClick={this.reintentar} className={BOTON}>
          <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    );
  }
}
