// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParentPanel } from "@/features/adult/ParentPanel";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";
import { importState } from "@/store";

afterEach(cleanup);

async function montar() {
	const store = crearStore();
	await store.getState().load();
	const download = vi.fn();
	const onClose = vi.fn();
	const onChangePin = vi.fn();
	render(
		conProveedores(
			store,
			fakeAudio(),
			<ParentPanel
				download={download}
				onClose={onClose}
				onChangePin={onChangePin}
				now={() => new Date(2026, 8, 26, 12, 0, 0)}
			/>,
		),
	);
	// Deja resolver el `pickEvaluator` de "Evaluador activo" antes de cada aserción, para no
	// dejar un `act()` pendiente entre tests.
	await screen.findByText(/Evaluador activo/);
	return { store, download, onClose, onChangePin };
}

describe("ParentPanel", () => {
	it("estructura: dos secciones con encabezado, Ajustes y Datos, dentro de un diálogo con Cerrar", async () => {
		await montar();
		expect(
			screen.getByRole("dialog", { name: "Panel de padres" }),
		).toBeDefined();
		expect(screen.getByRole("heading", { name: "Ajustes" })).toBeDefined();
		expect(screen.getByRole("heading", { name: "Datos" })).toBeDefined();
		expect(screen.getByRole("button", { name: "Cerrar" })).toBeDefined();
	});

	it("N7: cambiar la longitud de sesión a 6 actualiza doc.settings.sessionLength", async () => {
		const { store } = await montar();
		fireEvent.change(screen.getByLabelText("Longitud de la sesión"), {
			target: { value: "6" },
		});
		await vi.waitFor(() =>
			expect(store.getState().doc.settings.sessionLength).toBe(6),
		);
	});

	it("N7: activar el trazo de minúsculas deja lowercaseTracing en true", async () => {
		const { store } = await montar();
		fireEvent.click(screen.getByLabelText("Trazo de minúsculas"));
		await vi.waitFor(() =>
			expect(store.getState().doc.settings.lowercaseTracing).toBe(true),
		);
	});

	it("N7: el nombre '  Ana  ' se guarda recortado, y vacío guarda null (mutación: nombre sin recortar)", async () => {
		const { store } = await montar();
		const campo = screen.getByLabelText("Nombre del niño");
		fireEvent.change(campo, { target: { value: "  Ana  " } });
		await vi.waitFor(() =>
			expect(store.getState().doc.settings.childName).toBe("Ana"),
		);

		fireEvent.change(campo, { target: { value: "" } });
		await vi.waitFor(() =>
			expect(store.getState().doc.settings.childName).toBeNull(),
		);
	});

	it("N9: Exportar llama a download con el nombre de exportFilename y el JSON que importState acepta", async () => {
		const { store, download } = await montar();
		fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
		expect(download).toHaveBeenCalledTimes(1);
		const [nombre, json] = download.mock.calls[0] as [string, string];
		expect(nombre).toBe("silabin-progreso-2026-09-26.json");
		const resultado = importState(json);
		expect(resultado.ok).toBe(true);
		if (!resultado.ok) throw new Error("se esperaba ok");
		expect(resultado.state).toEqual(store.getState().doc);
	});

	it("N8 (acento): cambiar el acento en el panel llama a updateSettings con el nuevo acento", async () => {
		const { store } = await montar();
		fireEvent.change(screen.getByLabelText("Acento"), {
			target: { value: "mx" },
		});
		await vi.waitFor(() =>
			expect(store.getState().doc.settings.accent).toBe("mx"),
		);
	});

	it("Cambiar PIN llama a onChangePin", async () => {
		const { onChangePin } = await montar();
		fireEvent.click(screen.getByRole("button", { name: "Cambiar PIN" }));
		expect(onChangePin).toHaveBeenCalledTimes(1);
	});

	it("Cerrar llama a onClose", async () => {
		const { onClose } = await montar();
		fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("Escape cierra el panel ya autenticado, igual que el resto de diálogos de la puerta", async () => {
		const { onClose } = await montar();
		await userEvent.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("D7: con el diálogo de reiniciar abierto, Escape lo cancela y no cierra el panel", async () => {
		const { onClose } = await montar();
		await userEvent.click(
			screen.getByRole("button", { name: "Reiniciar todo" }),
		);
		expect(screen.getByRole("alertdialog")).toBeDefined();

		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
	});
});
