import { describe, expect, it } from "vitest";
import {
	COLUMNAS,
	DISPOSICIONES,
	layoutCells,
	layoutPath,
	layoutRows,
	serpentine,
	serpentinePath,
	wave,
	wavePath,
} from "@/features/map/serpentine";

const c = (row: number, col: number) => ({ row, col });

describe("serpentine", () => {
	it("COLUMNAS: la rejilla es de 5 en base (la onda), 3 en md y 5 en lg", () => {
		expect([...DISPOSICIONES]).toEqual(["base", "md", "lg"]);
		expect(COLUMNAS).toEqual({ base: 5, md: 3, lg: 5 });
	});

	it("sin celdas devuelve una lista vacía", () => {
		expect(serpentine(0, 3)).toEqual([]);
	});

	it("una sola celda es la (0,0)", () => {
		expect(serpentine(1, 5)).toEqual([c(0, 0)]);
	});

	it("cuatro celdas en cinco columnas llenan la fila 0 de izquierda a derecha", () => {
		expect(serpentine(4, 5)).toEqual([c(0, 0), c(0, 1), c(0, 2), c(0, 3)]);
	});

	it("la fila impar va de derecha a izquierda (2 columnas)", () => {
		expect(serpentine(5, 2)).toEqual([
			c(0, 0),
			c(0, 1),
			c(1, 1),
			c(1, 0),
			c(2, 0),
		]);
	});

	it("8 celdas en 3 columnas", () => {
		expect(serpentine(8, 3)).toEqual([
			c(0, 0),
			c(0, 1),
			c(0, 2),
			c(1, 2),
			c(1, 1),
			c(1, 0),
			c(2, 0),
			c(2, 1),
		]);
	});

	it("8 celdas en 5 columnas", () => {
		expect(serpentine(8, 5)).toEqual([
			c(0, 0),
			c(0, 1),
			c(0, 2),
			c(0, 3),
			c(0, 4),
			c(1, 4),
			c(1, 3),
			c(1, 2),
		]);
	});

	it("columnas no enteras, cero o conteo negativo lanzan RangeError", () => {
		expect(() => serpentine(3, 0)).toThrow(RangeError);
		expect(() => serpentine(3, 2.5)).toThrow(RangeError);
		expect(() => serpentine(-1, 2)).toThrow(RangeError);
	});
});

describe("serpentinePath", () => {
	it("con menos de 2 celdas no hay trazo", () => {
		expect(serpentinePath([], 2)).toBe("");
		expect(serpentinePath([c(0, 0)], 2)).toBe("");
	});

	it("dos celdas en la misma fila son un tramo recto", () => {
		expect(serpentinePath(serpentine(2, 5), 5)).toBe("M0.5 0.5L1.5 0.5");
	});

	it("el giro a la fila siguiente por la derecha usa d = +0.5", () => {
		expect(serpentinePath(serpentine(3, 2), 2)).toBe(
			"M0.5 0.5L1.5 0.5C2 0.5 2 1.5 1.5 1.5",
		);
	});

	it("el giro por la izquierda usa d = -0.5", () => {
		expect(serpentinePath(serpentine(5, 2), 2)).toBe(
			"M0.5 0.5L1.5 0.5C2 0.5 2 1.5 1.5 1.5L0.5 1.5C0 1.5 0 2.5 0.5 2.5",
		);
	});
});

describe("wave (MC3)", () => {
	it("ON1: una fila por nodo y las columnas 2, 3, 2, 1 en ciclo", () => {
		expect(wave(5)).toEqual([c(0, 2), c(1, 3), c(2, 2), c(3, 1), c(4, 2)]);
		expect(wave(8).map((x) => x.col)).toEqual([2, 3, 2, 1, 2, 3, 2, 1]);
	});

	it("ON2: sin nodos o con uno no hay trazo", () => {
		expect(wave(0)).toEqual([]);
		expect(wave(1)).toEqual([c(0, 2)]);
		expect(wavePath(wave(0))).toBe("");
		expect(wavePath(wave(1))).toBe("");
	});

	it("ON3: la curva entre dos celdas sale y llega en vertical", () => {
		expect(wavePath(wave(2))).toBe("M2.5 0.5C2.5 1 3.5 1 3.5 1.5");
	});

	it("ON3b: cada tramo siguiente añade su curva", () => {
		expect(wavePath(wave(3))).toBe(
			"M2.5 0.5C2.5 1 3.5 1 3.5 1.5C3.5 2 2.5 2 2.5 2.5",
		);
	});

	it("ON4: un conteo negativo o no entero lanza RangeError", () => {
		expect(() => wave(-1)).toThrow(RangeError);
		expect(() => wave(1.5)).toThrow(RangeError);
	});
});

describe("disposiciones", () => {
	it("ON5: filas de la rejilla: una por nodo en base, ceil(n / columnas) en las otras", () => {
		expect(layoutRows("base", 8)).toBe(8);
		expect(layoutRows("md", 8)).toBe(3);
		expect(layoutRows("lg", 8)).toBe(2);
	});

	it("ON6: layoutCells da la onda en base y las serpientes de 3 y 5 en md y lg", () => {
		const celdas = layoutCells(8);
		expect(celdas.base).toEqual(wave(8));
		expect(celdas.md).toEqual(serpentine(8, 3));
		expect(celdas.lg).toEqual(serpentine(8, 5));
	});

	it("layoutPath: onda en base, serpentina en md y lg", () => {
		const celdas = layoutCells(8);
		expect(layoutPath("base", celdas.base)).toBe(wavePath(celdas.base));
		expect(layoutPath("md", celdas.md)).toBe(serpentinePath(celdas.md, 3));
		expect(layoutPath("lg", celdas.lg)).toBe(serpentinePath(celdas.lg, 5));
	});
});
