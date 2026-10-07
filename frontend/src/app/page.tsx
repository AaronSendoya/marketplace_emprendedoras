import { Suspense } from "react";
import { FeatureGrid } from "@/components/organisms/FeatureGrid";
import { Hero } from "@/components/organisms/Hero";
import { ModalBienvenida } from "@/components/organisms/ModalBienvenida";
import { VitrinaEmprendedoras } from "@/components/organisms/VitrinaEmprendedoras";
import { VitrinaEsqueleto } from "@/components/organisms/VitrinaEsqueleto";
import { VitrinaPromociones } from "@/components/organisms/VitrinaPromociones";

// Contenido real primero (perfiles y, si los hay, promociones vigentes): quien entra a conocer
// emprendedoras las ve enseguida, no después de una sección informativa. FeatureGrid queda como
// franja de cierre, ya compacta.
//
// Cada vitrina espera su propia llamada al backend dentro de un `Suspense` (CLAUDE.md sección 6, regla 14): el
// banner y el menú se pintan de inmediato y las vitrinas llegan después, en lugar de que toda la página espere
// a la más lenta. Su esqueleto tiene las mismas medidas que la vitrina final, así que al llegar nada se desplaza.
export default async function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <ModalBienvenida />
      <Hero />
      <Suspense fallback={<VitrinaEsqueleto variante="emprendedora" />}>
        <VitrinaEmprendedoras />
      </Suspense>
      <Suspense fallback={<VitrinaEsqueleto variante="producto" banda />}>
        <VitrinaPromociones />
      </Suspense>
      <FeatureGrid />
    </main>
  );
}
