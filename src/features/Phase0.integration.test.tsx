// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	currentExercise,
	curriculum,
	type PlannedExercise,
	type TemplateId,
} from "@/engine";
import { TAP_SETTLE_MS } from "@/features/session/count-syllables/Evaluation";
import { EndScreen } from "@/features/session/EndScreen";
import { HEAR_OPTIONS } from "@/features/session/hear-it/parts";
import { SessionScreen } from "@/features/session/SessionScreen";
import {
	conProveedores,
	crearStore,
	fakeAudio,
	respuestaCorrecta,
} from "@/features/test-support";
import { createMemoryAdapter, type StorageAdapter } from "@/store";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const HECHA = "2026-09-25T10:00:00.000Z";

/** Un documento guardado con esas unidades ya dominadas, escrito a mano como lo dejaría el disco. */
function documentoCon(unidadesHechas: string[]) {
	const items: Record<string, unknown> = {};
	for (const id of unidadesHechas)
		for (const itemId of curriculum.units.get(id)?.introduces ?? [])
			items[itemId] = {
				box: 1,
				presented: true,
				firstTryCorrect: 3,
				assisted: 0,
				lastSessionIndex: 0,
				lastCreditSession: 0,
				masteredAt: HECHA,
			};
	return {
		version: 1,
		settings: {
			accent: "neutro",
			lowercaseTracing: false,
			sessionLength: 5,
			speechMode: "parent",
			reducedCelebrations: false,
			childName: null,
			pinHash: null,
		},
		items,
		units: {},
		sessionCounter: unidadesHechas.length === 0 ? 0 : 1,
		counters: { traces: 0, sessions: 0, voiceOk: 0, wordsRead: 0 },
		sessions: [],
		rewards: {
			unlockedAt: {},
			equipped: { background: null, companion: null, trail: null },
		},
	};
}

type Guardado = {
	sessionCounter: number;
	items: Record<string, { presented: boolean; assisted: number }>;
	sessions: { index: number; unitId: string | null; stars: number }[];
};

/** La pantalla de sesión y, al terminar, la del fin: lo que monta `App` sin mapa ni inicio. */
function Flujo(props: { onExit: () => void }) {
	const [fin, setFin] = useState(false);
	return fin ? (
		<EndScreen onDone={() => {}} />
	) : (
		<SessionScreen
			onEnd={() => setFin(true)}
			onExit={props.onExit}
			celebrationMs={0}
		/>
	);
}

/** El nombre accesible del botón de una opción, tal como lo pintan las vistas reales. */
function etiqueta(templateId: TemplateId, id: string): string {
	if (templateId === "hear-it")
		return HEAR_OPTIONS.find((o) => o.id === id)?.label ?? id;
	return curriculum.items.get(id)?.text ?? id;
}

const opcionesDe = (ex: PlannedExercise): string[] =>
	ex.templateId === "hear-it" ? HEAR_OPTIONS.map((o) => o.id) : ex.optionIds;

const habilitado = (b: HTMLElement) =>
	b.getAttribute("aria-disabled") !== "true";

type Resultado = {
	store: ReturnType<typeof crearStore>;
	adapter: StorageAdapter;
	audio: ReturnType<typeof fakeAudio>;
	onExit: ReturnType<typeof vi.fn>;
	container: HTMLElement;
	/** Los números de intento en los que se falló a propósito, en orden. */
	fallos: number[];
	/** Cuántas veces se completó el modelo con el niño tocando. */
	modelos: number;
	evaluaciones: number;
	plantillas: Set<TemplateId>;
};

/**
 * Juega una sesión entera con las vistas REALES: toca lo que toca el niño (el tambor, las
 * imágenes, sí/no, «siguiente») y contesta con lo que el motor da por bueno. Con `fallar`, la
 * primera evaluación se falla en los tres intentos y se completa el modelo, que es lo que hace
 * un niño que no sabe la respuesta.
 */
async function jugarSesion(
	documento: unknown,
	opciones: { fallar: boolean },
): Promise<Resultado> {
	const adapter = createMemoryAdapter(documento);
	const store = crearStore(adapter);
	await store.getState().load();
	store.getState().beginSession();
	const audio = fakeAudio();
	const onExit = vi.fn();
	const { container } = render(
		conProveedores(store, audio, <Flujo onExit={onExit} />),
	);
	vi.useFakeTimers();
	const pasar = (ms: number) =>
		act(async () => {
			await vi.advanceTimersByTimeAsync(ms);
		});

	const resultado: Resultado = {
		store,
		adapter,
		audio,
		onExit,
		container,
		fallos: [],
		modelos: 0,
		evaluaciones: 0,
		plantillas: new Set(),
	};
	const hecho = new Set<string>();
	let objetivo: string | null = null;

	for (let vuelta = 0; vuelta < 300; vuelta++) {
		await pasar(100);
		if (container.querySelector('[data-screen="end"]') !== null)
			return resultado;
		const run = store.getState().run;
		if (run === null) continue;
		const ex = currentExercise(run);
		if (ex === null) continue;
		const item = curriculum.items.get(ex.itemId);
		if (item === undefined) throw new Error(`Ítem desconocido ${ex.itemId}`);
		const llave = `${ex.id}|${run.attempt.attempt}|${run.attempt.resolved}`;
		if (hecho.has(llave)) continue;

		if (ex.kind === "presentation") {
			// Unas presentaciones acaban en «siguiente»; la de sí/no, tocando el botón marcado.
			const boton =
				screen.queryByRole("button", { name: "Siguiente" }) ??
				container.querySelector<HTMLElement>(
					'button[data-state="marked"]:not([aria-disabled="true"])',
				);
			if (boton === null) continue;
			hecho.add(llave);
			fireEvent.click(boton);
			continue;
		}

		resultado.plantillas.add(ex.templateId);
		if (objetivo === null) {
			objetivo = ex.id;
			resultado.evaluaciones++;
		}
		const enModelo = run.attempt.resolved;
		const esObjetivo = opciones.fallar && ex.id === objetivo;
		const correcta = respuestaCorrecta({ exercise: ex, item });

		if (ex.templateId === "count-syllables") {
			const tambor = screen.queryByRole("button", { name: "Tambor" });
			if (tambor === null) continue;
			if (enModelo) {
				// El tercer fallo llegó como `assisted`: el niño toca el tambor una vez por sílaba.
				if (run.resolutions.at(-1)?.status !== "assisted") continue;
				hecho.add(llave);
				for (let t = 0; t < (item.syllables?.length ?? 0); t++)
					fireEvent.click(tambor);
				resultado.modelos++;
				continue;
			}
			hecho.add(llave);
			const toques = esObjetivo
				? Number(correcta) === 1
					? 2
					: 1
				: Number(correcta);
			if (esObjetivo) resultado.fallos.push(run.attempt.attempt);
			for (let t = 0; t < toques; t++) fireEvent.click(tambor);
			await pasar(TAP_SETTLE_MS);
			continue;
		}

		// Plantillas de elección: imágenes o sí/no.
		if (enModelo) {
			if (run.resolutions.at(-1)?.status !== "assisted") continue;
			const marcado = container.querySelector<HTMLElement>(
				'button[data-state="marked"]',
			);
			if (marcado === null) continue;
			hecho.add(llave);
			fireEvent.click(marcado);
			resultado.modelos++;
			continue;
		}
		const elegida = esObjetivo
			? opcionesDe(ex).find(
					(id) =>
						id !== correcta &&
						habilitado(
							screen.getByRole("button", { name: etiqueta(ex.templateId, id) }),
						),
				)
			: correcta;
		if (elegida === undefined) throw new Error("No hay opción errónea a tocar");
		hecho.add(llave);
		if (esObjetivo) resultado.fallos.push(run.attempt.attempt);
		fireEvent.click(
			screen.getByRole("button", { name: etiqueta(ex.templateId, elegida) }),
		);
	}
	throw new Error("La sesión no terminó en 300 vueltas");
}

async function guardado(adapter: StorageAdapter): Promise<Guardado> {
	return (await adapter.read()) as Guardado;
}

const PREVIAS: Record<string, string[]> = {
	"phase0:clap": [],
	"phase0:rhyme": ["phase0:clap"],
	"phase0:initial": ["phase0:clap", "phase0:rhyme"],
	"phase0:hear-it": ["phase0:clap", "phase0:rhyme", "phase0:initial"],
};
const PLANTILLA: Record<string, TemplateId> = {
	"phase0:clap": "count-syllables",
	"phase0:rhyme": "rhyme",
	"phase0:initial": "initial-sound",
	"phase0:hear-it": "hear-it",
};

describe("la Fase 0 de punta a punta, con el motor, el store y las vistas reales", () => {
	it.each(["phase0:rhyme", "phase0:initial", "phase0:hear-it"])(
		"%s con las anteriores hechas: la sesión llega a EndScreen y queda guardada",
		async (unidad) => {
			const previas = PREVIAS[unidad] ?? [];
			const documento = documentoCon(previas);
			const r = await jugarSesion(documento, { fallar: false });
			expect(r.store.getState().summary).not.toBeNull();
			expect(screen.getByRole("img", { name: /estrella/ })).toBeDefined();
			expect(r.onExit).not.toHaveBeenCalled();
			expect(r.evaluaciones).toBeGreaterThan(0);
			expect(r.plantillas.has(PLANTILLA[unidad] as TemplateId)).toBe(true);
			expect(r.audio.play).toHaveBeenCalledWith({
				key: `instruction:${PLANTILLA[unidad]}`,
			});
			// Acertando a la primera no hay pistas ni modelo.
			expect(r.modelos).toBe(0);
			const disco = await guardado(r.adapter);
			expect(disco.sessionCounter).toBe(2);
			expect(disco.sessions).toHaveLength(1);
			expect(disco.sessions[0]?.unitId).toBe(unidad);
			expect(disco.sessions[0]?.stars).toBe(r.store.getState().summary?.stars);
			const nuevos = (curriculum.units.get(unidad)?.introduces ?? []).filter(
				(id) => !(id in (documento.items as Record<string, unknown>)),
			);
			expect(nuevos.some((id) => disco.items[id]?.presented === true)).toBe(
				true,
			);
		},
		30_000,
	);

	it.each(["phase0:clap", "phase0:rhyme", "phase0:initial", "phase0:hear-it"])(
		"%s: un fallo en cada rung hasta el modelo acaba igual, en EndScreen y con la sesión guardada",
		async (unidad) => {
			const documento = documentoCon(PREVIAS[unidad] ?? []);
			const r = await jugarSesion(documento, { fallar: true });
			// Tres fallos: el del rung 1, el del 2 y el del modelo; y el modelo lo completa el niño.
			expect(r.fallos).toEqual([1, 2, 3]);
			expect(r.modelos).toBe(1);
			expect(r.store.getState().summary).not.toBeNull();
			expect(screen.getByRole("img", { name: /estrella/ })).toBeDefined();
			expect(r.onExit).not.toHaveBeenCalled();
			const disco = await guardado(r.adapter);
			expect(disco.sessions).toHaveLength(1);
			expect(disco.sessions[0]?.unitId).toBe(unidad);
			expect(disco.sessionCounter).toBe(documento.sessionCounter + 1);
			// El fallo quedó anotado como ayuda y no dejó la sesión a medias.
			const ayudados = Object.values(disco.items).filter((i) => i.assisted > 0);
			expect(ayudados).toHaveLength(1);
		},
		30_000,
	);
});
