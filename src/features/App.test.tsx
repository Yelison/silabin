// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AudioPlayer, createSpeechPlayer } from "@/audio";
import { asSynth, FakeSynth, FakeUtterance } from "@/audio/fake-synth";
import { curriculum } from "@/engine";
import { App } from "@/features/App";
import { TAP_SETTLE_MS } from "@/features/session/count-syllables/Evaluation";
import { templateViews } from "@/features/session/registry";
import { crearStore, fakeAudio, vistasFalsas } from "@/features/test-support";
import { createMemoryAdapter, type Settings } from "@/store";

// Las vistas reales de la plantilla, para devolverlas tras cada test que las sustituye.
const vistasReales = templateViews["count-syllables"];
if (vistasReales === undefined)
	throw new Error("count-syllables debe estar registrada");

// Salvo el test de integración (C12), la sesión se prueba con vistas falsas.
beforeEach(() => {
	templateViews["count-syllables"] = vistasFalsas().views;
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	templateViews["count-syllables"] = vistasReales;
});

const iniciar = () => screen.findByRole("button", { name: "Empezar" });

describe("App", () => {
	it("U1: se ve el botón de inicio, sin texto, y nada ha sonado", async () => {
		const audio = fakeAudio();
		const { container } = render(<App store={crearStore()} audio={audio} />);
		const boton = await iniciar();
		expect(boton.textContent).toBe("▶");
		expect(container.querySelector("[data-unit]")).toBeNull();
		expect(audio.play).not.toHaveBeenCalled();
		expect(audio.beat).not.toHaveBeenCalled();
		expect(audio.unlock).not.toHaveBeenCalled();
	});

	it("no pinta nada hasta que el store ha cargado", () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		// Antes de que la promesa de load() resuelva no hay nada que enseñar.
		expect(container.innerHTML).toBe("");
	});

	it("U2: tocar el inicio llama a unlock dentro del gesto y enseña el mapa con phase0:clap activa", async () => {
		const audio = fakeAudio();
		const { container } = render(<App store={crearStore()} audio={audio} />);
		fireEvent.click(await iniciar());
		// Síncrono, sin esperar: unlock debe ir dentro del gesto de toque.
		expect(audio.unlock).toHaveBeenCalledTimes(1);
		expect(audio.play).not.toHaveBeenCalled();
		// El mapa aparece tras comprobar el Service Worker (S11): ya no es síncrono.
		await waitFor(() => {
			const clap = container.querySelector('[data-unit="phase0:clap"]');
			expect(clap?.getAttribute("data-status")).toBe("active");
		});
		expect(screen.queryByRole("button", { name: "Empezar" })).toBeNull();
	});

	it("tocar la unidad activa jugable abre la sesión y crea la corrida", async () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		expect(store.getState().run).not.toBeNull();
		expect(container.querySelector("[data-unit]")).toBeNull();
		expect(container.querySelector('[data-screen="session"]')).not.toBeNull();
	});

	it("desde la sesión, mantener la esquina 1,5 s vuelve al mapa sin dejar la corrida abierta", async () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		vi.useFakeTimers();
		fireEvent.pointerDown(screen.getByRole("button", { name: /salir/i }));
		act(() => {
			vi.advanceTimersByTime(1500);
		});
		expect(store.getState().run).toBeNull();
		expect(container.querySelector('[data-unit="phase0:clap"]')).not.toBeNull();
	});

	it("sin vista registrada para la plantilla, la sesión vuelve al mapa sin dejar la corrida abierta", async () => {
		delete templateViews["count-syllables"];
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		await waitFor(() =>
			expect(
				container.querySelector('[data-unit="phase0:clap"]'),
			).not.toBeNull(),
		);
		expect(store.getState().run).toBeNull();
	});

	it("E7: al resolver la última evaluación aparece el fin con las estrellas del resumen, y un toque vuelve al mapa", async () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		for (let i = 0; i < 30; i++) {
			if (container.querySelector('[data-screen="end"]') !== null) break;
			const listo = screen.queryByRole("button", { name: "listo" });
			const bien = screen.queryByRole("button", { name: "bien" });
			const cursor = store.getState().run?.cursor;
			if (listo !== null) await user.click(listo);
			else if (bien !== null) await user.click(bien);
			await waitFor(() =>
				expect(
					container.querySelector('[data-screen="end"]') !== null ||
						store.getState().run?.cursor !== cursor,
				).toBe(true),
			);
		}
		const resumen = store.getState().summary;
		expect(resumen?.stars).toBe(3);
		expect(container.querySelector('[data-screen="end"]')).not.toBeNull();
		expect(screen.getByRole("img", { name: "3 estrellas" })).toBeDefined();
		expect(container.querySelector('[data-screen="session"]')).toBeNull();

		await user.click(screen.getByRole("button", { name: "Continuar" }));
		expect(store.getState().summary).toBeNull();
		expect(container.querySelector('[data-screen="end"]')).toBeNull();
		expect(container.querySelector('[data-unit="phase0:clap"]')).not.toBeNull();
	});

	it("el aviso del adulto también se ve en la pantalla de inicio", async () => {
		const store = crearStore();
		render(<App store={store} audio={fakeAudio()} />);
		await iniciar();
		expect(
			screen.queryByRole("button", { name: /progreso guardado/i }),
		).toBeNull();
		store.setState({ saveFailed: true });
		expect(
			await screen.findByRole("button", { name: /progreso guardado/i }),
		).toBeDefined();
	});

	it("C12: una sesión completa de phase0:clap con las vistas reales, tocando el tambor lo que pide cada palabra, acaba con 3 estrellas y la sesión guardada", async () => {
		templateViews["count-syllables"] = vistasReales;
		const adapter = createMemoryAdapter();
		const store = crearStore(adapter);
		const audio = fakeAudio();
		const { container } = render(<App store={store} audio={audio} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		vi.useFakeTimers();
		const pasar = (ms: number) =>
			act(async () => {
				await vi.advanceTimersByTimeAsync(ms);
			});
		let evaluaciones = 0;
		for (let i = 0; i < 40; i++) {
			await pasar(100);
			if (container.querySelector('[data-screen="end"]') !== null) break;
			const siguiente = screen.queryByRole("button", { name: "Siguiente" });
			const tambor = screen.queryByRole("button", { name: "Tambor" });
			if (siguiente !== null) fireEvent.click(siguiente);
			else if (tambor !== null) {
				const run = store.getState().run;
				const ejercicio = run?.exercises[run.cursor];
				const respuesta =
					ejercicio && curriculum.items.get(ejercicio.itemId)?.task?.answer;
				for (let t = 0; t < Number(respuesta); t++) fireEvent.click(tambor);
				evaluaciones++;
				await pasar(TAP_SETTLE_MS);
			}
			// La celebración del acierto y el guardado del ejercicio.
			await pasar(1000);
		}
		expect(evaluaciones).toBeGreaterThan(0);
		expect(container.querySelector('[data-screen="end"]')).not.toBeNull();
		expect(store.getState().summary?.stars).toBe(3);
		expect(screen.getByRole("img", { name: "3 estrellas" })).toBeDefined();
		const guardado = (await adapter.read()) as {
			sessionCounter: number;
			items: Record<string, { presented: boolean }>;
		};
		expect(guardado.sessionCounter).toBe(1);
		expect(Object.values(guardado.items).some((it) => it.presented)).toBe(true);
		expect(audio.beat).toHaveBeenCalled();
	});

	it("N9: mantener el logo del mapa 3 s abre la puerta del panel, y Volver regresa al mapa", async () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		vi.useFakeTimers();
		try {
			fireEvent.pointerDown(screen.getByText("Silabín"));
			act(() => {
				vi.advanceTimersByTime(3000);
			});
			expect(
				screen.getByRole("dialog", { name: "Entrada al panel de padres" }),
			).toBeDefined();
			fireEvent.click(screen.getByRole("button", { name: "Volver" }));
			expect(
				screen.queryByRole("dialog", { name: "Entrada al panel de padres" }),
			).toBeNull();
			expect(
				container.querySelector('[data-unit="phase0:clap"]'),
			).not.toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it("N8: cambiar el acento en el panel de padres no recrea el reproductor y el desbloqueado sigue hablando con el acento nuevo", async () => {
		vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
		const fakeSynth = new FakeSynth();
		const store = crearStore();
		// El reproductor real, no `props.audio`: inyectarlo desactivaría justo el camino que falló (I9).
		const fabrica = vi.fn((getAccent: () => Settings["accent"]) =>
			createSpeechPlayer({
				synth: asSynth(fakeSynth),
				accent: getAccent,
				beat: vi.fn(),
			}),
		);
		render(<App store={store} audioFactory={fabrica} />);
		const user = userEvent.setup();
		// Camino real del `unlock`: el toque de `StartScreen`.
		await user.click(await iniciar());
		expect(fakeSynth.spoken.map((u) => u.text)).toEqual([""]);

		await act(async () => {
			await store.getState().updateSettings({ accent: "mx" });
		});

		const reproductor = fabrica.mock.results[0]?.value as AudioPlayer;
		void reproductor.play({ key: "word:mesa" });
		await waitFor(() => expect(fakeSynth.spoken).toHaveLength(2));
		expect(fabrica).toHaveBeenCalledTimes(1);
		expect(fakeSynth.spoken[1]?.lang).toMatch(/^es-MX/);
	});

	it("el fondo cosmético envuelve el mapa y la galería, pero nunca la sesión", async () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		// En el mapa, el fondo cosmético está presente.
		expect(
			container.querySelector("[data-cosmetic-background]"),
		).not.toBeNull();

		await user.click(screen.getByRole("button", { name: "Mis premios" }));
		// En la galería también.
		expect(
			container.querySelector("[data-cosmetic-background]"),
		).not.toBeNull();
		await user.click(screen.getByRole("button", { name: "Volver al mapa" }));

		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		// Este es el hallazgo del revisor: si alguien envolviera SessionScreen con
		// CosmeticBackground, este `querySelector` dejaría de ser null y la prueba fallaría.
		expect(container.querySelector('[data-screen="session"]')).not.toBeNull();
		expect(container.querySelector("[data-cosmetic-background]")).toBeNull();
	});
});
