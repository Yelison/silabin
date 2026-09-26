import { describe, expect, it } from "vitest";
import { buildCurriculum } from "@/content/index";
import {
	applyPresentation,
	applyResolution,
	applySessionEnd,
} from "@/engine/apply";
import { createRng } from "@/engine/random";
import {
	type ExerciseResolution,
	emptyProgressState,
	type ProgressState,
} from "@/engine/types";

const content = buildCurriculum({
	items: [
		{
			id: "syllable:ma",
			kind: "syllable",
			text: "ma",
			phonemes: ["m", "a"],
			audioKey: "syllable:ma",
		},
		{
			id: "word:mapa",
			kind: "word",
			text: "mapa",
			phonemes: ["m", "a", "p", "a"],
			audioKey: "word:mapa",
			syllables: ["ma", "pa"],
		},
		{
			id: "letter:m",
			kind: "letter",
			text: "m",
			phonemes: ["m"],
			audioKey: "phoneme:m",
			display: { upper: "M", lower: "m" },
		},
	],
	units: [
		{
			id: "phase2:m",
			phase: 2,
			title: "La m",
			audioKey: "unit:phase2:m",
			requires: [],
			introduces: ["syllable:ma", "word:mapa", "letter:m"],
			exercises: [{ templateId: "listen-tap", weight: 1 }],
		},
	],
});

const NOW = "2026-09-18T12:00:00.000Z";

function credit(
	state: ProgressState,
	sessionIndex: number,
	itemId = "syllable:ma",
): ProgressState {
	return applyResolution({
		content,
		state,
		itemId,
		templateId: "listen-tap",
		resolution: { status: "mastery-credit" },
		sessionIndex,
		now: NOW,
	});
}

describe("applyPresentation", () => {
	it("marca el ítem como presentado sin darle dominio", () => {
		const state = applyPresentation(emptyProgressState(), "syllable:ma", 0);
		expect(state.items["syllable:ma"]?.presented).toBe(true);
		expect(state.items["syllable:ma"]?.firstTryCorrect).toBe(0);
		expect(state.items["syllable:ma"]?.box).toBe(0);
	});

	it("no muta el estado recibido, ni siquiera cuando el ítem ya tenía progreso", () => {
		// Igual que en applyResolution: partir del estado vacío no sirve, porque sin un
		// progreso preexistente no hay nada que se pueda mutar en su sitio.
		let state = credit(emptyProgressState(), 0);
		state = credit(state, 1);
		const anterior = state;
		const copia = JSON.parse(JSON.stringify(anterior));

		const siguiente = applyPresentation(anterior, "syllable:ma", 5);

		expect(anterior).toEqual(copia);
		expect(anterior.items["syllable:ma"]?.lastSessionIndex).toBe(1);
		expect(siguiente.items["syllable:ma"]?.lastSessionIndex).toBe(5);
		expect(siguiente.items["syllable:ma"]).not.toBe(
			anterior.items["syllable:ma"],
		);
	});
});

describe("applyResolution con crédito de dominio", () => {
	it("suma un acierto y sube de caja", () => {
		const state = credit(emptyProgressState(), 0);
		expect(state.items["syllable:ma"]?.firstTryCorrect).toBe(1);
		expect(state.items["syllable:ma"]?.box).toBe(1);
		expect(state.items["syllable:ma"]?.lastCreditSession).toBe(0);
	});

	it("no suma dos créditos en la misma sesión", () => {
		const state = credit(credit(emptyProgressState(), 0), 0);
		expect(state.items["syllable:ma"]?.firstTryCorrect).toBe(1);
	});

	it("suma en sesiones distintas y marca la fecha de dominio al tercero", () => {
		let state = emptyProgressState();
		state = credit(state, 0);
		state = credit(state, 1);
		expect(state.items["syllable:ma"]?.masteredAt).toBeNull();
		state = credit(state, 2);
		expect(state.items["syllable:ma"]?.firstTryCorrect).toBe(3);
		expect(state.items["syllable:ma"]?.masteredAt).toBe(NOW);
		expect(state.items["syllable:ma"]?.box).toBe(3);
	});

	it("no reescribe la fecha de dominio ya puesta", () => {
		// Con la misma fecha en todas las llamadas, la comprobación sería NOW === NOW y el
		// test no podría fallar aunque la fecha se reescribiera en cada acierto.
		const DESPUES = "2027-01-01T00:00:00.000Z";
		let state = emptyProgressState();
		for (const sesion of [0, 1, 2]) state = credit(state, sesion);
		expect(state.items["syllable:ma"]?.masteredAt).toBe(NOW);

		state = applyResolution({
			content,
			state,
			itemId: "syllable:ma",
			templateId: "listen-tap",
			resolution: { status: "mastery-credit" },
			sessionIndex: 3,
			now: DESPUES,
		});

		expect(state.items["syllable:ma"]?.masteredAt).toBe(NOW);
	});
});

describe("applyResolution con ayuda", () => {
	it("acertar con pista baja a la caja 1 y no toca el dominio", () => {
		let state = emptyProgressState();
		for (const session of [0, 1, 2]) state = credit(state, session);
		state = applyResolution({
			content,
			state,
			itemId: "syllable:ma",
			templateId: "listen-tap",
			resolution: { status: "correct-with-hint", hintsUsed: 1 },
			sessionIndex: 3,
			now: NOW,
		});
		expect(state.items["syllable:ma"]?.box).toBe(1);
		expect(state.items["syllable:ma"]?.firstTryCorrect).toBe(3);
	});

	it("resolver con el modelo cuenta como asistido", () => {
		const state = applyResolution({
			content,
			state: emptyProgressState(),
			itemId: "syllable:ma",
			templateId: "listen-tap",
			resolution: { status: "assisted" },
			sessionIndex: 0,
			now: NOW,
		});
		expect(state.items["syllable:ma"]?.assisted).toBe(1);
		expect(state.items["syllable:ma"]?.box).toBe(1);
		expect(state.items["syllable:ma"]?.firstTryCorrect).toBe(0);
	});

	it("un resultado asistido no quita nada a un ítem ya dominado", () => {
		let state = emptyProgressState();
		for (const sesion of [0, 1, 2]) state = credit(state, sesion);
		const dominado = state.items["syllable:ma"];
		expect(dominado?.firstTryCorrect).toBe(3);

		state = applyResolution({
			content,
			state,
			itemId: "syllable:ma",
			templateId: "listen-tap",
			resolution: { status: "assisted" },
			sessionIndex: 3,
			now: NOW,
		});

		expect(state.items["syllable:ma"]?.firstTryCorrect).toBe(3);
		expect(state.items["syllable:ma"]?.masteredAt).toBe(NOW);
		expect(state.items["syllable:ma"]?.assisted).toBe(1);
	});
});

describe("contadores para los logros", () => {
	it("cuenta los trazos completados, con ayuda o sin ella", () => {
		let state = applyResolution({
			content,
			state: emptyProgressState(),
			itemId: "letter:m",
			templateId: "trace",
			resolution: { status: "assisted" },
			sessionIndex: 0,
			now: NOW,
		});
		state = applyResolution({
			content,
			state,
			itemId: "letter:m",
			templateId: "trace",
			resolution: { status: "mastery-credit" },
			sessionIndex: 1,
			now: NOW,
		});
		expect(state.counters.traces).toBe(2);
	});

	it("cuenta los aciertos de voz solo cuando no fueron asistidos", () => {
		let state = applyResolution({
			content,
			state: emptyProgressState(),
			itemId: "syllable:ma",
			templateId: "say-it",
			resolution: { status: "mastery-credit" },
			sessionIndex: 0,
			now: NOW,
		});
		expect(state.counters.voiceOk).toBe(1);
		state = applyResolution({
			content,
			state,
			itemId: "syllable:ma",
			templateId: "say-it",
			resolution: { status: "assisted" },
			sessionIndex: 1,
			now: NOW,
		});
		expect(state.counters.voiceOk).toBe(1);
	});

	it("cuenta las palabras leídas", () => {
		const state = applyResolution({
			content,
			state: emptyProgressState(),
			itemId: "word:mapa",
			templateId: "read-word",
			resolution: { status: "correct-with-hint", hintsUsed: 1 },
			sessionIndex: 0,
			now: NOW,
		});
		expect(state.counters.wordsRead).toBe(1);
		expect(state.counters.voiceOk).toBe(1);
	});
});

describe("invariantes que ninguna secuencia puede romper", () => {
	// Una revisión anterior listó estados que los tipos permiten expresar pero que no deben
	// ocurrir nunca. Este bloque los somete a una secuencia larga y variada de resultados.
	it("tras 200 resoluciones variadas, el progreso nunca queda en un estado imposible", () => {
		const resoluciones: ExerciseResolution[] = [
			{ status: "mastery-credit" },
			{ status: "correct-with-hint", hintsUsed: 1 },
			{ status: "correct-with-hint", hintsUsed: 2 },
			{ status: "assisted" },
		];
		const rng = createRng(20260919);
		let state = emptyProgressState();
		for (let paso = 0; paso < 200; paso += 1) {
			const sessionIndex = Math.floor(paso / 5);
			const itemId = rng.pick(["syllable:ma", "word:mapa", "letter:m"]);
			const templateId = rng.pick([
				"listen-tap",
				"trace",
				"say-it",
				"read-word",
			] as const);
			const resolution = rng.pick(resoluciones);
			state = applyResolution({
				content,
				state,
				itemId,
				templateId,
				resolution,
				sessionIndex,
				now: NOW,
			});
			for (const [id, progress] of Object.entries(state.items)) {
				// No puede haber progreso en un ítem que nunca se presentó.
				if (!progress.presented) {
					expect([
						id,
						progress.box,
						progress.firstTryCorrect,
						progress.lastSessionIndex,
					]).toEqual([id, 0, 0, -1]);
				}
				// No puede estar marcado como dominado sin tener los tres aciertos.
				if (progress.masteredAt !== null) {
					expect([id, progress.firstTryCorrect >= 3]).toEqual([id, true]);
				}
				// El crédito no puede venir de una sesión posterior a la última vista.
				if (progress.lastCreditSession !== null) {
					expect([
						id,
						progress.lastCreditSession <= progress.lastSessionIndex,
					]).toEqual([id, true]);
				}
				// Los contadores nunca son negativos: nada resta progreso.
				expect([
					id,
					progress.firstTryCorrect >= 0 && progress.assisted >= 0,
				]).toEqual([id, true]);
			}
		}
	});

	it("no muta el estado que recibe, ni siquiera cuando el ítem ya tenía progreso", () => {
		// Partir del estado vacío no sirve: sin un progreso preexistente no hay nada que se
		// pueda mutar en su sitio, y una mutación directa pasaría inadvertida.
		let state = credit(emptyProgressState(), 0);
		state = credit(state, 1);
		const anterior = state;
		const copia = JSON.parse(JSON.stringify(anterior));

		const siguiente = credit(anterior, 2);

		expect(anterior).toEqual(copia);
		expect(anterior.items["syllable:ma"]?.firstTryCorrect).toBe(2);
		expect(siguiente.items["syllable:ma"]?.firstTryCorrect).toBe(3);
		expect(siguiente.items["syllable:ma"]).not.toBe(
			anterior.items["syllable:ma"],
		);
		expect(siguiente.counters).not.toBe(anterior.counters);
	});

	it("lanza con un ítem que no existe en el currículo", () => {
		expect(() =>
			applyResolution({
				content,
				state: emptyProgressState(),
				itemId: "syllable:jamas",
				templateId: "listen-tap",
				resolution: { status: "mastery-credit" },
				sessionIndex: 0,
				now: NOW,
			}),
		).toThrow(/desconocido/i);
	});
});

describe("applySessionEnd", () => {
	it("avanza el contador de sesiones y guarda la mejor marca", () => {
		const state = applySessionEnd({
			content,
			state: emptyProgressState(),
			unitId: "phase2:m",
			stars: 2,
		});
		expect(state.sessionCounter).toBe(1);
		expect(state.counters.sessions).toBe(1);
		expect(state.units["phase2:m"]?.bestStars).toBe(2);
	});

	it("no baja la mejor marca ya conseguida", () => {
		let state = applySessionEnd({
			content,
			state: emptyProgressState(),
			unitId: "phase2:m",
			stars: 3,
		});
		state = applySessionEnd({ content, state, unitId: "phase2:m", stars: 1 });
		expect(state.units["phase2:m"]?.bestStars).toBe(3);
	});

	it("recalcula los estados de las unidades", () => {
		const state = applySessionEnd({
			content,
			state: emptyProgressState(),
			unitId: "phase2:m",
			stars: 1,
		});
		expect(state.units["phase2:m"]?.status).toBe("active");
	});

	it("T2.6: sin unidad (sesión de solo repaso) cuenta la sesión y no toca ninguna mejor marca", () => {
		const conMarca = applySessionEnd({
			content,
			state: emptyProgressState(),
			unitId: "phase2:m",
			stars: 2,
		});
		const state = applySessionEnd({
			content,
			state: conMarca,
			unitId: null,
			stars: 3,
		});
		expect(state.sessionCounter).toBe(conMarca.sessionCounter + 1);
		expect(state.counters.sessions).toBe(conMarca.counters.sessions + 1);
		expect(state.units["phase2:m"]?.bestStars).toBe(2);
		for (const [id, unit] of Object.entries(state.units)) {
			expect(unit.bestStars).toBe(conMarca.units[id]?.bestStars);
		}
	});

	it("T2.6: sin unidad, sobre un estado vacío, ninguna unidad recibe estrellas", () => {
		const state = applySessionEnd({
			content,
			state: emptyProgressState(),
			unitId: null,
			stars: 3,
		});
		expect(state.sessionCounter).toBe(1);
		for (const unit of Object.values(state.units)) {
			expect(unit.bestStars).toBe(0);
		}
	});
});
