import { createSerwistRoute } from "@serwist/turbopack";
import { calcularRevision } from "@/app/serwist/revision";

const revision = calcularRevision();

// Serwist ya precachea por sí solo todo `public/` (ilustraciones e iconos incluidos, con el hash
// del contenido como revisión). Volver a listarlos aquí con otra revisión provoca
// `add-to-cache-list-conflicting-entries` y el SW ni siquiera se evalúa (lo destapó el e2e J4).
// Solo falta la portada `/`, que no es un fichero estático.
const entradasAdicionales = [{ url: "/", revision }];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
	createSerwistRoute({
		additionalPrecacheEntries: entradasAdicionales,
		swSrc: "src/app/sw.ts",
		// Si es `false`, Serwist usaría `esbuild-wasm`; con esbuild nativo instalado, no hace falta.
		useNativeEsbuild: true,
	});
