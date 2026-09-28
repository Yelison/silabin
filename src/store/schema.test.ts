import { describe, expect, it } from "vitest";
import {
	CURRENT_VERSION,
	emptyPersistedState,
	migrate,
	persistedStateSchema,
	sessionRecordSchema,
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
		expect(state.settings.hideMic).toBe(false);
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
		"syllablesVoiced",
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

describe("migrate: campos nuevos con default (P10)", () => {
	it("M10: un documento v1 sin hideMic ni syllablesVoiced carga sin recuperar y conserva el acento", () => {
		const doc = structuredClone(emptyPersistedState()) as Record<
			string,
			unknown
		>;
		const settings = { ...(doc.settings as Record<string, unknown>) };
		settings.hideMic = undefined;
		settings.accent = "mx";
		const counters = { ...(doc.counters as Record<string, unknown>) };
		counters.syllablesVoiced = undefined;
		const v1 = JSON.parse(JSON.stringify({ ...doc, settings, counters }));
		expect(v1.settings).not.toHaveProperty("hideMic");
		expect(v1.counters).not.toHaveProperty("syllablesVoiced");
		const result = migrate(v1);
		expect(result.recovered).toBe(false);
		expect(result.state.settings.hideMic).toBe(false);
		expect(result.state.settings.accent).toBe("mx");
		expect(result.state.counters.syllablesVoiced).toBe(0);
	});
});

describe("migrate", () => {
	it("devuelve el documento tal cual si es válido y de la versión actual", () => {
		const state = emptyPersistedState();
		const result = migrate(state);
		expect(result.recovered).toBe(false);
		expect(result.state.version).toBe(CURRENT_VERSION);
	});

	it("recupera con estado vacío si el documento es basura sin remedio", () => {
		// Ni null, ni un número, ni una cadena, ni un objeto sin nada dentro tienen claves de
		// las que rescatar nada: ahí no hay progreso que salvar, solo que avisar.
		for (const basura of [
			null,
			undefined,
			42,
			"hola",
			[],
			{},
			{ version: 1 },
		]) {
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

	// Este test decía lo contrario a propósito: en v1 una sola clave corrupta y ajena al
	// progreso tiraba el documento entero, y el comentario dejaba dicho que el día que
	// hubiera rescate por clave este test tenía que fallar para obligar a decidir en voz
	// alta. Ese día llegó. El motivo del cambio: la exportación, que era la mitigación
	// prevista, vive en el panel de padres (Plan 6), mientras que los datos empiezan a
	// acumularse en el Plan 2; y tirar el progreso por una clave ajena contradice "sin
	// castigos: nada resta estrellas, dominio ni progreso".
	it("una clave ajena corrupta no cuesta ni una estrella", () => {
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
		state.counters.sessions = 7;
		state.rewards.unlockedAt["first-session"] = "2026-09-18T12:00:00.000Z";
		state.sessionCounter = 7;

		// Clave ajena al progreso, corrupta: pinHash debería ser string | null.
		const roto = {
			...state,
			settings: { ...state.settings, pinHash: 42 },
		};

		const resultado = migrate(roto);

		// Avisa, para que la interfaz pueda ofrecer restaurar o reiniciar...
		expect(resultado.recovered).toBe(true);
		// ...pero no se pierde nada de lo que el niño ganó.
		expect(resultado.state.items).toEqual(state.items);
		expect(resultado.state.units).toEqual(state.units);
		expect(resultado.state.sessions).toEqual(state.sessions);
		expect(resultado.state.counters).toEqual(state.counters);
		expect(resultado.state.rewards).toEqual(state.rewards);
		expect(resultado.state.sessionCounter).toBe(7);
		// Solo la clave que no valida vuelve a sus valores por omisión.
		expect(resultado.state.settings).toEqual(emptyPersistedState().settings);
	});

	it("dentro de items y units se descarta la entrada corrupta, no el bloque", () => {
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

		const roto = {
			...state,
			items: { ...state.items, "letter:e": { box: "tres" } },
			units: { ...state.units, "phase1:vowel-e": { status: "terminada" } },
		};

		const resultado = migrate(roto);

		expect(resultado.recovered).toBe(true);
		expect(Object.keys(resultado.state.items)).toEqual(["letter:a"]);
		expect(resultado.state.items["letter:a"]?.firstTryCorrect).toBe(3);
		expect(Object.keys(resultado.state.units)).toEqual(["phase1:vowel-a"]);
		expect(resultado.state.units["phase1:vowel-a"]?.bestStars).toBe(3);
	});

	it("un historial de sesiones corrupto no se lleva por delante el dominio", () => {
		const state = emptyPersistedState();
		state.units["phase2:m"] = { status: "done", bestStars: 2 };
		const roto = { ...state, sessions: "esto no es una lista" };

		const resultado = migrate(roto);

		expect(resultado.recovered).toBe(true);
		expect(resultado.state.sessions).toEqual([]);
		expect(resultado.state.units["phase2:m"]?.bestStars).toBe(2);
	});

	it("una versión más nueva tampoco tira el progreso que sí se entiende", () => {
		const state = emptyPersistedState();
		state.units["phase0:clap"] = { status: "done", bestStars: 3 };
		const resultado = migrate({ ...state, version: 99 });

		expect(resultado.recovered).toBe(true);
		expect(resultado.state.version).toBe(CURRENT_VERSION);
		expect(resultado.state.units["phase0:clap"]?.bestStars).toBe(3);
	});
});

describe("sessionRecordSchema", () => {
	const base = { index: 0, stars: 3, endedAt: "2026-09-26T12:00:00.000Z" };

	it("T2.7: acepta unitId null (sesión de solo repaso) y un id de unidad", () => {
		expect(
			sessionRecordSchema.safeParse({ ...base, unitId: null }).success,
		).toBe(true);
		expect(
			sessionRecordSchema.safeParse({ ...base, unitId: "phase0:clap" }).success,
		).toBe(true);
	});

	it("T2.7: rechaza un unitId vacío y uno ausente", () => {
		expect(sessionRecordSchema.safeParse({ ...base, unitId: "" }).success).toBe(
			false,
		);
		expect(sessionRecordSchema.safeParse(base).success).toBe(false);
	});
});
