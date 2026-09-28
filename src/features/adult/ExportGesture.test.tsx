// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	downloadInBrowser,
	ExportGesture,
	exportFilename,
} from "@/features/adult/ExportGesture";
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
		const resultado = importState(json);
		expect(resultado.ok).toBe(true);
		if (!resultado.ok) throw new Error("se esperaba ok");
		expect(resultado.state).toEqual(store.getState().doc);
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
		const resultado = importState(json);
		expect(resultado.ok).toBe(true);
		if (!resultado.ok) throw new Error("se esperaba ok");
		expect(resultado.state).toEqual(store.getState().doc);
	});

	it("un toque corto no hace nada visible: el logo no es un botón para el niño", async () => {
		const { logo, download } = await montar();
		expect(screen.queryByRole("button")).toBeNull();
		fireEvent.click(logo);
		expect(download).not.toHaveBeenCalled();
	});

	it("el nombre lleva la fecha local con ceros", () => {
		expect(exportFilename(new Date(2026, 0, 5, 23, 59))).toBe(
			"silabin-progreso-2026-01-05.json",
		);
	});

	describe("downloadInBrowser", () => {
		it("pulsa un enlace con el nombre y revoca la URL después, no dentro del clic", () => {
			const crear = vi.fn(() => "blob:silabin");
			const revocar = vi.fn();
			vi.stubGlobal("URL", {
				createObjectURL: crear,
				revokeObjectURL: revocar,
			});
			let descargado: string | null = null;
			const clic = vi
				.spyOn(HTMLAnchorElement.prototype, "click")
				.mockImplementation(function (this: HTMLAnchorElement) {
					descargado = this.download;
				});
			try {
				downloadInBrowser("silabin-progreso-2026-09-26.json", "{}");
				expect(crear).toHaveBeenCalledTimes(1);
				expect(descargado).toBe("silabin-progreso-2026-09-26.json");
				// Safari y Firefox pueden cancelar la descarga si se revoca justo tras el clic.
				expect(revocar).not.toHaveBeenCalled();
				vi.advanceTimersByTime(60_000);
				expect(revocar).toHaveBeenCalledWith("blob:silabin");
				expect(document.querySelector("a[download]")).toBeNull();
			} finally {
				clic.mockRestore();
				vi.unstubAllGlobals();
			}
		});
	});
});
