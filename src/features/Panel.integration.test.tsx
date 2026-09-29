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
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentExercise } from "@/engine";
import { App } from "@/features/App";
import { PANEL_HOLD_MS } from "@/features/adult/AdultDoor";
import { DataSection } from "@/features/adult/DataSection";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

/**
 * Z1-Z3 (Tarea 11): el recorrido del adulto con el store y las vistas reales (sin vistas
 * falsas de plantilla) y el adaptador en memoria.
 */

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

/** Mantiene pulsado el logo lo que pide la puerta del adulto. */
function mantenerLogo() {
	vi.useFakeTimers();
	fireEvent.pointerDown(screen.getByRole("heading", { name: "Silabín" }));
	act(() => {
		vi.advanceTimersByTime(PANEL_HOLD_MS);
	});
	vi.useRealTimers();
}

/** Un documento con progreso real: se presenta el primer ejercicio de una sesión. */
async function storeConProgreso() {
	const store = crearStore();
	await store.getState().load();
	store.getState().beginSession();
	const run = store.getState().run;
	if (run === null || currentExercise(run)?.kind !== "presentation")
		throw new Error("se esperaba una presentación como primer ejercicio");
	await store.getState().presentationDone();
	return store;
}

const archivo = (json: string) =>
	new File([json], "silabin.json", { type: "application/json" });

describe("Panel de padres: integración", () => {
	it("Z1: mapa, puerta, crear PIN, sesión de 6 y empezar: la sesión tiene 6 pasos", async () => {
		const store = crearStore();
		const { container } = render(<App store={store} audio={fakeAudio()} />);
		const user = userEvent.setup();
		await user.click(await screen.findByRole("button", { name: "Empezar" }));
		await waitFor(() =>
			expect(container.querySelector("[data-unit]")).not.toBeNull(),
		);

		mantenerLogo();

		// Primer uso: PIN y confirmación.
		const campo = () => screen.getByLabelText(/PIN/i);
		await user.type(await waitFor(campo), "1234");
		await user.type(campo(), "1234");
		const panel = await screen.findByRole("dialog", {
			name: "Panel de padres",
		});
		expect(store.getState().doc.settings.pinHash).not.toBeNull();

		await user.selectOptions(
			screen.getByLabelText("Longitud de la sesión"),
			"6",
		);
		await waitFor(() =>
			expect(store.getState().doc.settings.sessionLength).toBe(6),
		);

		await user.click(screen.getByRole("button", { name: "Cerrar" }));
		expect(panel.isConnected).toBe(false);

		await user.click(
			container.querySelector('[data-unit="phase0:clap"]') as HTMLElement,
		);
		const run = store.getState().run;
		expect(run).not.toBeNull();
		expect(run?.exercises).toHaveLength(6);
	});

	it("Z2: exportar y luego importar ese JSON sobre un documento vacío devuelve el progreso", async () => {
		const origen = await storeConProgreso();
		origen.getState().abandonSession();
		const docOrigen = origen.getState().doc;
		expect(Object.keys(docOrigen.items).length).toBeGreaterThan(0);

		const download = vi.fn();
		render(
			conProveedores(
				origen,
				fakeAudio(),
				<DataSection download={download} now={() => new Date(2026, 8, 28)} />,
			),
		);
		await userEvent.click(screen.getByRole("button", { name: "Exportar" }));
		const [, json] = download.mock.calls[0] as [string, string];
		cleanup();

		const destino = crearStore();
		await destino.getState().load();
		expect(destino.getState().doc.items).toEqual({});
		render(
			conProveedores(
				destino,
				fakeAudio(),
				<DataSection download={vi.fn()} now={() => new Date(2026, 8, 28)} />,
			),
		);
		await userEvent.upload(screen.getByLabelText("Importar"), archivo(json));
		await userEvent.click(
			await screen.findByRole("button", {
				name: "Sustituir el progreso actual",
			}),
		);
		await screen.findByText("Progreso importado");
		expect(destino.getState().doc).toEqual(docOrigen);
	});

	it("Z3: importar {} se rechaza y no cambia nada", async () => {
		const store = await storeConProgreso();
		store.getState().abandonSession();
		const antes = store.getState().doc;
		render(
			conProveedores(
				store,
				fakeAudio(),
				<DataSection download={vi.fn()} now={() => new Date(2026, 8, 28)} />,
			),
		);
		await userEvent.upload(screen.getByLabelText("Importar"), archivo("{}"));
		expect(await screen.findByText(/dañada|otra versión/)).toBeDefined();
		expect(
			screen.queryByRole("button", { name: "Sustituir el progreso actual" }),
		).toBeNull();
		expect(store.getState().doc).toBe(antes);
	});
});
