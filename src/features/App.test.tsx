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
import { App } from "@/features/App";
import { templateViews } from "@/features/session/registry";
import { crearStore, fakeAudio, vistasFalsas } from "@/features/test-support";

// Hasta que la Tarea 8 registre las vistas reales, la sesión se prueba con vistas falsas.
beforeEach(() => {
	templateViews["count-syllables"] = vistasFalsas().views;
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	delete templateViews["count-syllables"];
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
		const clap = container.querySelector('[data-unit="phase0:clap"]');
		expect(clap?.getAttribute("data-status")).toBe("active");
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
});
