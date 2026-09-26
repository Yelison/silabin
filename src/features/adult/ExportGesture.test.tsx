// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportGesture, exportFilename } from "@/features/adult/ExportGesture";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";
import { importState } from "@/store";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

async function montar() {
	const store = crearStore();
	await store.getState().load();
	const download = vi.fn();
	render(
		conProveedores(
			store,
			fakeAudio(),
			<ExportGesture
				download={download}
				now={() => new Date(2026, 8, 26, 12, 0, 0)}
			>
				<span>logo</span>
			</ExportGesture>,
		),
	);
	return { store, download, logo: screen.getByText("logo") };
}

function avanzar(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

describe("ExportGesture", () => {
	it("U5: 2,9 s y soltar no exporta; mantener 3 s exporta una vez, con JSON que importState acepta", async () => {
		const { store, download, logo } = await montar();

		fireEvent.pointerDown(logo);
		avanzar(2900);
		fireEvent.pointerUp(logo);
		avanzar(5000);
		expect(download).not.toHaveBeenCalled();

		fireEvent.pointerDown(logo);
		avanzar(2999);
		expect(download).not.toHaveBeenCalled();
		avanzar(1);
		expect(download).toHaveBeenCalledTimes(1);
		avanzar(10000);
		expect(download).toHaveBeenCalledTimes(1);

		const [nombre, json] = download.mock.calls[0] as [string, string];
		expect(nombre).toBe("silabin-progreso-2026-09-26.json");
		const { state, recovered } = importState(json);
		expect(recovered).toBe(false);
		expect(state).toEqual(store.getState().doc);
	});

	it("salir del logo con el puntero antes de los 3 s cancela", async () => {
		const { download, logo } = await montar();
		fireEvent.pointerDown(logo);
		avanzar(2000);
		fireEvent.pointerLeave(logo);
		avanzar(5000);
		expect(download).not.toHaveBeenCalled();
	});

	it("exporta lo último del store, no lo del montaje", async () => {
		const { store, download, logo } = await montar();
		store.getState().beginSession();
		await store.getState().presentationDone();
		fireEvent.pointerDown(logo);
		avanzar(3000);
		const [, json] = download.mock.calls[0] as [string, string];
		expect(importState(json).state).toEqual(store.getState().doc);
	});

	it("un toque corto no hace nada visible: el logo no es un botón para el niño", async () => {
		const { logo } = await montar();
		expect(screen.queryByRole("button")).toBeNull();
		fireEvent.click(logo);
	});

	it("el nombre lleva la fecha local con ceros", () => {
		expect(exportFilename(new Date(2026, 0, 5, 23, 59))).toBe(
			"silabin-progreso-2026-01-05.json",
		);
	});
});
