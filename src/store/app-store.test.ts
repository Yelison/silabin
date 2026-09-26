import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import { currentExercise, isSessionOver } from "@/engine";
import { createAppStore } from "@/store/app-store";
import {
	createMemoryAdapter,
	importState,
	type StorageAdapter,
} from "@/store/persist";
import { toProgress } from "@/store/progress-bridge";
import {
	emptyPersistedState,
	type PersistedState,
	persistedStateSchema,
} from "@/store/schema";

/** Un adaptador en memoria que falla al escribir mientras `fallo.activo` sea true. */
function adaptadorQueFalla() {
	const base = createMemoryAdapter();
	const fallo = { activo: false, escrituras: 0 };
	const adapter: StorageAdapter = {
		read: () => base.read(),
		clear: () => base.clear(),
		write: (value) => {
			fallo.escrituras += 1;
			if (fallo.activo) return Promise.reject(new Error("cuota agotada"));
			return base.write(value);
		},
	};
	return { adapter, fallo };
}

function crear(adapter: StorageAdapter = createMemoryAdapter()) {
	let reloj = 0;
	const store = createAppStore({
		adapter,
		content: curriculum,
		// Cada llamada da una fecha distinta y creciente, para distinguir cuándo se anotó algo.
		now: () => `2026-09-26T12:00:${String(reloj++).padStart(2, "0")}.000Z`,
		seed: () => 1,
	});
	return { store, adapter };
}

/** La respuesta que el contenido da por buena para el ejercicio en curso. */
function respuestaCorrecta(store: ReturnType<typeof crear>["store"]): string {
	const run = store.getState().run;
	if (run === null) throw new Error("no hay sesión");
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("la sesión ya acabó");
	if (exercise.correctOptionId !== null) return exercise.correctOptionId;
	const answer = curriculum.items.get(exercise.itemId)?.task?.answer;
	if (answer === undefined) throw new Error("ítem sin respuesta");
	return answer;
}

/** Juega hasta el final acertando todo, sin llamar a `endSession`. */
async function jugarHastaElFinal(store: ReturnType<typeof crear>["store"]) {
	for (;;) {
		const { run } = store.getState();
		if (run === null || isSessionOver(run)) return;
		const exercise = currentExercise(run);
		if (exercise?.kind === "presentation") {
			await store.getState().presentationDone();
		} else {
			await store.getState().answer(respuestaCorrecta(store));
			store.getState().next();
		}
	}
}

async function jugarSesionCompleta(store: ReturnType<typeof crear>["store"]) {
	store.getState().beginSession();
	await jugarHastaElFinal(store);
	await store.getState().endSession();
}

/** Avanza hasta la primera evaluación y devuelve su ítem. */
async function hastaPrimeraEvaluacion(
	store: ReturnType<typeof crear>["store"],
) {
	for (;;) {
		const run = store.getState().run;
		const exercise = run === null ? null : currentExercise(run);
		if (exercise === null) throw new Error("no hay evaluación");
		if (exercise.kind === "evaluation") return exercise.itemId;
		await store.getState().presentationDone();
	}
}

async function leerGuardado(adapter: StorageAdapter): Promise<unknown> {
	return adapter.read();
}

describe("createAppStore: estado inicial", () => {
	it("arranca en loading, sin sesión, resumen ni aviso de guardado", () => {
		const { store } = crear();
		const s = store.getState();
		expect(s.status).toBe("loading");
		expect(s.run).toBeNull();
		expect(s.summary).toBeNull();
		expect(s.saveFailed).toBe(false);
		expect(s.recovered).toBe(false);
	});
});

describe("S1: load con adaptador vacío", () => {
	it("queda ready, sin rescate y con phase0:clap activa", async () => {
		const { store } = crear();
		await store.getState().load();
		const s = store.getState();
		expect(s.status).toBe("ready");
		expect(s.recovered).toBe(false);
		expect(s.progress.units["phase0:clap"]?.status).toBe("active");
	});

	it("marca recovered cuando el adaptador no se puede leer", async () => {
		const adapter: StorageAdapter = {
			read: () => Promise.reject(new Error("bloqueado")),
			write: () => Promise.resolve(),
			clear: () => Promise.resolve(),
		};
		const { store } = crear(adapter);
		await store.getState().load();
		expect(store.getState().status).toBe("ready");
		expect(store.getState().recovered).toBe(true);
	});
});

describe("S2: load con unidades de la Fase 3 en done", () => {
	it("las da por locked al recalcular", async () => {
		const doc = emptyPersistedState();
		for (const [id, unit] of curriculum.units) {
			if (unit.phase === 3) doc.units[id] = { status: "done", bestStars: 0 };
		}
		const { store } = crear(createMemoryAdapter(doc));
		await store.getState().load();
		const fase3 = [...curriculum.units.values()].filter((u) => u.phase === 3);
		expect(fase3.length).toBeGreaterThan(0);
		for (const unit of fase3) {
			expect(store.getState().progress.units[unit.id]?.status).toBe("locked");
		}
	});
});

describe("S3 y S4: sesión completa de clap acertando todo", () => {
	it("registra la sesión, deja el resumen y vacía la corrida", async () => {
		const { store } = crear();
		await store.getState().load();
		await jugarSesionCompleta(store);
		const s = store.getState();
		expect(s.doc.sessions).toHaveLength(1);
		expect(s.doc.sessions[0]).toMatchObject({
			index: 0,
			unitId: "phase0:clap",
			stars: 3,
		});
		expect(s.summary).not.toBeNull();
		expect(s.summary?.stars).toBe(3);
		expect(s.run).toBeNull();
		expect(s.doc.sessionCounter).toBe(1);
		expect(s.progress).toEqual(expect.objectContaining({ sessionCounter: 1 }));
	});

	it("lo guardado es el documento final y pasa el esquema", async () => {
		const { store, adapter } = crear();
		await store.getState().load();
		await jugarSesionCompleta(store);
		const guardado = await leerGuardado(adapter);
		expect(persistedStateSchema.safeParse(guardado).success).toBe(true);
		expect(guardado).toEqual(store.getState().doc);
	});
});

describe("guardado tras cada paso", () => {
	it("guarda tras presentationDone", async () => {
		const { store, adapter } = crear();
		await store.getState().load();
		store.getState().beginSession();
		const run = store.getState().run;
		expect(run && currentExercise(run)?.kind).toBe("presentation");
		const itemId = run ? (currentExercise(run)?.itemId ?? "") : "";
		await store.getState().presentationDone();
		const guardado = (await leerGuardado(adapter)) as PersistedState;
		expect(guardado.items[itemId]?.presented).toBe(true);
	});

	it("guarda tras un answer que resuelve, y no tras uno que solo da pista", async () => {
		const { adapter, fallo } = adaptadorQueFalla();
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		const antes = fallo.escrituras;
		const guardadoAntes = await adapter.read();

		const pista = await store.getState().answer("respuesta-que-no-es");
		expect(pista.resolution).toBeNull();
		expect(fallo.escrituras).toBe(antes);
		expect(await adapter.read()).toEqual(guardadoAntes);

		const buena = await store.getState().answer(respuestaCorrecta(store));
		expect(buena.resolution).not.toBeNull();
		expect(fallo.escrituras).toBe(antes + 1);
		const guardado = await adapter.read();
		expect(guardado).not.toEqual(guardadoAntes);
		expect(guardado).toEqual(store.getState().doc);
	});

	it("el progreso durante la sesión es el de la corrida", async () => {
		const { store } = crear();
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		await store.getState().answer(respuestaCorrecta(store));
		const s = store.getState();
		expect(s.progress).toBe(s.run?.progress);
	});
});

describe("S5: fechas de los logros", () => {
	it("anota now() al ganar un logro y una segunda sesión no cambia esa fecha", async () => {
		const { store } = crear();
		await store.getState().load();
		await jugarSesionCompleta(store);
		const primera = store.getState().doc.rewards.unlockedAt["first-session"];
		expect(primera).toBeDefined();
		expect(store.getState().summary?.newRewardIds).toContain("first-session");
		// La fecha es la del reloj inyectado en el momento de cerrar la sesión: la misma
		// lectura de now() que la entrada del historial, no otra ni un valor cualquiera.
		expect(primera).toBe(store.getState().doc.sessions[0]?.endedAt);
		expect(primera).toMatch(/^2026-09-26T12:00:\d\d\.000Z$/);

		await jugarSesionCompleta(store);
		const s = store.getState();
		expect(s.doc.sessions).toHaveLength(2);
		expect(s.doc.rewards.unlockedAt["first-session"]).toBe(primera);
		// El resumen de la segunda solo trae logros nuevos, no el que ya se tenía.
		expect(s.summary?.newRewardIds).not.toContain("first-session");
	});
});

describe("S6 y S7: fallos de guardado", () => {
	it("un fallo de escritura no lanza, avisa con saveFailed y no corta la sesión", async () => {
		const { adapter, fallo } = adaptadorQueFalla();
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		fallo.activo = true;
		const feedback = await store.getState().answer(respuestaCorrecta(store));
		expect(feedback.resolution).not.toBeNull();
		expect(store.getState().saveFailed).toBe(true);
		expect(store.getState().run).not.toBeNull();
		// La sesión sigue: se puede pasar al siguiente ejercicio.
		store.getState().next();
	});

	it("el siguiente guardado bueno apaga saveFailed", async () => {
		const { adapter, fallo } = adaptadorQueFalla();
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		fallo.activo = true;
		await store.getState().answer(respuestaCorrecta(store));
		expect(store.getState().saveFailed).toBe(true);
		fallo.activo = false;
		store.getState().next();
		await jugarHastaElFinal(store);
		expect(store.getState().saveFailed).toBe(false);
	});

	it("retrySave repite el último documento y apaga saveFailed", async () => {
		const { adapter, fallo } = adaptadorQueFalla();
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		fallo.activo = true;
		await store.getState().answer(respuestaCorrecta(store));
		expect(store.getState().saveFailed).toBe(true);
		// El disco se quedó con el último guardado bueno, distinto del documento en memoria.
		expect(await adapter.read()).not.toEqual(store.getState().doc);

		const antes = store.getState().doc;
		fallo.activo = false;
		await store.getState().retrySave();
		expect(store.getState().saveFailed).toBe(false);
		// Reenvía el mismo documento que tenía en memoria, sin cambiarlo.
		expect(await adapter.read()).toEqual(antes);
		expect(store.getState().doc).toEqual(antes);
	});

	it("retrySave que vuelve a fallar deja saveFailed en true sin lanzar", async () => {
		const { adapter, fallo } = adaptadorQueFalla();
		const { store } = crear(adapter);
		await store.getState().load();
		fallo.activo = true;
		await store.getState().retrySave();
		expect(store.getState().saveFailed).toBe(true);
	});

	it("endSession con el guardado roto igualmente cierra la sesión y deja el resumen", async () => {
		const { adapter, fallo } = adaptadorQueFalla();
		const { store } = crear(adapter);
		await store.getState().load();
		fallo.activo = true;
		await jugarSesionCompleta(store);
		const s = store.getState();
		expect(s.saveFailed).toBe(true);
		expect(s.run).toBeNull();
		expect(s.summary).not.toBeNull();
		expect(s.doc.sessions).toHaveLength(1);
	});
});

/**
 * Un adaptador cuya lectura se controla desde el test (`lectura`) y que cuenta las escrituras.
 * `"lanza"` simula IndexedDB inaccesible; cualquier otro valor es lo que devuelve `read()`.
 */
function adaptadorConLectura(lectura: unknown) {
	const estado: { lectura: unknown; escrituras: unknown[] } = {
		lectura,
		escrituras: [],
	};
	const adapter: StorageAdapter = {
		read: () =>
			estado.lectura === "lanza"
				? Promise.reject(
						new Error("Connection to Indexed Database server lost"),
					)
				: Promise.resolve(estado.lectura),
		write: (value) => {
			estado.escrituras.push(value);
			return Promise.resolve();
		},
		clear: () => Promise.resolve(),
	};
	return { adapter, estado };
}

function documentoReal(): PersistedState {
	const doc = emptyPersistedState();
	doc.units["phase1:vowel-a"] = { status: "done", bestStars: 3 };
	return doc;
}

describe("I3: un fallo de lectura no permite sobrescribir el progreso guardado", () => {
	it("con la lectura rota no se escribe nunca, se avisa con saveFailed y el niño sigue jugando", async () => {
		const { adapter, estado } = adaptadorConLectura("lanza");
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		expect(store.getState().saveFailed).toBe(true);
		const feedback = await store.getState().answer(respuestaCorrecta(store));
		expect(feedback.resolution).not.toBeNull();
		expect(estado.escrituras).toHaveLength(0);
		expect(store.getState().saveFailed).toBe(true);
		expect(store.getState().run).not.toBeNull();
		store.getState().next();
	});

	it("endSession con la lectura rota no lanza y llega al resumen", async () => {
		const { adapter, estado } = adaptadorConLectura("lanza");
		const { store } = crear(adapter);
		await store.getState().load();
		await jugarSesionCompleta(store);
		const s = store.getState();
		expect(estado.escrituras).toHaveLength(0);
		expect(s.saveFailed).toBe(true);
		expect(s.run).toBeNull();
		expect(s.summary).not.toBeNull();
	});

	it("retrySave con la lectura ya sin nada guardado escribe el documento en memoria una vez y desbloquea", async () => {
		const { adapter, estado } = adaptadorConLectura("lanza");
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		await store.getState().answer(respuestaCorrecta(store));
		expect(estado.escrituras).toHaveLength(0);

		estado.lectura = null;
		const enMemoria = store.getState().doc;
		await store.getState().retrySave();
		expect(estado.escrituras).toEqual([enMemoria]);
		expect(store.getState().saveFailed).toBe(false);

		// Desbloqueado: a partir de aquí se guarda como siempre.
		store.getState().next();
		await jugarHastaElFinal(store);
		expect(estado.escrituras.length).toBeGreaterThan(1);
		expect(store.getState().saveFailed).toBe(false);
	});

	it("retrySave con la lectura ya sin nada (undefined) también desbloquea", async () => {
		const { adapter, estado } = adaptadorConLectura("lanza");
		const { store } = crear(adapter);
		await store.getState().load();
		estado.lectura = undefined;
		await store.getState().retrySave();
		expect(estado.escrituras).toHaveLength(1);
		expect(store.getState().saveFailed).toBe(false);
	});

	it("retrySave que ahora lee un documento real no lo pisa ni lo adopta", async () => {
		const { adapter, estado } = adaptadorConLectura("lanza");
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		await store.getState().answer(respuestaCorrecta(store));

		estado.lectura = documentoReal();
		const antes = store.getState().doc;
		await store.getState().retrySave();
		expect(estado.escrituras).toHaveLength(0);
		expect(store.getState().saveFailed).toBe(true);
		expect(store.getState().doc).toBe(antes);

		// Sigue bloqueado: un paso posterior tampoco escribe.
		store.getState().next();
		await jugarHastaElFinal(store);
		expect(estado.escrituras).toHaveLength(0);
		expect(store.getState().saveFailed).toBe(true);
	});

	it("retrySave con la lectura rota otra vez no escribe y sigue avisando", async () => {
		const { adapter, estado } = adaptadorConLectura("lanza");
		const { store } = crear(adapter);
		await store.getState().load();
		await store.getState().retrySave();
		expect(estado.escrituras).toHaveLength(0);
		expect(store.getState().saveFailed).toBe(true);
	});

	it("un documento guardado inválido (recovered por migrate) no bloquea: se guarda como siempre", async () => {
		const { adapter, estado } = adaptadorConLectura({
			version: 1,
			basura: true,
		});
		const { store } = crear(adapter);
		await store.getState().load();
		expect(store.getState().recovered).toBe(true);
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		expect(estado.escrituras.length).toBeGreaterThan(0);
		expect(store.getState().saveFailed).toBe(false);
	});
});

describe("S8: endSession con la sesión a medias", () => {
	it("lanza y deja el estado como estaba", async () => {
		const { store, adapter } = crear();
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		const antes = store.getState();
		await expect(store.getState().endSession()).rejects.toThrow();
		const despues = store.getState();
		expect(despues.run).toBe(antes.run);
		expect(despues.doc).toBe(antes.doc);
		expect(despues.progress).toBe(antes.progress);
		expect(despues.summary).toBeNull();
		expect(despues.doc.sessions).toHaveLength(0);
		// Nada se guardó de la sesión terminada.
		expect(await adapter.read()).not.toHaveProperty("sessions.0");
	});

	it("lanza también si no hay sesión", async () => {
		const { store } = crear();
		await store.getState().load();
		await expect(store.getState().endSession()).rejects.toThrow();
	});
});

describe("beginSession", () => {
	it("lanza si ya hay una sesión en curso y no la sustituye", async () => {
		const { store } = crear();
		await store.getState().load();
		store.getState().beginSession();
		const run = store.getState().run;
		expect(() => store.getState().beginSession()).toThrow();
		expect(store.getState().run).toBe(run);
	});

	it("usa sessionLength de los ajustes", async () => {
		const doc = emptyPersistedState();
		doc.settings.sessionLength = 6;
		const { store } = crear(createMemoryAdapter(doc));
		await store.getState().load();
		store.getState().beginSession();
		expect(store.getState().run?.exercises).toHaveLength(6);
	});

	it("usa la semilla de deps.seed", async () => {
		const semillas: number[] = [];
		const store = createAppStore({
			adapter: createMemoryAdapter(),
			content: curriculum,
			now: () => "2026-09-26T12:00:00.000Z",
			seed: () => {
				semillas.push(7);
				return 7;
			},
		});
		await store.getState().load();
		store.getState().beginSession();
		expect(semillas).toHaveLength(1);
	});
});

describe("S9: abandonar no cuenta la sesión ni duplica el crédito", () => {
	it("sessionCounter sigue en 0 y el crédito del ítem no se duplica", async () => {
		const { store } = crear();
		await store.getState().load();
		store.getState().beginSession();
		// Se acierta el primer ítem evaluado y también el segundo: el segundo (sol) es de los
		// que la sesión siguiente, con la misma semilla, vuelve a planificar.
		const primero = await hastaPrimeraEvaluacion(store);
		await store.getState().answer(respuestaCorrecta(store));
		store.getState().next();
		const segundo = await hastaPrimeraEvaluacion(store);
		await store.getState().answer(respuestaCorrecta(store));
		expect(store.getState().progress.items[primero]?.firstTryCorrect).toBe(1);
		expect(store.getState().progress.items[segundo]?.firstTryCorrect).toBe(1);

		store.getState().abandonSession();
		let s = store.getState();
		expect(s.run).toBeNull();
		expect(s.doc.sessionCounter).toBe(0);
		expect(s.progress.sessionCounter).toBe(0);
		expect(s.doc.sessions).toHaveLength(0);
		// Lo ya guardado se conserva.
		expect(s.progress.items[primero]?.firstTryCorrect).toBe(1);
		expect(s.progress.items[segundo]?.firstTryCorrect).toBe(1);

		// La sesión siguiente reutiliza el índice 0 y vuelve a plantear un ítem que ya tiene
		// crédito de ese mismo índice. Se busca en lo planificado, y se exige que exista, para
		// que el test no pueda volver a ser vacuo si cambia el planificador.
		store.getState().beginSession();
		const run = store.getState().run;
		expect(run?.sessionIndex).toBe(0);
		const repetidos = (run?.exercises ?? [])
			.filter(
				(e) =>
					e.kind === "evaluation" &&
					(s.progress.items[e.itemId]?.firstTryCorrect ?? 0) >= 1,
			)
			.map((e) => e.itemId);
		expect(repetidos.length).toBeGreaterThan(0);

		await jugarHastaElFinal(store);
		await store.getState().endSession();
		s = store.getState();
		expect(s.doc.sessions.map((e) => e.index)).toEqual([0]);
		expect(s.doc.sessionCounter).toBe(1);
		for (const id of repetidos)
			expect(s.doc.items[id]?.firstTryCorrect).toBe(1);
	});

	it("abandonar restaura progress desde el documento y no desde la corrida", async () => {
		const { store } = crear();
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		store.getState().abandonSession();
		const s = store.getState();
		expect(s.run).toBeNull();
		expect(s.progress.units["phase0:clap"]?.status).toBe("active");
		expect(s.progress.items).toEqual(s.doc.items);
	});
});

describe("el estado se actualiza antes de esperar al disco", () => {
	it("presentationDone y endSession dejan doc, run y summary al día de inmediato", async () => {
		const base = createMemoryAdapter();
		let soltar: () => void = () => {};
		let bloqueado = false;
		const adapter: StorageAdapter = {
			read: () => base.read(),
			clear: () => base.clear(),
			write: async (value) => {
				if (bloqueado)
					await new Promise<void>((resolve) => {
						soltar = resolve;
					});
				await base.write(value);
			},
		};
		const { store } = crear(adapter);
		await store.getState().load();
		store.getState().beginSession();
		bloqueado = true;

		const primera = store.getState().presentationDone();
		// El disco todavía no ha contestado, pero el documento en memoria ya lo sabe.
		expect(
			Object.values(store.getState().doc.items).some((i) => i.presented),
		).toBe(true);
		soltar();
		await primera;

		bloqueado = false;
		await jugarHastaElFinal(store);
		bloqueado = true;
		const fin = store.getState().endSession();
		expect(store.getState().run).toBeNull();
		expect(store.getState().summary).not.toBeNull();
		expect(store.getState().doc.sessions).toHaveLength(1);
		// Una segunda pulsación no repite el fin de la sesión.
		await expect(store.getState().endSession()).rejects.toThrow();
		soltar();
		await fin;
		expect(store.getState().doc.sessions).toHaveLength(1);
	});
});

describe("progress durante y después de una sesión", () => {
	it("beginSession deja progress igual a run.progress", async () => {
		const { store } = crear();
		await store.getState().load();
		store.getState().beginSession();
		expect(store.getState().progress).toBe(store.getState().run?.progress);
	});

	it("tras endSession progress es el del documento", async () => {
		const { store } = crear();
		await store.getState().load();
		await jugarSesionCompleta(store);
		const s = store.getState();
		expect(s.progress).toEqual(toProgress(s.doc, curriculum));
	});

	it("exportJson en mitad de una sesión exporta el documento", async () => {
		const { store } = crear();
		await store.getState().load();
		store.getState().beginSession();
		await hastaPrimeraEvaluacion(store);
		await store.getState().answer(respuestaCorrecta(store));
		expect(importState(store.getState().exportJson()).state).toEqual(
			store.getState().doc,
		);
	});
});

describe("S10: exportJson", () => {
	it("importState de lo exportado devuelve el mismo documento sin rescate", async () => {
		const { store } = crear();
		await store.getState().load();
		await jugarSesionCompleta(store);
		const { state, recovered } = importState(store.getState().exportJson());
		expect(recovered).toBe(false);
		expect(state).toEqual(store.getState().doc);
	});
});

describe("clearSummary", () => {
	it("borra el resumen y deja el resto", async () => {
		const { store } = crear();
		await store.getState().load();
		await jugarSesionCompleta(store);
		store.getState().clearSummary();
		expect(store.getState().summary).toBeNull();
		expect(store.getState().doc.sessions).toHaveLength(1);
	});
});

describe("una sesión tras recargar", () => {
	it("un store nuevo sobre el mismo adaptador retoma el documento guardado", async () => {
		const { store, adapter } = crear();
		await store.getState().load();
		await jugarSesionCompleta(store);
		const { store: otro } = crear(adapter);
		await otro.getState().load();
		expect(otro.getState().doc).toEqual(store.getState().doc);
		expect(otro.getState().progress.sessionCounter).toBe(1);
	});
});
