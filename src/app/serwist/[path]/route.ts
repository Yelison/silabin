import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// S23: la revisión sale de `VERCEL_GIT_COMMIT_SHA` (Vercel la pone en el build) y, si no
// existe, de `git rev-parse HEAD` (entorno local); en Vercel no conviene contar con `git`.
const revision =
	process.env.VERCEL_GIT_COMMIT_SHA ??
	spawnSync("git", ["rev-parse", "HEAD"], {
		encoding: "utf-8",
	}).stdout?.trim() ??
	crypto.randomUUID();

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
