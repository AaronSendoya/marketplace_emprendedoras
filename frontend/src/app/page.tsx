import { Suspense } from "react";
import { CierreInicio } from "@/components/organisms/inicio/CierreInicio";
import { ComoFunciona } from "@/components/organisms/inicio/ComoFunciona";
import { Comunidad } from "@/components/organisms/inicio/Comunidad";
import { EntradaCatalogo } from "@/components/organisms/inicio/EntradaCatalogo";
import { Hero } from "@/components/organisms/inicio/Hero";
import { SeccionCiudades } from "@/components/organisms/inicio/SeccionCiudades";
import { SeccionEmprendedoras } from "@/components/organisms/inicio/SeccionEmprendedoras";
import { SeccionPromociones } from "@/components/organisms/inicio/SeccionPromociones";
import { SeccionRubros } from "@/components/organisms/inicio/SeccionRubros";
import { ModalBienvenida } from "@/components/organisms/ModalBienvenida";
import { VitrinaEsqueleto } from "@/components/organisms/VitrinaEsqueleto";

// El Inicio (CLAUDE.md sección 6, regla 14, punto k): la puerta de entrada al catálogo, una sección por pregunta. El Hero y la entrada al
// catálogo (con sus campos) se pintan de inmediato, sin esperar al backend. Lo que depende de los datos va en una sola frontera de
// `Suspense`, con el esqueleto de una vitrina (las mismas medidas que la sección de emprendedoras, la primera que se ve): las
// secciones comparten las mismas peticiones, así que llegan juntas y en lugar de varios saltos hay uno, bajo el pliegue. La Cómo funciona,
// la Comunidad y el cierre son texto fijo y se dibujan sin esperar. Cada sección con datos se oculta sola si no hay nada real que mostrar.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <ModalBienvenida />
      <Hero />
      <EntradaCatalogo />
      <Suspense fallback={<VitrinaEsqueleto variante="emprendedora" />}>
        <SeccionEmprendedoras />
        <SeccionRubros />
        <SeccionPromociones />
        <SeccionCiudades />
      </Suspense>
      <ComoFunciona />
      <Comunidad />
      <CierreInicio />
    </main>
  );
}
