import { notFound } from "next/navigation";
import { PlantillasDev } from "@/features/dev/PlantillasDev";

// Herramienta de desarrollo: enseña las plantillas sueltas, sin sesión. En producción la ruta
// no existe. Server Component: solo decide si se sirve; todo lo interactivo vive en el cliente.
export default function PlantillasPage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <PlantillasDev />;
}
