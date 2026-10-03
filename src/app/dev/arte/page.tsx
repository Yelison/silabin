import { notFound } from "next/navigation";
import { ArteDev } from "@/features/dev/ArteDev";

// Herramienta de desarrollo: enseña la paleta y el arte sueltos, sin sesión ni estado. En
// producción la ruta no existe. Server Component: solo decide si se sirve.
export default function ArtePage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <ArteDev />;
}
