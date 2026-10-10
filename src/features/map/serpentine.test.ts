import { describe, expect, it } from "vitest";
import {
	COLUMNAS,
	serpentine,
	serpentinePath,
} from "@/features/map/serpentine";

const c = (row: number, col: number) => ({ row, col });

describe("serpentine", () => {
	it("COLUMNAS son 2, 3 y 5 (base, md y lg)", () => {
		expect([...COLUMNAS]).toEqual([2, 3, 5]);
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
