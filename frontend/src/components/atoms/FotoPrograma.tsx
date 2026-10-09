import Image from "next/image";

type Tira = "/Portada 1.png" | "/Portada 2.png";

interface PropsFotoPrograma {
  // Las dos tiras institucionales de `public/` (2732 x 590 px): cada una trae tres fotos juntas.
  tira: Tira;
  // Cuál de las tres fotos de la tira: 0 (izquierda), 1 (centro) o 2 (derecha).
  foto: 0 | 1 | 2;
  // Cómo encaja la foto en el recuadro: «ancho» (por defecto) cuando es tan ancho como la foto o más (1,54:1), y «alto» cuando es
  // más alto: se dimensiona por el alto y se centra, para que no se corte lo que no debe.
  ajuste?: "ancho" | "alto";
  // Acercamiento (solo con «ancho»): 1 muestra la foto entera; con más de 1 se acerca y se ancla abajo a la derecha, para dejar fuera lo de arriba
  // (la tercera foto de «Portada 1» trae el rótulo «Track de Mujeres» en su parte alta).
  acercamiento?: number;
  // Solo para tiras de otra proporción que la de la foto: qué parte del alto se ve (por defecto, el centro).
  verticalPct?: number;
  // `sizes` de la imagen completa (la tira entera): el navegador pide el tamaño que necesita para que la foto se vea nítida.
  sizes?: string;
  priority?: boolean;
  // Tamaño y forma del recuadro (la proporción la pone quien lo usa): `aspect-[...]`, `h-full`, `rounded-...`.
  className?: string;
}

// Una de las tres fotos de una tira institucional, como pieza independiente (CLAUDE.md sección 6, regla 14, punto k). Las dos tiras
// se conservan tal cual, sin tocar; aquí solo se recompone su posición, tamaño y contexto. La tira entera se dibuja tres veces más
// ancha que el recuadro y se corre para dejar a la vista la foto pedida: es la misma imagen (una sola descarga, ya optimizada
// por `next/image`) para todas las piezas que la usan. Es una de las pocas excepciones a `ImagenR2`: son archivos locales de PISTA8,
// no imágenes de R2 (regla 16).
export function FotoPrograma({
  tira,
  foto,
  ajuste = "ancho",
  acercamiento = 1,
  verticalPct = 50,
  sizes = "(min-width: 1024px) 1600px, 1200px",
  priority = false,
  className = "",
}: PropsFotoPrograma) {
  const zoom = Math.max(1, acercamiento);
  // Con zoom, el recuadro muestra la esquina inferior derecha de la foto acercada.
  const izquierda = zoom > 1 ? -((foto + 1) * zoom - 1) * 100 : -foto * 100;
  const estilo =
    ajuste === "alto"
      ? { height: "100%", aspectRatio: "2732 / 590", left: "50%", top: 0, transform: `translateX(-${(foto + 0.5) * (100 / 3)}%)` }
      : zoom > 1
        ? { width: `${300 * zoom}%`, height: `${100 * zoom}%`, left: `${izquierda}%`, bottom: 0 }
        : { width: "300%", height: "100%", left: `${izquierda}%`, top: 0 };

  return (
    <div className={`relative overflow-hidden bg-pie ${className}`} aria-hidden="true">
      <div className="absolute" style={estilo}>
        <Image src={tira} alt="" fill priority={priority} sizes={sizes} className="object-cover" style={{ objectPosition: `50% ${verticalPct}%` }} />
      </div>
    </div>
  );
}
