import { describe, expect, it } from "vitest";
import {
	CURRENT_VERSION,
	emptyPersistedState,
	migrate,
	persistedStateSchema,
} from "@/store/schema";

describe("estado vacío", () => {
	it("valida contra el esquema", () => {
		expect(persistedStateSchema.safeParse(emptyPersistedState()).success).toBe(
			true,
		);
	});

	it("empieza con los ajustes por omisión del spec", () => {
		const state = emptyPersistedState();
		expect(state.version).toBe(CURRENT_VERSION);
		expect(state.settings.accent).toBe("neutro");
		expect(state.settings.lowercaseTracing).toBe(false);
		expect(state.settings.sessionLength).toBe(5);
		expect(state.settings.speechMode).toBe("parent");
		expect(state.settings.reducedCelebrations).toBe(false);
	});

	it("empieza sin progreso, sin sesiones y sin premios", () => {
		const state = emptyPersistedState();
		expect(state.items).toEqual({});
		expect(state.sessions).toEqual([]);
		expect(state.rewards.unlockedAt).toEqual({});
		expect(state.rewards.equipped).toEqual({
			background: null,
			companion: null,
			trail: null,
		});
	});
});

describe("esquema", () => {
	it("rechaza un acento desconocido", () => {
		const state = emptyPersistedState();
		const roto = { ...state, settings: { ...state.settings, accent: "ru" } };
		expect(persistedStateSchema.safeParse(roto).success).toBe(false);
	});

	it("rechaza una longitud de sesión fuera de 5 o 6", () => {
		const state = emptyPersistedState();
		const roto = {
			...state,
			settings: { ...state.settings, sessionLength: 9 },
		};
		expect(persistedStateSchema.safeParse(roto).success).toBe(false);
	});

	it("rechaza estrellas fuera de 0 a 3", () => {
		const state = emptyPersistedState();
		const roto = { ...state, units: { u: { status: "done", bestStars: 7 } } };
		expect(persistedStateSchema.safeParse(roto).success).toBe(false);
	});

	it("acepta un documento con progreso real", () => {
		const state = emptyPersistedState();
		state.items["letter:a"] = {
			box: 2,
			presented: true,
			firstTryCorrect: 2,
			assisted: 1,
			lastSessionIndex: 4,
			lastCreditSession: 4,
			masteredAt: null,
		};
		state.units["phase1:vowel-a"] = { status: "active", bestStars: 2 };
		state.sessions.push({
			index: 0,
			unitId: "phase1:vowel-a",
			stars: 2,
			endedAt: "2026-09-18T12:00:00.000Z",
		});
		expect(persistedStateSchema.safeParse(state).success).toBe(true);
	});
});

describe("límites de los contadores", () => {
	const clavesDeContadores = [
		"traces",
		"sessions",
		"voiceOk",
		"wordsRead",
	] as const;

	it("rechaza un contador negativo", () => {
		const state = emptyPersistedState();
		for (const clave of clavesDeContadores) {
			const roto = {
				...state,
				counters: { ...state.counters, [clave]: -1 },
			};
			const resultado = persistedStateSchema.safeParse(roto);
			expect(resultado.success, clave).toBe(false);
		}
	});

	it("rechaza un contador no entero", () => {
		const state = emptyPersistedState();
		for (const clave of clavesDeContadores) {
			const roto = {
				...state,
				counters: { ...state.counters, [clave]: 1.5 },
			};
			const resultado = persistedStateSchema.safeParse(roto);
			expect(resultado.success, clave).toBe(false);
		}
	});

	it("rechaza sessionCounter negativo o no entero", () => {
		const state = emptyPersistedState();
		expect(
			persistedStateSchema.safeParse({ ...state, sessionCounter: -1 }).success,
		).toBe(false);
		expect(
			persistedStateSchema.safeParse({ ...state, sessionCounter: 1.5 }).success,
		).toBe(false);
	});

	it("rechaza firstTryCorrect negativo en un ítem", () => {
		const state = emptyPersistedState();
		state.items["letter:a"] = {
			box: 1,
			presented: true,
			firstTryCorrect: -1,
			assisted: 0,
			lastSessionIndex: 0,
			lastCreditSession: null,
			masteredAt: null,
		};
		expect(persistedStateSchema.safeParse(state).success).toBe(false);
	});

	it("rechaza assisted no entero en un ítem", () => {
		const state = emptyPersistedState();
		state.items["letter:a"] = {
			box: 1,
			presented: true,
			firstTryCorrect: 0,
			assisted: 1.5,
			lastSessionIndex: 0,
			lastCreditSession: null,
			masteredAt: null,
		};
		expect(persistedStateSchema.safeParse(state).success).toBe(false);
	});
});

describe("migrate", () => {
	it("devuelve el documento tal cual si es válido y de la versión actual", () => {
		const state = emptyPersistedState();
		const result = migrate(state);
		expect(result.recovered).toBe(false);
		expect(result.state.version).toBe(CURRENT_VERSION);
	});

	it("recupera con estado vacío si el documento es basura", () => {
		for (const basura of [null, undefined, 42, "hola", {}, { version: 1 }]) {
			const result = migrate(basura);
			expect(result.recovered).toBe(true);
			expect(result.state).toEqual(emptyPersistedState());
		}
	});

	it("recupera si la versión es más nueva de lo que esta app entiende", () => {
		const futuro = { ...emptyPersistedState(), version: 99 };
		expect(migrate(futuro).recovered).toBe(true);
	});

	it("conserva el progreso de un documento válido", () => {
		const state = emptyPersistedState();
		state.units["phase1:vowel-a"] = { status: "done", bestStars: 3 };
		expect(migrate(state).state.units["phase1:vowel-a"]?.bestStars).toBe(3);
	});

	// Ruling del controlador: en v1 migrate() no hace rescate por clave. Una sola
	// clave corrupta y ajena al progreso (aquí, settings.pinHash) tira todo el
	// documento, aunque items, units y sessions fueran válidos. Es deliberado:
	// recovered=true existe para que la interfaz ofrezca restaurar desde una
	// exportación (Tarea 22), no para que aquí se intente salvar nada por clave.
	// El día que exista rescate por clave en v2, este test debe FALLAR a
	// propósito: eso es lo que fuerza a decidir en voz alta, no en silencio,
	// qué comportamiento nuevo se quiere.
	it("v1 descarta todo el progreso a propósito si una sola clave ajena está corrupta", () => {
		const state = emptyPersistedState();
		state.items["letter:a"] = {
			box: 3,
			presented: true,
			firstTryCorrect: 3,
			assisted: 0,
			lastSessionIndex: 2,
			lastCreditSession: 2,
			masteredAt: "2026-09-18T12:00:00.000Z",
		};
		state.units["phase1:vowel-a"] = { status: "done", bestStars: 3 };
		state.sessions.push({
			index: 0,
			unitId: "phase1:vowel-a",
			stars: 3,
			endedAt: "2026-09-18T12:00:00.000Z",
		});

		// Clave ajena al progreso, corrupta: pinHash debería ser string | null.
		const roto = {
			...state,
			settings: { ...state.settings, pinHash: 42 },
		};

		const resultado = migrate(roto);

		expect(resultado.recovered).toBe(true);
		expect(resultado.state.items).toEqual({});
		expect(resultado.state.units).toEqual({});
		expect(resultado.state.sessions).toEqual([]);
	});
});
