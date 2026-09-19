import { describe, expect, it } from "vitest";
import {
	BOX_INTERVALS,
	demote,
	isDue,
	promote,
	sessionsUntilDue,
} from "@/engine/leitner";
import { emptyItemProgress, type ItemProgress } from "@/engine/types";

function progress(overrides: Partial<ItemProgress>): ItemProgress {
	return { ...emptyItemProgress(), ...overrides };
}

describe("intervalos", () => {
	it("son 1, 3 y 7 sesiones", () => {
		expect(BOX_INTERVALS).toEqual({ 1: 1, 2: 3, 3: 7 });
	});
});

describe("promote", () => {
	it("sube una caja", () => {
		expect(promote(0)).toBe(1);
		expect(promote(1)).toBe(2);
		expect(promote(2)).toBe(3);
	});

	it("no pasa de la caja 3", () => {
		expect(promote(3)).toBe(3);
	});
});

describe("demote", () => {
	it("manda a la caja 1 desde cualquier caja", () => {
		expect(demote(3)).toBe(1);
		expect(demote(2)).toBe(1);
		expect(demote(1)).toBe(1);
	});

	it("también saca de la caja 0, porque el ítem ya se intentó", () => {
		expect(demote(0)).toBe(1);
	});
});

describe("isDue", () => {
	it("un ítem sin acertar nunca está vencido: lo elige el planificador por otra vía", () => {
		expect(
			isDue(progress({ box: 0, presented: true, lastSessionIndex: 0 }), 10),
		).toBe(false);
	});

	it("caja 1 vence a la sesión siguiente", () => {
		const p = progress({ box: 1, lastSessionIndex: 5 });
		expect(isDue(p, 5)).toBe(false);
		expect(isDue(p, 6)).toBe(true);
	});

	it("caja 2 vence tres sesiones después", () => {
		const p = progress({ box: 2, lastSessionIndex: 5 });
		expect(isDue(p, 7)).toBe(false);
		expect(isDue(p, 8)).toBe(true);
	});

	it("caja 3 vence siete sesiones después", () => {
		const p = progress({ box: 3, lastSessionIndex: 1 });
		expect(isDue(p, 7)).toBe(false);
		expect(isDue(p, 8)).toBe(true);
	});
});

describe("sessionsUntilDue", () => {
	it("cuenta lo que falta y no baja de cero", () => {
		expect(sessionsUntilDue(progress({ box: 2, lastSessionIndex: 5 }), 6)).toBe(
			2,
		);
		expect(
			sessionsUntilDue(progress({ box: 2, lastSessionIndex: 5 }), 20),
		).toBe(0);
	});

	it("un ítem sin acertar no tiene espera pendiente", () => {
		expect(sessionsUntilDue(progress({ box: 0, lastSessionIndex: 3 }), 4)).toBe(
			0,
		);
	});

	it("coincide con el intervalo de su caja cuando acaba de verse", () => {
		// Fija la relación entre las dos funciones: si isDue usara un intervalo distinto del
		// que declara BOX_INTERVALS, este test lo detectaría.
		for (const box of [1, 2, 3] as const) {
			const p = progress({ box, lastSessionIndex: 10 });
			expect([box, sessionsUntilDue(p, 10)]).toEqual([box, BOX_INTERVALS[box]]);
			expect([box, isDue(p, 10 + BOX_INTERVALS[box])]).toEqual([box, true]);
			expect([box, isDue(p, 10 + BOX_INTERVALS[box] - 1)]).toEqual([
				box,
				false,
			]);
		}
	});

	it("los tres intervalos son crecientes, que es lo que hace que el repaso espacie", () => {
		expect(BOX_INTERVALS[1]).toBeLessThan(BOX_INTERVALS[2]);
		expect(BOX_INTERVALS[2]).toBeLessThan(BOX_INTERVALS[3]);
	});
});
