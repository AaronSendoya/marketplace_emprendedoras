"use client";

import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/atoms/Input";

interface PropsSearchBar {
  valorInicial: string;
  onBuscar: (valor: string) => void;
  placeholder?: string;
  className?: string;
}

// Envía la búsqueda al confirmar (Enter), no en cada tecla: sin esto, cada carácter dispararía
// una petición al backend (fase 1 no tiene debounce, sección 2 del plan).
export function SearchBar({ valorInicial, onBuscar, placeholder = "Buscar por nombre...", className = "" }: PropsSearchBar) {
  const [valor, setValor] = useState(valorInicial);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onBuscar(valor.trim());
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
