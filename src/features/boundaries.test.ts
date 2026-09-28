import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "..");
const CARPETAS = ["features", "components"];
/** Carpetas cuyo interior solo se toca por su barril (`@/engine`, `@/speech`, `@/store`). */
const PRIVADAS = ["content", "engine", "speech", "store"];

/** Todo lo que sigue a `from`, `import(` o `import` a secas, entre comillas. */
const IMPORT_RE =
	/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\1/g;

function especificadores(codigo: string): string[] {
	return [...codigo.matchAll(IMPORT_RE)].map((m) => m[2] ?? "");
}

/**
 * Por qué un import está prohibido a `features/` y `components/`, o null si está permitido.
 * - `@/content` (cualquier forma): el contenido se alcanza por el barril del motor.
 * - `@/engine/<módulo>` y `@/store/<módulo>`: solo se permiten los barriles `@/engine` y
 *   `@/store`. Así la interfaz no puede saltarse el motor ni tocar el esquema de disco.
 * - Rutas relativas que salen de la carpeta y llegan a esas carpetas privadas.
 */
function motivoProhibido(
	especificador: string,
	fichero: string,
): string | null {
	if (especificador === "@/content" || especificador.startsWith("@/content/"))
		return "importa @/content: usa el barril @/engine";
	if (especificador.startsWith("@/engine/"))
		return "importa un módulo de @/engine: usa el barril @/engine";
	if (especificador.startsWith("@/store/"))
		return "importa un módulo de @/store: usa el barril @/store";
	if (especificador.startsWith("@/speech/"))
		return "importa un módulo de @/speech: usa el barril @/speech";
	if (especificador.startsWith(".")) {
		const destino = relative(
			SRC,
			resolve(dirname(fichero), especificador),
		).split(sep);
		const [raiz] = destino;
		if (raiz !== undefined && PRIVADAS.includes(raiz))
			return `importa ${raiz}/ por ruta relativa: usa el barril @/${raiz}`;
	}
	return null;
}

function ficheros(carpeta: string): string[] {
	return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
		const ruta = join(carpeta, e.name);
		if (e.isDirectory()) return ficheros(ruta);
		return /\.(ts|tsx)$/.test(e.name) ? [ruta] : [];
	});
}

describe("fronteras de la interfaz", () => {
	it("U8: features/ y components/ no importan content, engine/<módulo>, speech/<módulo> ni store/<módulo>", () => {
		const yo = resolve(__filename);
		const violaciones: string[] = [];
		let revisados = 0;
		for (const carpeta of CARPETAS) {
			for (const fichero of ficheros(join(SRC, carpeta))) {
				if (resolve(fichero) === yo) continue;
				revisados += 1;
				for (const esp of especificadores(readFileSync(fichero, "utf8"))) {
					const motivo = motivoProhibido(esp, fichero);
					if (motivo !== null)
						violaciones.push(`${relative(SRC, fichero)}: "${esp}" ${motivo}`);
				}
			}
		}
		// Un recorrido que no ve ningún fichero pasaría en verde sin vigilar nada.
		expect(revisados).toBeGreaterThan(5);
		expect(violaciones).toEqual([]);
	});

	it("U9: ninguna vista fuera de features/dev decide si el trazo vale (scoreTrace, guideLevel)", () => {
		const yo = resolve(__filename);
		const excluida = resolve(join(SRC, "features", "dev")) + sep;
		const violaciones: string[] = [];
		let revisados = 0;
		for (const carpeta of CARPETAS) {
			for (const fichero of ficheros(join(SRC, carpeta))) {
				const ruta = resolve(fichero);
				if (ruta === yo || ruta.startsWith(excluida)) continue;
				revisados += 1;
				const codigo = readFileSync(fichero, "utf8");
				if (codigo.includes("scoreTrace") || codigo.includes("guideLevel"))
					violaciones.push(relative(SRC, fichero));
			}
		}
		// Igual que en U8: sin ficheros revisados esto pasaría en verde sin vigilar nada.
		expect(revisados).toBeGreaterThan(5);
		expect(violaciones).toEqual([]);
	});

	describe("el detector detecta", () => {
		const aqui = join(SRC, "features", "map", "X.tsx");
		const prohibidos = [
			'import { curriculum } from "@/content/index";',
			'import { curriculum } from "@/content";',
			'import type { Unit } from "@/content/types";',
			'import { planSession } from "@/engine/planner";',
			'import { createIdbAdapter } from "@/store/persist";',
			'import { emptyPersistedState } from "@/store/schema";',
			'export { x } from "@/store/app-store";',
			'const m = await import("@/store/persist");',
			'import "@/engine/planner";',
			'import { x } from "../../store/persist";',
			'import { x } from "../../engine/session";',
			'import { stepVad } from "@/speech/vad";',
			'import { x } from "../../speech/vad";',
			"import { x } from '@/engine/session';",
		];
		it.each(prohibidos)("prohíbe: %s", (linea) => {
			const esps = especificadores(linea);
			expect(esps).toHaveLength(1);
			expect(motivoProhibido(esps[0] ?? "", aqui)).not.toBeNull();
		});

		const permitidos = [
			'import { curriculum } from "@/engine";',
			'import { createAppStore } from "@/store";',
			'import type { AudioPlayer } from "@/audio";',
			'import { createMicListener } from "@/speech";',
			'import { imageFor } from "@/images";',
			'import { BigButton } from "@/components/BigButton";',
			'import { useApp } from "@/features/app-context";',
			'import { x } from "./MapScreen";',
			'import { x } from "../start/StartScreen";',
			'import { create } from "zustand";',
		];
		it.each(permitidos)("permite: %s", (linea) => {
			const esps = especificadores(linea);
			expect(esps).toHaveLength(1);
			expect(motivoProhibido(esps[0] ?? "", aqui)).toBeNull();
		});
	});
});
