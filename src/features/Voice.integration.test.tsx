// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CurriculumIndex,
	currentExercise,
	curriculum,
	type Item,
	itemProgressOf,
	type PlannedExercise,
	type SessionRun,
	type TemplateId,
	type Unit,
} from "@/engine";
import { AppProviders, type SpeechDeps } from "@/features/app-context";
import { EndScreen } from "@/features/session/EndScreen";
import {
	IMPLEMENTED_TEMPLATES,
	isSessionPlayable,
	templateViews,
} from "@/features/session/registry";
import { SessionScreen } from "@/features/session/SessionScreen";
import { COUNTDOWN_MS, TAP_GUARD_MS } from "@/features/session/voice/VoiceTurn";
import { documentoConUnidadesHechas, fakeAudio } from "@/features/test-support";
import { createParentEvaluator, type ListenResult } from "@/speech";
import { createAppStore, createMemoryAdapter } from "@/store";

const CELEBRACION_MS = 700;

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function itemDe(id: string): Item {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	return item;
}

/**
 * Currículo de prueba con dos unidades: `test:say-it` solo declara `say-it` (`letter:a` y
 * `syllable:ma`) y `test:read-word` solo `read-word` (`word:mapa`, con la sílaba `syllable:ma`
 * que da la pista 2). Cada prueba juega una de las dos, con el motor, el store y las vistas
 * reales; solo el micrófono es falso.
 */
function contenido(cual: "say-it" | "read-word"): CurriculumIndex {
	const ids =
		cual === "say-it"
			? ["letter:a", "syllable:ma"]
			: ["word:mapa", "syllable:ma"];
	const introduce = cual === "say-it" ? ids : ["word:mapa"];
	const unit: Unit = {
		id: `test:${cual}`,
		phase: cual === "say-it" ? 1 : 2,
		title: "Prueba de voz",
		audioKey: `unit:test:${cual}`,
		requires: [],
		introduces: introduce,
		exercises: [{ templateId: cual, weight: 1 }],
	};
	return {
		items: new Map(ids.map((id) => [id, itemDe(id)])),
		units: new Map([[unit.id, unit]]),
		unitOrder: [unit.id],
	};
}

type Montaje = Awaited<ReturnType<typeof montar>>;

async function montar(opciones: {
	plantilla: "say-it" | "read-word";
	hideMic?: boolean;
	/** Lo que oye el micrófono en las escuchas sucesivas; sin más, `heard`. */
	escuchas?: ListenResult[];
}) {
	const content = contenido(opciones.plantilla);
	const documento = opciones.hideMic
		? documentoConUnidadesHechas(null, { hideMic: true })
		: null;
	const adapter = createMemoryAdapter(documento);
	let reloj = 0;
	const store = createAppStore({
		adapter,
		content,
		now: () => `2026-09-28T12:00:${String(reloj++ % 60).padStart(2, "0")}.000Z`,
		seed: () => 1,
	});
	await store.getState().load();
	store.getState().beginSession();
	const audio = fakeAudio();
	const cola = [...(opciones.escuchas ?? [])];
	const listen = vi.fn(
		async (): Promise<ListenResult> => cola.shift() ?? { kind: "heard" },
	);
	const speech: SpeechDeps = {
		listener: { listen },
		evaluators: [createParentEvaluator()],
	};
	function Flujo() {
		const [fin, setFin] = useState(false);
		return fin ? (
			<EndScreen onDone={() => {}} />
		) : (
			<SessionScreen
				onEnd={() => setFin(true)}
				onExit={() => {}}
				celebrationMs={CELEBRACION_MS}
			/>
		);
	}
	const { container } = render(
		<AppProviders store={store} audio={audio} speech={speech}>
			<Flujo />
		</AppProviders>,
	);
	const pasar = (ms: number) =>
		act(async () => {
			await vi.advanceTimersByTimeAsync(ms);
		});
	const run = (): SessionRun => {
		const r = store.getState().run;
		if (r === null) throw new Error("sin corrida");
		return r;
	};
	return { store, adapter, audio, listen, container, pasar, run };
}

const microfono = () => screen.queryByRole("button", { name: "Micrófono" });
const boton = (nombre: string) => screen.getByRole("button", { name: nombre });

/** Pulsa el micrófono y deja pasar la cuenta atrás y la escucha. */
async function decir(m: Montaje) {
	fireEvent.click(boton("Micrófono"));
	await m.pasar(COUNTDOWN_MS + 50);
}

/** Pasa las presentaciones hasta que la evaluación esté en pantalla. */
async function hastaLaEvaluacion(m: Montaje): Promise<PlannedExercise> {
	for (let vuelta = 0; vuelta < 100; vuelta++) {
		await m.pasar(100);
		const ex = currentExercise(m.run());
		if (ex?.kind === "evaluation") return ex;
		const siguiente = screen.queryByRole("button", { name: "Siguiente" });
		if (siguiente !== null) fireEvent.click(siguiente);
	}
	throw new Error("No llegó ninguna evaluación");
}

type Guardado = {
	counters: {
		voiceOk: number;
		wordsRead: number;
		syllablesVoiced: number;
		sessions: number;
	};
	items: Record<string, { box: number; assisted: number }>;
	sessions: { unitId: string | null; stars: number }[];
};

/**
 * Juega la sesión entera: pasa las presentaciones y llama a `turno` con cada evaluación al
 * montarse. Devuelve las evaluaciones jugadas, en orden, con su ítem.
 */
async function jugarSesion(
	m: Montaje,
	turno: (ex: PlannedExercise, item: Item, indice: number) => Promise<void>,
): Promise<{ ex: PlannedExercise; item: Item }[]> {
	const jugadas: { ex: PlannedExercise; item: Item }[] = [];
	const vistas = new Set<string>();
	for (let vuelta = 0; vuelta < 300; vuelta++) {
		await m.pasar(100);
		if (m.container.querySelector('[data-screen="end"]') !== null)
			return jugadas;
		const run = m.store.getState().run;
		if (run === null) continue;
		const ex = currentExercise(run);
		if (ex === null || vistas.has(ex.id)) continue;
		if (ex.kind === "presentation") {
			const siguiente = screen.queryByRole("button", { name: "Siguiente" });
			if (siguiente === null) continue;
			vistas.add(ex.id);
			fireEvent.click(siguiente);
			continue;
		}
		vistas.add(ex.id);
		const item = itemDe(ex.itemId);
		jugadas.push({ ex, item });
		await turno(ex, item, jugadas.length - 1);
	}
	throw new Error("La sesión no terminó en 300 vueltas");
}

async function guardado(m: Montaje): Promise<Guardado> {
	return (await m.adapter.read()) as Guardado;
}

describe("la voz de punta a punta, con el motor, el store y las vistas reales", () => {
	it("I1 e I6: «Lo dijo bien» al primer intento sube de caja y da voiceOk, y syllablesVoiced solo en la sílaba; al acabar todo cuenta", async () => {
		const m = await montar({ plantilla: "say-it" });
		let silabas = 0;
		// El crédito de caja es uno por ítem y sesión: solo el primer acierto de cada ítem sube.
		const acreditados = new Set<string>();
		const jugadas = await jugarSesion(m, async (ex, item) => {
			expect(ex.templateId).toBe("say-it");
			const antes = m.store.getState().progress;
			const cajaAntes = itemProgressOf(antes, item.id).box;
			await decir(m);
			fireEvent.click(boton("Lo dijo bien"));
			await m.pasar(50);
			const despues = m.store.getState().progress;
			const cajaDespues = itemProgressOf(despues, item.id).box;
			if (acreditados.has(item.id)) expect(cajaDespues).toBe(cajaAntes);
			else expect(cajaDespues).toBeGreaterThan(cajaAntes);
			acreditados.add(item.id);
			expect(despues.counters.voiceOk).toBe(antes.counters.voiceOk + 1);
			const esSilaba = item.kind === "syllable";
			if (esSilaba) silabas += 1;
			expect(despues.counters.syllablesVoiced).toBe(
				antes.counters.syllablesVoiced + (esSilaba ? 1 : 0),
			);
			await m.pasar(CELEBRACION_MS);
		});
		// La sesión de prueba tiene que haber jugado tanto la letra como la sílaba.
		expect(silabas).toBeGreaterThan(0);
		expect(silabas).toBeLessThan(jugadas.length);

		// I6: el fin de sesión cuenta los ejercicios jugados.
		expect(m.container.querySelector('[data-screen="end"]')).not.toBeNull();
		expect(m.store.getState().run).toBeNull();
		const resumen = m.store.getState().summary;
		expect(resumen).not.toBeNull();
		const disco = await guardado(m);
		expect(disco.counters.voiceOk).toBe(jugadas.length);
		expect(disco.counters.syllablesVoiced).toBe(silabas);
		expect(disco.counters.wordsRead).toBe(0);
		expect(disco.sessions).toHaveLength(1);
		expect(disco.sessions[0]?.stars).toBe(resumen?.stars);
		expect(disco.sessions[0]?.stars).toBeGreaterThan(0);
		expect(screen.getByRole("img", { name: /estrella/ })).toBeDefined();
	});

	it("I2: tres «Otra vez» dan el modelo; hablar en él avanza, queda asistido y voiceOk no sube", async () => {
		const m = await montar({ plantilla: "say-it" });
		const ex = await hastaLaEvaluacion(m);
		const item = itemDe(ex.itemId);
		for (let fallo = 0; fallo < 3; fallo++) {
			await decir(m);
			fireEvent.click(boton("Otra vez"));
			await m.pasar(TAP_GUARD_MS + 50);
		}
		expect(m.run().resolutions.at(-1)?.status).toBe("assisted");
		expect(currentExercise(m.run())?.id).toBe(ex.id);

		// En el modelo basta con hablar: el `heard` avanza, sin veredicto del adulto.
		await decir(m);
		expect(currentExercise(m.run())?.id).not.toBe(ex.id);
		const progreso = m.store.getState().progress;
		expect(itemProgressOf(progreso, item.id).assisted).toBe(1);
		expect(progreso.counters.voiceOk).toBe(0);
		expect(progreso.counters.syllablesVoiced).toBe(0);
		const disco = await guardado(m);
		expect(disco.items[item.id]?.assisted).toBe(1);
		expect(disco.counters.voiceOk).toBe(0);
	});

	it("I3: con hideMic en el documento no hay micrófono en toda la sesión, ni en el modelo, y no se escucha nada", async () => {
		const m = await montar({ plantilla: "say-it", hideMic: true });
		expect(m.store.getState().doc.settings.hideMic).toBe(true);
		const jugadas = await jugarSesion(m, async (_ex, _item, indice) => {
			expect(microfono()).toBeNull();
			expect(boton("Lo dijo bien")).toBeDefined();
			if (indice === 0) {
				// El primer ejercicio se falla hasta el modelo, que también va solo con botones.
				for (let fallo = 0; fallo < 3; fallo++) {
					fireEvent.click(boton("Otra vez"));
					await m.pasar(TAP_GUARD_MS + 50);
					expect(microfono()).toBeNull();
				}
				expect(microfono()).toBeNull();
				fireEvent.click(boton("Lo repitió"));
				await m.pasar(CELEBRACION_MS + 50);
				return;
			}
			fireEvent.click(boton("Lo dijo bien"));
			await m.pasar(CELEBRACION_MS + 50);
		});
		expect(jugadas.length).toBeGreaterThan(1);
		expect(m.listen).not.toHaveBeenCalled();
		expect(m.container.querySelector('[data-screen="end"]')).not.toBeNull();
	});

	it("I4: dos silencios sacan los botones y no se registra ningún intento hasta pulsar uno", async () => {
		const m = await montar({
			plantilla: "say-it",
			escuchas: [{ kind: "silence" }, { kind: "silence" }],
		});
		const ex = await hastaLaEvaluacion(m);
		const intentoAntes = m.run().attempt.attempt;
		const desde = m.audio.play.mock.calls.length;

		await decir(m);
		// Un silencio: el micrófono sigue y todavía no hay botones del adulto.
		expect(microfono()).not.toBeNull();
		expect(screen.queryByRole("button", { name: "Lo dijo bien" })).toBeNull();
		await decir(m);
		expect(
			screen.queryByRole("button", { name: "Lo dijo bien" }),
		).not.toBeNull();
		expect(boton("Otra vez")).toBeDefined();

		// «No te oí» sonó dos veces, y el motor no ha visto ningún intento.
		const claves = m.audio.play.mock.calls.slice(desde).map((c) => c[0].key);
		expect(claves.filter((k) => k === "feedback:no-speech")).toHaveLength(2);
		expect(m.run().resolutions).toEqual([]);
		expect(m.run().attempt.attempt).toBe(intentoAntes);
		expect(currentExercise(m.run())?.id).toBe(ex.id);

		fireEvent.click(boton("Lo dijo bien"));
		await m.pasar(50);
		expect(m.run().resolutions).toEqual([{ status: "mastery-credit" }]);
	});

	it("I5 e I6: read-word correcto cuenta wordsRead y descubre la imagen; al acabar todo cuenta", async () => {
		const m = await montar({ plantilla: "read-word" });
		const jugadas = await jugarSesion(m, async (_ex, item, indice) => {
			expect(item.id).toBe("word:mapa");
			if (indice === 0) {
				expect(screen.queryByRole("img", { name: "mapa" })).toBeNull();
				expect(
					screen.queryByRole("img", { name: "Imagen tapada" }),
				).not.toBeNull();
			}
			const antes = m.store.getState().progress.counters.wordsRead;
			await decir(m);
			fireEvent.click(boton("Lo dijo bien"));
			await m.pasar(50);
			expect(m.store.getState().progress.counters.wordsRead).toBe(antes + 1);
			if (indice === 0) {
				expect(screen.queryByRole("img", { name: "mapa" })).not.toBeNull();
				expect(screen.queryByRole("img", { name: "Imagen tapada" })).toBeNull();
			}
			await m.pasar(CELEBRACION_MS);
		});
		const disco = await guardado(m);
		expect(disco.counters.wordsRead).toBe(jugadas.length);
		expect(disco.counters.voiceOk).toBe(jugadas.length);
		expect(disco.counters.syllablesVoiced).toBe(0);
		expect(m.container.querySelector('[data-screen="end"]')).not.toBeNull();
		expect(disco.sessions).toHaveLength(1);
	});
});

describe("I7: con el currículo real, toda plantilla que sale tiene vista", () => {
	function tiendaCon(documento: unknown, semilla: number) {
		return createAppStore({
			adapter: createMemoryAdapter(documento),
			content: curriculum,
			now: () => "2026-09-28T12:00:00.000Z",
			seed: () => semilla,
		});
	}

	it.each([
		["phase1:vowel-a", { itemsExtra: [] as string[] }, "say-it"],
		[
			"phase2:m",
			{
				itemsExtra: [
					"phoneme:m",
					"letter:m",
					"syllable:ma",
					"syllable:me",
					"syllable:mi",
					"syllable:mo",
					"syllable:mu",
				],
			},
			"read-word",
		],
	])(
		"con %s activa, cada ejercicio de 30 semillas tiene vista y la sesión es jugable",
		async (unidad, opciones, esperada) => {
			const documento = documentoConUnidadesHechas(unidad, opciones);
			const plantillas = new Set<TemplateId>();
			for (let semilla = 1; semilla <= 30; semilla++) {
				const store = tiendaCon(documento, semilla);
				await store.getState().load();
				expect(store.getState().progress.units[unidad]?.status).toBe("active");
				expect(
					isSessionPlayable(
						curriculum,
						store.getState().progress,
						IMPLEMENTED_TEMPLATES,
					),
				).toBe(true);
				store.getState().beginSession();
				const run = store.getState().run;
				if (run === null) throw new Error("sin corrida");
				expect(run.unitId).toBe(unidad);
				for (const ex of run.exercises) {
					plantillas.add(ex.templateId);
					expect(templateViews[ex.templateId]).toBeDefined();
				}
			}
			expect(plantillas.has(esperada as TemplateId)).toBe(true);
		},
	);
});
