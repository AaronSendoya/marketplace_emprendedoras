"use client";

import { Search } from "lucide-react";
import { useEffect, useEffectEvent, useState, type FormEvent } from "react";
import { Input } from "@/components/atoms/Input";

interface PropsSearchBar {
  // Sin `enVivo`, el texto inicial de la caja. Con `enVivo`, el valor que tiene la búsqueda en la URL: la caja lo
  // sigue cuando la URL cambia por otro lado (el botón Atrás, "Limpiar filtros").
  valorInicial: string;
  onBuscar: (valor: string) => void;
  placeholder?: string;
  className?: string;
  // "catalogo": el campo de la barra de filtros del sitio público (CLAUDE.md sección 6, regla 14). Sin esto es el
  // de siempre, que usan los buscadores del Admin (AdminToolbar, EmprendimientosToolbar) y no deben cambiar.
  variante?: "base" | "catalogo";
  // Búsqueda en vivo (CLAUDE.md sección 5): se busca mientras se escribe, con un retraso, sin pulsar Enter. Enter
  // sigue funcionando y busca de inmediato. Sin esto, se busca solo al pulsar Enter (el comportamiento del Admin).
  enVivo?: boolean;
  // Cuánto se espera tras la última pulsación antes de buscar. ~300 ms: lo bastante largo para no pedir una página por
  // cada letra, lo bastante corto para que se sienta inmediato.
  retrasoMs?: number;
  // Avisa de que hay texto escrito que todavía no se envió (`true`) o de que ya se envió (`false`).
  onEscribiendo?: (escribiendo: boolean) => void;
  // Cada vez que cambia, la caja se vacía al instante, incluido el texto que todavía no se había enviado ("Limpiar
  // filtros"). Solo `enVivo`.
  reinicios?: number;
}

// Las mismas palabras con un solo espacio entre ellas y sin espacios en los extremos: lo que se manda al backend y lo
// que decide si hay algo nuevo que buscar (escribir un espacio de más no repite la búsqueda).
const normalizar = (texto: string) => texto.trim().replace(/\s+/g, " ");

// El backend acepta de 1 a 100 caracteres (regla 20); más devuelve un 400 que se vería como una página de error.
const LARGO_MAXIMO = 100;

// En el modo normal envía la búsqueda al confirmar (Enter), no en cada tecla: sin esto, cada carácter dispararía una
// petición al backend. En `enVivo` espera `retrasoMs` desde la última pulsación (debounce) y manda solo lo que cambió.
export function SearchBar({
  valorInicial,
  onBuscar,
  placeholder = "Buscar por nombre...",
  className = "",
  variante = "base",
  enVivo = false,
  retrasoMs = 300,
  onEscribiendo,
  reinicios = 0,
}: PropsSearchBar) {
  const [valor, setValor] = useState(valorInicial);
  const [reiniciosPrevios, setReiniciosPrevios] = useState(reinicios);
  // Lo último que se envió a la búsqueda y el valor de la URL que se vio la última vez: con los dos se distingue una URL
  // que cambió porque este campo la cambió (no hay nada que hacer) de una que cambió por otro lado (la caja la sigue).
  const [enviado, setEnviado] = useState(normalizar(valorInicial));
  const [urlPrevia, setUrlPrevia] = useState(valorInicial);

  if (reinicios !== reiniciosPrevios) {
    setReiniciosPrevios(reinicios);
    setValor("");
    setEnviado("");
  }

  if (enVivo && valorInicial !== urlPrevia) {
    setUrlPrevia(valorInicial);
    if (normalizar(valorInicial) !== enviado) {
      setValor(valorInicial);
      setEnviado(normalizar(valorInicial));
    }
  }

  function enviar(texto: string) {
    setEnviado(texto);
    onBuscar(texto);
  }

  // El temporizador usa siempre el `onBuscar` más reciente sin reiniciarse cuando cambia.
  const enviarTrasLaEspera = useEffectEvent(enviar);
  const avisarEscribiendo = useEffectEvent((escribiendo: boolean) => onEscribiendo?.(escribiendo));

  // Hay texto escrito que todavía no salió como búsqueda.
  const sinEnviar = enVivo && normalizar(valor) !== enviado;

  // Cada pulsación reinicia la espera; solo la última, si cambió algo, sale como búsqueda.
  useEffect(() => {
    if (!sinEnviar) return;
    const temporizador = setTimeout(() => enviarTrasLaEspera(normalizar(valor)), retrasoMs);
    return () => clearTimeout(temporizador);
  }, [sinEnviar, valor, retrasoMs]);

  useEffect(() => {
    avisarEscribiendo(sinEnviar);
  }, [sinEnviar]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!enVivo) {
      onBuscar(valor.trim());
      return;
    }
    // Enter no espera al temporizador (que se cancela solo al cambiar `enviado`).
    if (sinEnviar) enviar(normalizar(valor));
  }

  if (variante === "catalogo") {
    return (
      <form onSubmit={alEnviar} role="search" className={`relative ${className}`.trim()}>
        <Search
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-secundario"
          aria-hidden="true"
        />
        <Input
          type="search"
          variante="catalogo"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={enVivo ? LARGO_MAXIMO : undefined}
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          placeholder={placeholder}
          aria-label="Buscar"
        />
      </form>
    );
  }

  return (
    <form onSubmit={alEnviar} className={`relative ${className}`.trim()}>
      <Search
        size={16}
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-secundario"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Buscar"
      />
    </form>
  );
}
