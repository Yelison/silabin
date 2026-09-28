import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import type { ProgressState } from "@/engine";
import {
	appendSession,
	toProgress,
	unlockRewards,
	withProgress,
} from "@/store/progress-bridge";
import { emptyPersistedState, type PersistedState } from "@/store/schema";

describe("toProgress", () => {
	it("recalcula las unidades en vez de fiarse de las guardadas", () => {
		const doc = emptyPersistedState();
		// Trampa 1 del README: una unidad vacía de la Fase 3 guardada como done.
		doc.units["phase3:t"] = { status: "done", bestStars: 0 };
		const progress = toProgress(doc, curriculum);
		expect(progress.units["phase3:t"]?.status).toBe("locked");
		expect(progress.units["phase0:clap"]?.status).toBe("active");
	});

	it("no arrastra settings, sessions ni rewards al progreso", () => {
		const progress = toProgress(emptyPersistedState(), curriculum);
		expect(Object.keys(progress).sort()).toEqual([
			"counters",
			"items",
			"sessionCounter",
			"units",
		]);
	});
});

describe("B1: withProgress", () => {
	it("conserva settings, sessions y rewards y sustituye los campos de progreso", () => {
		const doc: PersistedState = {
			...emptyPersistedState(),
			sessions: [{ index: 0, unitId: "phase0:clap", stars: 2, endedAt: "x" }],
			rewards: {
				unlockedAt: { "first-session": "antes" },
				equipped: { background: "first-session", companion: null, trail: null },
			},
		};
		doc.settings = { ...doc.settings, childName: "Ana", sessionLength: 6 };
		const progress: ProgressState = {
			items: {},
			units: { "phase0:clap": { status: "active", bestStars: 3 } },
			sessionCounter: 7,
			counters: {
				traces: 1,
				sessions: 2,
				voiceOk: 3,
				wordsRead: 4,
				syllablesVoiced: 2,
			},
		};
		const out = withProgress(doc, progress);
		expect(out.settings).toEqual(doc.settings);
		expect(out.sessions).toEqual(doc.sessions);
		expect(out.rewards).toEqual(doc.rewards);
		expect(out.sessionCounter).toBe(7);
		expect(out.counters).toEqual(progress.counters);
		expect(out.units).toEqual(progress.units);
		expect(out.items).toEqual({});
		expect(out.version).toBe(doc.version);
	});

	it("ida y vuelta: toProgress de un documento y withProgress lo dejan igual salvo unidades recalculadas", () => {
		const doc = emptyPersistedState();
		const out = withProgress(doc, toProgress(doc, curriculum));
		expect(out.settings).toEqual(doc.settings);
		expect(out.sessions).toEqual(doc.sessions);
		expect(out.rewards).toEqual(doc.rewards);
		expect(out.items).toEqual(doc.items);
		expect(out.counters).toEqual(doc.counters);
	});

	it("no muta el documento que recibe", () => {
		const doc = emptyPersistedState();
		const copia = structuredClone(doc);
		withProgress(doc, { ...toProgress(doc, curriculum), sessionCounter: 9 });
		expect(doc).toEqual(copia);
	});

	it("no cuela claves ajenas al esquema si el progreso trae de más", () => {
		const doc = emptyPersistedState();
		const conExtra = {
			...toProgress(doc, curriculum),
			basura: 1,
		} as ProgressState;
		expect(Object.keys(withProgress(doc, conExtra)).sort()).toEqual(
			Object.keys(doc).sort(),
		);
	});
});

describe("appendSession", () => {
	it("añade la entrada al final sin mutar el documento", () => {
		const doc = emptyPersistedState();
		doc.sessions = [
			{ index: 0, unitId: "phase0:clap", stars: 1, endedAt: "a" },
		];
		const antes = structuredClone(doc);
		const out = appendSession(doc, {
			index: 1,
			unitId: null,
			stars: 3,
			endedAt: "b",
		});
		expect(out.sessions.map((s) => s.index)).toEqual([0, 1]);
		expect(doc).toEqual(antes);
	});
});

describe("unlockRewards", () => {
	it("anota los logros nuevos con la fecha dada", () => {
		const out = unlockRewards(emptyPersistedState(), ["a", "b"], "hoy");
		expect(out.rewards.unlockedAt).toEqual({ a: "hoy", b: "hoy" });
	});

	it("no pisa la fecha de un logro que ya estaba desbloqueado", () => {
		const doc = emptyPersistedState();
		doc.rewards.unlockedAt = { a: "ayer" };
		const out = unlockRewards(doc, ["a", "b"], "hoy");
		expect(out.rewards.unlockedAt).toEqual({ a: "ayer", b: "hoy" });
		expect(doc.rewards.unlockedAt).toEqual({ a: "ayer" });
	});

	it("conserva lo equipado y sin ids deja el documento igual", () => {
		const doc = emptyPersistedState();
		doc.rewards.equipped.trail = "t";
		expect(unlockRewards(doc, [], "hoy")).toEqual(doc);
	});
});
