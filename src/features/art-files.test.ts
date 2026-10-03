import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/Icon";
import { BOCAS_PUBLICADAS, MOUTH_SHAPES } from "@/components/Mouth";
import { COSMETICS, REWARDS } from "@/engine";
import { cosmeticVisual, rewardArt } from "./rewards/visuals";

const PUBLIC = join(process.cwd(), "public");
const KB = 1024;

/** Presupuesto por prefijo del nombre del fichero (tabla de piezas del Plan 7). */
const PRESUPUESTOS: ReadonlyArray<readonly [string, number]> = [
	["companion-", 80 * KB],
	["bg-", 200 * KB],
	["sticker-", 60 * KB],
	["trophy", 60 * KB],
	["particle-", 10 * KB],
	["cursor-", 10 * KB],
];

function presupuesto(ruta: string): number {
	const nombre = ruta.split("/").pop() ?? "";
	const par = PRESUPUESTOS.find(([prefijo]) => nombre.startsWith(prefijo));
	if (par === undefined) throw new Error(`sin presupuesto para ${ruta}`);
	return par[1];
}

/** Todas las rutas de imagen que las vistas piden, sin repetir. */
function rutasDeArte(): string[] {
	const rutas = new Set<string>();
	for (const c of COSMETICS) {
		const v = cosmeticVisual(c.id);
		if (v.slot === "background") rutas.add(v.src);
		else if (v.slot === "companion") {
			rutas.add(v.art.src);
			rutas.add(v.withCap.src);
		} else {
			if (v.particle !== null) rutas.add(v.particle.src);
			if (v.cursor !== null) rutas.add(v.cursor);
		}
	}
	for (const r of REWARDS) rutas.add(rewardArt(r.id).src);
	return [...rutas];
}

/** Ancho, alto y tipo de color del IHDR de un PNG. */
function cabeceraPng(ruta: string) {
	const b = readFileSync(ruta);
	return {
		ancho: b.readUInt32BE(16),
		alto: b.readUInt32BE(20),
		tipoDeColor: b[25],
	};
}

describe("ficheros de arte", () => {
	it("FI1: cada ruta de arte de las vistas existe en public/ y cabe en su presupuesto", () => {
		const rutas = rutasDeArte();
		expect(rutas.length).toBe(18);
		for (const ruta of rutas) {
			expect(ruta, "una pieza sin imagen").not.toBe("");
			const fichero = join(PUBLIC, ruta);
			expect(existsSync(fichero), `falta ${ruta}`).toBe(true);
			expect(statSync(fichero).size, `${ruta} pesa demasiado`).toBeLessThan(
				presupuesto(ruta),
			);
		}
	});

	it("FI2: BOCAS_PUBLICADAS decide: apagado, ningún mouth-*.webp en public/; encendido, las seis y menos de 30 KB", () => {
		const ruta = (forma: string) =>
			join(PUBLIC, "images", "arte", `mouth-${forma}.webp`);
		const hay = MOUTH_SHAPES.filter((f) => existsSync(ruta(f)));
		if (!BOCAS_PUBLICADAS) {
			// `optimizar-arte.py` genera las bocas y, por defecto, las escribe en `public/`.
			expect(
				hay,
				"hay mouth-*.webp en public/ con BOCAS_PUBLICADAS = false: borra los mouth-* de public/images/arte/, o pon BOCAS_PUBLICADAS = true en Mouth.tsx si el autor aprobó el arte",
			).toEqual([]);
			return;
		}
		expect(
			hay,
			"BOCAS_PUBLICADAS = true pide las seis bocas y faltan formas: añade los mouth-* que faltan a public/images/arte/ o vuelve a poner BOCAS_PUBLICADAS = false",
		).toEqual([...MOUTH_SHAPES]);
		for (const f of MOUTH_SHAPES) {
			expect(statSync(ruta(f)).size, `mouth-${f}`).toBeLessThan(30 * KB);
		}
	});

	it("FI3: los iconos de la app tienen su tamaño, su peso y son RGB sin alfa", () => {
		const tabla = [
			["app-512.png", 512, 300 * KB],
			["app-192.png", 192, 60 * KB],
			["apple-touch-icon.png", 180, 60 * KB],
		] as const;
		for (const [nombre, lado, maximo] of tabla) {
			const fichero = join(PUBLIC, "icons", nombre);
			expect(existsSync(fichero), `falta ${nombre}`).toBe(true);
			const { ancho, alto, tipoDeColor } = cabeceraPng(fichero);
			expect([ancho, alto], nombre).toEqual([lado, lado]);
			expect(statSync(fichero).size, nombre).toBeLessThan(maximo);
			expect(tipoDeColor, `${nombre}: 2 = RGB, 6 = RGBA`).toBe(2);
		}
	});

	it("FI8: cada icono de interfaz pesa menos de 40 KB", () => {
		for (const nombre of ICON_NAMES) {
			const fichero = join(PUBLIC, "icons", `ui-${nombre}.png`);
			expect(statSync(fichero).size, `ui-${nombre}.png`).toBeLessThan(40 * KB);
		}
	});
});
