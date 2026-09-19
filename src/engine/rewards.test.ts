import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import { MASTERY_TARGET } from "@/engine/mastery";
import {
	earnedRewardIds,
	newlyEarnedRewardIds,
	REWARDS,
	totalStars,
} from "@/engine/rewards";
import {
	emptyItemProgress,
	emptyProgressState,
	type ProgressState,
} from "@/engine/types";

function withMastered(
	ids: string[],
	base = emptyProgressState(),
): ProgressState {
	const state = { ...base, items: { ...base.items } };
	for (const id of ids) {
		state.items[id] = {
			...emptyItemProgress(),
			firstTryCorrect: MASTERY_TARGET,
			box: 3,
			presented: true,
		};
	}
	return state;
}

function context(state: ProgressState) {
	return { content: curriculum, state, totalStars: totalStars(state) };
}

describe("catálogo", () => {
	it("tiene los 8 logros de la primera versión más los hitos de estrellas", () => {
		const base = REWARDS.filter((r) => !r.id.startsWith("stars:"));
		expect(base).toHaveLength(8);
		expect(REWARDS.filter((r) => r.id.startsWith("stars:"))).toHaveLength(4);
	});

	it("cada logro tiene id único, nombre y requisito legible", () => {
		expect(new Set(REWARDS.map((r) => r.id)).size).toBe(REWARDS.length);
		for (const reward of REWARDS) {
			expect(reward.name.length).toBeGreaterThan(0);
			expect(reward.requirement.length).toBeGreaterThan(0);
		}
	});

	it("ningún logro desbloquea contenido, solo cosméticos y colecciones", () => {
		for (const reward of REWARDS) {
			expect([
				"badge",
				"background",
				"companion",
				"trail",
				"sticker",
				"trophy",
			]).toContain(reward.kind);
		}
	});
});

describe("totalStars", () => {
	it("suma la mejor marca de cada unidad", () => {
		const state = emptyProgressState();
		state.units["phase1:vowel-a"] = { status: "done", bestStars: 3 };
		state.units["phase1:vowel-e"] = { status: "active", bestStars: 2 };
		expect(totalStars(state)).toBe(5);
	});

	it("empieza en cero", () => {
		expect(totalStars(emptyProgressState())).toBe(0);
	});
});

describe("condiciones de los logros", () => {
	it("la primera sesión desbloquea el primer fondo", () => {
		const state = emptyProgressState();
		state.counters.sessions = 1;
		expect(earnedRewardIds(context(state))).toContain("first-session");
	});

	it("dominar la a desbloquea su pegatina", () => {
		expect(earnedRewardIds(context(withMastered(["letter:a"])))).toContain(
			"vowel-a",
		);
	});

	it("las cinco vocales desbloquean el compañero nuevo", () => {
		const vocales = ["a", "e", "o", "i", "u"].map((v) => `letter:${v}`);
		const earned = earnedRewardIds(context(withMastered(vocales)));
		expect(earned).toContain("five-vowels");
	});

	it("cuatro vocales todavía no bastan", () => {
		const cuatro = ["a", "e", "o", "i"].map((v) => `letter:${v}`);
		expect(earnedRewardIds(context(withMastered(cuatro)))).not.toContain(
			"five-vowels",
		);
	});

	it("el primer acierto de voz desbloquea el rastro de estrellitas", () => {
		const state = emptyProgressState();
		state.counters.voiceOk = 1;
		expect(earnedRewardIds(context(state))).toContain("first-syllable-voice");
	});

	it("diez trazos desbloquean el fondo del espacio", () => {
		const state = emptyProgressState();
		state.counters.traces = 9;
		expect(earnedRewardIds(context(state))).not.toContain("steady-hand");
		state.counters.traces = 10;
		expect(earnedRewardIds(context(state))).toContain("steady-hand");
	});

	it("diez sesiones desbloquean el accesorio del compañero", () => {
		const state = emptyProgressState();
		state.counters.sessions = 10;
		expect(earnedRewardIds(context(state))).toContain("ten-sessions");
	});

	it("cinco palabras leídas desbloquean el rastro de burbujas", () => {
		const state = emptyProgressState();
		state.counters.wordsRead = 5;
		expect(earnedRewardIds(context(state))).toContain("word-reader");
	});

	it("terminar la Fase 2 desbloquea el trofeo", () => {
		const state = emptyProgressState();
		for (const consonante of ["m", "l", "s", "p"]) {
			state.units[`phase2:${consonante}`] = { status: "done", bestStars: 2 };
		}
		expect(earnedRewardIds(context(state))).toContain("phase2-done");
	});

	it("los hitos de estrellas se desbloquean por total acumulado", () => {
		const state = emptyProgressState();
		state.units.u = { status: "done", bestStars: 3 };
		const ctx = { content: curriculum, state, totalStars: 26 };
		const earned = earnedRewardIds(ctx);
		expect(earned).toContain("stars:10");
		expect(earned).toContain("stars:25");
		expect(earned).not.toContain("stars:50");
	});
});

describe("newlyEarnedRewardIds", () => {
	it("devuelve solo lo que aún no estaba desbloqueado", () => {
		const state = emptyProgressState();
		state.counters.sessions = 1;
		state.counters.traces = 10;
		const nuevos = newlyEarnedRewardIds(["first-session"], context(state));
		expect(nuevos).toEqual(["steady-hand"]);
	});

	it("devuelve vacío si no hay nada nuevo", () => {
		const state = emptyProgressState();
		state.counters.sessions = 1;
		expect(newlyEarnedRewardIds(["first-session"], context(state))).toEqual([]);
	});

	it("un logro conseguido nunca vuelve a aparecer como nuevo", () => {
		const state = emptyProgressState();
		state.counters.sessions = 20;
		const primera = newlyEarnedRewardIds([], context(state));
		const segunda = newlyEarnedRewardIds(primera, context(state));
		expect(segunda).toEqual([]);
	});
});
