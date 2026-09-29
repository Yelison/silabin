import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { createSerwistRoute } from "@serwist/turbopack";

// S23: la revisión sale de `VERCEL_GIT_COMMIT_SHA` (Vercel la pone en el build) y, si no
// existe, de `git rev-parse HEAD` (entorno local); en Vercel no conviene contar con `git`.
const revision =
	process.env.VERCEL_GIT_COMMIT_SHA ??
	spawnSync("git", ["rev-parse", "HEAD"], {
		encoding: "utf-8",
	}).stdout?.trim() ??
	crypto.randomUUID();

/** Los ficheros de `public/<carpeta>` con alguna de las extensiones, como URL absolutas. */
function urlsPublicas(
	carpeta: string,
	extensiones: readonly string[],
): string[] {
	const base = join(process.cwd(), "public", carpeta);
	return readdirSync(base)
		.filter((nombre) => extensiones.some((ext) => nombre.endsWith(ext)))
		.map((nombre) => `/${carpeta}/${nombre}`);
}

// Lo que el build de Next no precachea por sí solo (no son módulos, son estáticos servidos
// desde `public/`): la portada, las ilustraciones de las palabras y los iconos de la PWA.
// Las fuentes de `next/font` sí quedan cubiertas: son parte del build y viajan con sus
// fragmentos, que Serwist ya precachea.
const entradasAdicionales = [
	"/",
	...urlsPublicas("images/palabras", [".webp"]),
	...urlsPublicas("icons", [".png"]),
].map((url) => ({ url, revision }));

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
	createSerwistRoute({
		additionalPrecacheEntries: entradasAdicionales,
		swSrc: "src/app/sw.ts",
		// Si es `false`, Serwist usaría `esbuild-wasm`; con esbuild nativo instalado, no hace falta.
		useNativeEsbuild: true,
	});
