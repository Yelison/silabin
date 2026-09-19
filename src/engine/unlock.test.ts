import { describe, expect, it } from "vitest";
import { buildCurriculum, curriculum } from "@/content/index";
import { MASTERY_TARGET } from "@/engine/mastery";
import {
	emptyItemProgress,
	emptyProgressState,
	type ProgressState,
} from "@/engine/types";
import { activeUnitId, recomputeUnitStatuses } from "@/engine/unlock";

const content = buildCurriculum({
	items: ["a", "b", "c"].map((s) => ({
		id: `letter:${s}`,
		kind: "letter" as const,
		text: s,
		phonemes: [s],
		audioKey: `phoneme:${s}`,
		display: { upper: s.toUpperCase(), lower: s },
	})),
	units: [
		{
			id: "u1",
			phase: 1 as const,
			title: "U1",
			audioKey: "unit:u1",
			requires: [],
			introduces: ["letter:a"],
			exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
		},
		{
			id: "u2",
			phase: 1 as const,
			title: "U2",
			audioKey: "unit:u2",
			requires: ["u1"],
			introduces: ["letter:b"],
			exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
		},
		{
			id: "u3",
			phase: 1 as const,
			title: "U3",
			audioKey: "unit:u3",
			requires: ["u2"],
			introduces: ["letter:c"],
			exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
		},
	],
});

function withMastered(ids: string[]): ProgressState {
	const state = emptyProgressState();
	for (const id of ids) {
		state.items[id] = {
			...emptyItemProgress(),
			firstTryCorrect: MASTERY_TARGET,
			box: 3,
		};
	}
	return state;
}

describe("recomputeUnitStatuses", () => {
	it("al empezar, la primera unidad está activa y las demás bloqueadas", () => {
		const statuses = recomputeUnitStatuses(content, emptyProgressState());
		expect(statuses.u1?.status).toBe("active");
		expect(statuses.u2?.status).toBe("locked");
		expect(statuses.u3?.status).toBe("locked");
	});

	it("completar una unidad activa la siguiente", () => {
		const statuses = recomputeUnitStatuses(content, withMastered(["letter:a"]));
		expect(statuses.u1?.status).toBe("done");
		expect(statuses.u2?.status).toBe("active");
		expect(statuses.u3?.status).toBe("locked");
	});

	it("conserva las mejores estrellas ya obtenidas", () => {
		const state = withMastered(["letter:a"]);
		state.units.u1 = { status: "active", bestStars: 3 };
		expect(recomputeUnitStatuses(content, state).u1?.bestStars).toBe(3);
	});

	it("el progreso no retrocede: una unidad marcada done sigue done", () => {
		const state = emptyProgressState();
		state.units.u1 = { status: "done", bestStars: 2 };
		expect(recomputeUnitStatuses(content, state).u1?.status).toBe("done");
	});
});

describe("activeUnitId", () => {
	it("devuelve la primera unidad activa en orden topológico", () => {
		expect(activeUnitId(content, emptyProgressState())).toBe("u1");
		expect(activeUnitId(content, withMastered(["letter:a"]))).toBe("u2");
	});

	it("nunca hay más de una unidad activa a la vez", () => {
		// Con dos unidades activas el niño podría estar a medias en dos sitios, y el
		// planificador tendría que elegir por su cuenta cuál es "la de ahora".
		for (const dominados of [[], ["letter:a"], ["letter:a", "letter:b"]]) {
			const statuses = recomputeUnitStatuses(content, withMastered(dominados));
			const activas = Object.values(statuses).filter(
				(u) => u.status === "active",
			);
			expect([dominados.length, activas.length]).toEqual([dominados.length, 1]);
		}
	});

	it("una unidad bloqueada nunca se salta: entre done y locked no hay huecos", () => {
		const statuses = recomputeUnitStatuses(content, withMastered(["letter:a"]));
		expect(["u1", "u2", "u3"].map((id) => statuses[id]?.status)).toEqual([
			"done",
			"active",
			"locked",
		]);
	});

	it("con todo completo devuelve null: el currículo jugable se agotó", () => {
		// null es la señal honesta de "ya no queda unidad nueva". Devolver la última unidad
		// hacía creer al planificador que seguía habiendo unidad activa, y con una unidad
		// vacía de la Fase 3 producía sesiones sin sentido. Planificar el repaso de un
		// currículo agotado es trabajo del Plan 2, no de aquí.
		const todo = withMastered(["letter:a", "letter:b", "letter:c"]);
		expect(activeUnitId(content, todo)).toBeNull();
	});
});

describe("el currículo real, con sus unidades vacías de la Fase 3", () => {
	/** Estado con TODOS los ítems del currículo dominados: el niño se lo sabe todo. */
	function todoDominado(): ProgressState {
		const state = emptyProgressState();
		for (const id of curriculum.items.keys()) {
			state.items[id] = {
				...emptyItemProgress(),
				firstTryCorrect: MASTERY_TARGET,
				box: 3,
			};
		}
		return state;
	}

	const vacias = curriculum.unitOrder.filter(
		(id) => (curriculum.units.get(id)?.introduces.length ?? 0) === 0,
	);
	const jugables = curriculum.unitOrder.filter(
		(id) => (curriculum.units.get(id)?.introduces.length ?? 0) > 0,
	);

	it("hay unidades vacías de verdad que probar, las 8 de la Fase 3", () => {
		// Los tests de arriba usan un currículo sintético donde TODAS las unidades introducen
		// algo, así que ninguno pasaba jamás una unidad vacía por recomputeUnitStatuses. Ese
		// hueco es justo por donde se coló que las 8 unidades de la Fase 3 se dieran por
		// terminadas en cascada al completar phase2:p.
		expect(vacias).toHaveLength(8);
		expect(vacias.every((id) => id.startsWith("phase3:"))).toBe(true);
	});

	it("las unidades sin ítems siguen bloqueadas aunque esté todo dominado", () => {
		const statuses = recomputeUnitStatuses(curriculum, todoDominado());
		for (const id of vacias)
			expect([id, statuses[id]?.status]).toEqual([id, "locked"]);
		for (const id of jugables)
			expect([id, statuses[id]?.status]).toEqual([id, "done"]);
	});

	it("con todo el currículo dominado no hay unidad activa", () => {
		expect(activeUnitId(curriculum, todoDominado())).toBeNull();
	});

	it("una unidad vacía guardada como done vuelve a locked al recalcular", () => {
		// Un documento guardado por la versión con el fallo puede traer la Fase 3 entera como
		// terminada. Se sanea al recalcular: una unidad sin ítems no puede haber costado ni un
		// ejercicio, así que ahí no hay progreso del niño que se esté quitando.
		const state = emptyProgressState();
		state.units["phase3:t"] = { status: "done", bestStars: 3 };
		expect(recomputeUnitStatuses(curriculum, state)["phase3:t"]?.status).toBe(
			"locked",
		);
	});

	it("una unidad jugable guardada como done sí sigue done: el progreso real no retrocede", () => {
		const state = emptyProgressState();
		state.units["phase0:clap"] = { status: "done", bestStars: 2 };
		const statuses = recomputeUnitStatuses(curriculum, state);
		expect(statuses["phase0:clap"]?.status).toBe("done");
		expect(statuses["phase0:clap"]?.bestStars).toBe(2);
	});
});
