// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "@/features/App";
import { crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

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

	it("desde la sesión provisional se vuelve al mapa sin dejar la corrida abierta", async () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await iniciar());
		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		await user.click(screen.getByRole("button", { name: "Volver al mapa" }));
		expect(store.getState().run).toBeNull();
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
