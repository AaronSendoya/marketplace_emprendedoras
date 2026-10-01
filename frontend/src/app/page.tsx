import { FeatureGrid } from "@/components/organisms/FeatureGrid";
import { Hero } from "@/components/organisms/Hero";
import { ModalBienvenida } from "@/components/organisms/ModalBienvenida";
import { VitrinaEmprendedoras } from "@/components/organisms/VitrinaEmprendedoras";
import { VitrinaPromociones } from "@/components/organisms/VitrinaPromociones";

// Contenido real primero (perfiles y, si los hay, promociones vigentes): quien entra a conocer
// emprendedoras las ve enseguida, no después de una sección informativa. FeatureGrid queda como
// franja de cierre, ya compacta.
export default async function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <ModalBienvenida />
      <Hero />
      <VitrinaEmprendedoras />
      <VitrinaPromociones />
      <FeatureGrid />
    </main>
  );
}
