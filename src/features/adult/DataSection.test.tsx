// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataSection } from "@/features/adult/DataSection";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";
import { importState } from "@/store";

afterEach(cleanup);

async function montar() {
	const store = crearStore();
	await store.getState().load();
	const download = vi.fn();
	render(
		conProveedores(
			store,
			fakeAudio(),
			<DataSection download={download} now={() => new Date(2026, 8, 28)} />,
		),
	);
	return { store, download };
}

function archivoValido(json: string): File {
	return new File([json], "silabin.json", { type: "application/json" });
}

describe("DataSection", () => {
	it("D3: exportar con childName lleva el nombre en el fichero", async () => {
		const { store, download } = await montar();
		store.setState((s) => ({
			doc: {
				...s.doc,
				settings: { ...s.doc.settings, childName: "Ana María" },
			},
		}));
		await userEvent.click(screen.getByRole("button", { name: "Exportar" }));
		expect(download).toHaveBeenCalledTimes(1);
		const [nombre] = download.mock.calls[0] as [string, string];
		expect(nombre).toBe("silabin-ana-maria-2026-09-28.json");
	});

	it("D4: importar un fichero válido muestra el resumen; Cancelar no importa; confirmar sí", async () => {
		const { store } = await montar();
		const docAntes = store.getState().doc;
		const otro = crearStore();
		await otro.getState().load();
		const json = otro.getState().exportJson();

		const input = screen.getByLabelText("Importar");
		await userEvent.upload(input, archivoValido(json));

		expect(await screen.findByText(/sesiones/)).toBeDefined();
		expect(
			screen.getByRole("button", { name: "Sustituir el progreso actual" }),
		).toBeDefined();

		// Mutación: sin pasar por la confirmación, importDoc no debe haberse llamado todavía
		// (la referencia de `doc` es exactamente la misma; importDoc siempre crea una nueva).
		expect(store.getState().doc).toBe(docAntes);

		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(
			screen.queryByRole("button", { name: "Sustituir el progreso actual" }),
		).toBeNull();
		// Cancelar no debe haber importado nada.
		expect(store.getState().doc).toBe(docAntes);

		// Vuelve a elegir el fichero y esta vez confirma.
		await userEvent.upload(input, archivoValido(json));
		await userEvent.click(
			await screen.findByRole("button", {
				name: "Sustituir el progreso actual",
			}),
		);
		await screen.findByText("Progreso importado");
		expect(store.getState().doc).not.toBe(docAntes);
		const resultado = importState(json);
		expect(resultado.ok).toBe(true);
		if (!resultado.ok) throw new Error("se esperaba ok");
		expect(store.getState().doc).toEqual({
			...resultado.state,
			settings: {
				...resultado.state.settings,
				pinHash: store.getState().doc.settings.pinHash,
			},
		});
	});

	it.each([
		[
			"json inválido",
			"no soy json",
			"El fichero no es una exportación de Silabín",
		],
		[
			"otra versión",
			JSON.stringify({ version: 99 }),
			"Esta exportación es de otra versión de Silabín",
		],
		[
			"esquema dañado",
			JSON.stringify({ version: 1, settings: {} }),
			"La exportación está dañada",
		],
	])(
		"D5: %s muestra su mensaje y no llama a importDoc",
		async (_nombre, contenido, mensaje) => {
			const { store } = await montar();
			const docAntes = store.getState().doc;
			const input = screen.getByLabelText("Importar");
			await userEvent.upload(input, archivoValido(contenido));

			expect(await screen.findByText(mensaje)).toBeDefined();
			expect(
				screen.queryByRole("button", { name: "Sustituir el progreso actual" }),
			).toBeNull();
			expect(store.getState().doc).toBe(docAntes);
		},
	);

	it("D6: un solo toque no borra; Cancelar no borra; la doble confirmación llama a resetAll", async () => {
		const { store } = await montar();
		const docAntes = store.getState().doc;

		await userEvent.click(
			screen.getByRole("button", { name: "Reiniciar todo" }),
		);
		// Un solo toque abre el diálogo, no borra nada todavía.
		expect(store.getState().doc).toBe(docAntes);
		expect(screen.getByRole("alertdialog")).toBeDefined();

		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(store.getState().doc).toBe(docAntes);

		await userEvent.click(
			screen.getByRole("button", { name: "Reiniciar todo" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Sí, borrar todo" }),
		);
		await vi.waitFor(() => expect(store.getState().doc).not.toBe(docAntes));
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("D6: con read-failed, el diálogo enseña el mensaje y no reinicia", async () => {
		const { store } = await montar();
		store.setState({ readFailed: true });
		const docAntes = store.getState().doc;

		await userEvent.click(
			screen.getByRole("button", { name: "Reiniciar todo" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Sí, borrar todo" }),
		);
		expect(
			await screen.findByText(
				"No se puede reiniciar: no se pudo leer el progreso guardado. Recarga la página.",
			),
		).toBeDefined();
		expect(store.getState().doc).toBe(docAntes);
	});

	it("D7: el foco entra en el diálogo de reiniciar y Escape lo cancela", async () => {
		await montar();
		await userEvent.click(
			screen.getByRole("button", { name: "Reiniciar todo" }),
		);
		const cancelar = screen.getByRole("button", { name: "Cancelar" });
		expect(document.activeElement).toBe(cancelar);

		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});
});
