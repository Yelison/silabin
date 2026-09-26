// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SaveWarning } from "@/features/adult/SaveWarning";
import {
	adaptadorQueFalla,
	conProveedores,
	crearStore,
	fakeAudio,
} from "@/features/test-support";

afterEach(cleanup);

const TEXTO_SIN_GUARDAR =
	"El progreso no se está guardando en este dispositivo. Suele pasar en navegación privada o sin espacio libre. Exporta el progreso para no perderlo.";
const TEXTO_RECUPERADO =
	"Una parte del progreso guardado estaba dañada y se ha recuperado lo que se pudo.";

const TEXTO_SIN_LEER =
	"No se ha podido leer el progreso guardado en este dispositivo. Por ahora no se guarda nada nuevo, para no borrar lo que haya. Pulsa Reintentar o vuelve a abrir la aplicación. Exporta el progreso para no perderlo.";

function aviso() {
	return screen.queryByRole("button", { name: /progreso/i });
}

describe("SaveWarning", () => {
	it("no se ve mientras todo va bien", async () => {
		const store = crearStore();
		await store.getState().load();
		render(conProveedores(store, fakeAudio(), <SaveWarning />));
		expect(aviso()).toBeNull();
	});

	it("U4: aparece cuando falla el guardado de una sesión y desaparece tras un guardado bueno", async () => {
		const { adapter, fallo } = adaptadorQueFalla();
		const store = crearStore(adapter);
		await store.getState().load();
		render(conProveedores(store, fakeAudio(), <SaveWarning />));
		expect(aviso()).toBeNull();

		fallo.activo = true;
		store.getState().beginSession();
		await store.getState().presentationDone();
		await waitFor(() => expect(aviso()).not.toBeNull());

		// El guardado sigue fallando: reintentar no lo oculta.
		const user = userEvent.setup();
		await user.click(aviso() as HTMLElement);
		await user.click(screen.getByRole("button", { name: "Reintentar" }));
		expect(aviso()).not.toBeNull();

		// Vuelve el disco: un guardado bueno lo oculta.
		fallo.activo = false;
		await user.click(screen.getByRole("button", { name: "Reintentar" }));
		await waitFor(() => expect(aviso()).toBeNull());
		expect(store.getState().saveFailed).toBe(false);
	});

	it("el panel del guardado fallido lleva el texto exacto, Reintentar y Cerrar", async () => {
		const store = crearStore();
		await store.getState().load();
		store.setState({ saveFailed: true });
		render(conProveedores(store, fakeAudio(), <SaveWarning />));
		const user = userEvent.setup();
		expect(screen.queryByText(TEXTO_SIN_GUARDAR)).toBeNull();
		await user.click(screen.getByRole("button", { name: /progreso/i }));
		expect(screen.getByText(TEXTO_SIN_GUARDAR)).toBeDefined();
		expect(screen.queryByText(TEXTO_RECUPERADO)).toBeNull();
		await user.click(screen.getByRole("button", { name: "Cerrar" }));
		expect(screen.queryByText(TEXTO_SIN_GUARDAR)).toBeNull();
		// Cerrar el panel no quita el aviso: el problema sigue ahí.
		expect(aviso()).not.toBeNull();
	});

	it("si el guardado se recupera con el panel abierto y falla otra vez, vuelve solo el icono, no el panel", async () => {
		const store = crearStore();
		await store.getState().load();
		store.setState({ saveFailed: true });
		render(conProveedores(store, fakeAudio(), <SaveWarning />));
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /progreso/i }));
		expect(screen.getByRole("dialog")).toBeDefined();

		act(() => store.setState({ saveFailed: false }));
		expect(aviso()).toBeNull();
		expect(screen.queryByRole("dialog")).toBeNull();

		act(() => store.setState({ saveFailed: true }));
		expect(aviso()).not.toBeNull();
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("con recovered muestra su propio texto, sin el del guardado", async () => {
		const store = crearStore();
		await store.getState().load();
		store.setState({ recovered: true });
		render(conProveedores(store, fakeAudio(), <SaveWarning />));
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /progreso/i }));
		expect(screen.getByText(TEXTO_RECUPERADO)).toBeDefined();
		expect(screen.queryByText(TEXTO_SIN_GUARDAR)).toBeNull();
	});

	it("con la lectura fallida se avisa aunque saveFailed aún sea false, con su texto y sin el de recuperado", async () => {
		const store = crearStore();
		await store.getState().load();
		store.setState({ readFailed: true, recovered: true, saveFailed: false });
		render(conProveedores(store, fakeAudio(), <SaveWarning />));
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /progreso/i }));
		expect(screen.getByText(TEXTO_SIN_LEER)).toBeDefined();
		expect(screen.queryByText(TEXTO_RECUPERADO)).toBeNull();
		expect(screen.queryByText(TEXTO_SIN_GUARDAR)).toBeNull();
		expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
	});

	it("con recovered y sin la marca de lectura fallida sigue mostrando el texto de recuperado", async () => {
		const store = crearStore();
		await store.getState().load();
		store.setState({ recovered: true, readFailed: false });
		render(conProveedores(store, fakeAudio(), <SaveWarning />));
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /progreso/i }));
		expect(screen.getByText(TEXTO_RECUPERADO)).toBeDefined();
		expect(screen.queryByText(TEXTO_SIN_LEER)).toBeNull();
	});

	it("el icono es gris: ni rojo ni aspa", async () => {
		const store = crearStore();
		await store.getState().load();
		store.setState({ saveFailed: true });
		const { container } = render(
			conProveedores(store, fakeAudio(), <SaveWarning />),
		);
		const html = container.innerHTML.toLowerCase();
		expect(html).not.toMatch(
			/(text|bg|border|stroke|fill)-(red|rose|orange|amber)|#f00\b|#ff0000|\bred\b|✕|✗|❌|⚠/,
		);
		expect(html).toMatch(/gray|grey/);
	});
});
