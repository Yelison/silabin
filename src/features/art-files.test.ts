import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/Icon";
import { MOUTH_SHAPES } from "@/components/Mouth";
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

	it("FI2: las bocas están aplazadas (ninguna) o están las seis y pesan menos de 30 KB", () => {
		// Las bocas del Plan 7 se aplazaron: mientras no haya ningún `mouth-*.webp`, `Mouth`
		// pinta su SVG esquemático por el `onError`. Si aparece uno suelto, deben estar los seis.
		const ruta = (forma: string) =>
			join(PUBLIC, "images", "arte", `mouth-${forma}.webp`);
		const hay = MOUTH_SHAPES.filter((f) => existsSync(ruta(f)));
		if (hay.length === 0) return;
		expect(hay, "bocas a medias: faltan formas").toEqual([...MOUTH_SHAPES]);
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
