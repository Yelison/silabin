// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParentGate } from "@/features/adult/ParentGate";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

async function montar(opciones: { random?: () => number; pin?: string } = {}) {
	const store = crearStore();
	await store.getState().load();
	if (opciones.pin !== undefined) await store.getState().setPin(opciones.pin);
	const onClose = vi.fn();
	const download = vi.fn();
	render(
		conProveedores(
			store,
			fakeAudio(),
			<ParentGate
				onClose={onClose}
				download={download}
				{...(opciones.random !== undefined ? { random: opciones.random } : {})}
			/>,
		),
	);
	return { store, onClose, download };
}

const campoPin = () => screen.getByLabelText(/PIN/i) as HTMLInputElement;
const panelAbierto = () =>
	screen.findByRole("dialog", { name: "Panel de padres" });

describe("ParentGate", () => {
	it("N1: sin crypto.subtle sale el mensaje y Volver lleva al mapa", async () => {
		const original = globalThis.crypto;
		// `crypto` es de solo lectura en este entorno: hay que sustituirlo con vi.stubGlobal,
		// no con una asignación directa. Se simula un dispositivo sin conexión segura
		// (http://<ip-lan>), donde crypto.subtle no existe.
		vi.stubGlobal("crypto", { ...original, subtle: undefined });
		try {
			const { onClose } = await montar();
			expect(
				await screen.findByText(
					"El panel necesita una conexión segura (https)",
				),
			).toBeDefined();
			await userEvent.click(screen.getByRole("button", { name: "Volver" }));
			expect(onClose).toHaveBeenCalledTimes(1);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("N2: primer uso, dos PIN distintos no coinciden y no llaman a setPin; dos iguales sí y se ve el panel", async () => {
		const { store } = await montar();
		const setPin = vi.spyOn(store.getState(), "setPin");

		await userEvent.type(campoPin(), "1234");
		await userEvent.type(campoPin(), "5678");
		expect(await screen.findByText("No coinciden")).toBeDefined();
		expect(setPin).not.toHaveBeenCalled();

		await userEvent.type(campoPin(), "1234");
		await userEvent.type(campoPin(), "1234");
		await waitFor(() => expect(setPin).toHaveBeenCalledWith("1234"));
		expect(await panelAbierto()).toBeDefined();
	});

	it("N3: un PIN incorrecto no abre y vacía el campo; el correcto abre", async () => {
		await montar({ pin: "4321" });
		await userEvent.type(campoPin(), "0000");
		expect(await screen.findByText("PIN incorrecto")).toBeDefined();
		expect(campoPin().value).toBe("");

		await userEvent.type(campoPin(), "4321");
		expect(await panelAbierto()).toBeDefined();
	});

	it("N4: PIN olvidado: una respuesta mala no deja pasar y cambia la pregunta; la buena lleva a crear un PIN, sin tocar el progreso", async () => {
		const secuencia = [0, 0, 0.99, 0.99];
		let i = 0;
		const random = () => secuencia[i++] ?? 0;
		const { store } = await montar({ pin: "4321", random });
		const itemsAntes = store.getState().doc.items;

		await userEvent.click(
			screen.getByRole("button", { name: "¿Olvidaste el PIN?" }),
		);
		const primeraPregunta = (await screen.findByText(/¿Cuánto es/)).textContent;

		await userEvent.type(screen.getByLabelText("Respuesta"), "1");
		await userEvent.click(screen.getByRole("button", { name: "Comprobar" }));
		expect(await screen.findByText("Otra vez")).toBeDefined();
		const segundaPregunta = (await screen.findByText(/¿Cuánto es/)).textContent;
		expect(segundaPregunta).not.toBe(primeraPregunta);

		const match = /(\d+) × (\d+)/.exec(segundaPregunta ?? "");
		const [, aTexto, bTexto] = match as RegExpExecArray;
		const respuestaBuena = Number(aTexto) * Number(bTexto);

		await userEvent.type(
			screen.getByLabelText("Respuesta"),
			String(respuestaBuena),
		);
		await userEvent.click(screen.getByRole("button", { name: "Comprobar" }));
		expect(await screen.findByText("Crea un PIN de 4 números")).toBeDefined();
		expect(store.getState().doc.items).toBe(itemsAntes);
	});

	it("N6: se usa entero con teclado: Tab llega al campo, a ¿Olvidaste…? y a Volver; Escape vuelve", async () => {
		const { onClose } = await montar({ pin: "4321" });
		const user = userEvent.setup();

		await user.tab();
		expect(document.activeElement).toBe(campoPin());
		await user.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "¿Olvidaste el PIN?" }),
		);
		await user.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Volver" }),
		);

		await user.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("I2: «Cambiar PIN» del panel lleva a crear un PIN nuevo y con él se vuelve a entrar", async () => {
		const store = crearStore();
		await store.getState().load();
		await store.getState().setPin("1234");
		const abrirPuerta = () =>
			render(
				conProveedores(
					store,
					fakeAudio(),
					<ParentGate onClose={vi.fn()} download={vi.fn()} />,
				),
			);
		const { unmount } = abrirPuerta();

		await userEvent.type(campoPin(), "1234");
		await userEvent.click(
			await screen.findByRole("button", { name: "Cambiar PIN" }),
		);
		expect(await screen.findByText("Crea un PIN de 4 números")).toBeDefined();
		expect(
			screen.queryByRole("dialog", { name: "Panel de padres" }),
		).toBeNull();

		await userEvent.type(campoPin(), "5678");
		await userEvent.type(campoPin(), "5678");
		expect(await panelAbierto()).toBeDefined();
		unmount();

		// La puerta nueva pide el PIN nuevo: el viejo ya no abre.
		abrirPuerta();
		await userEvent.type(campoPin(), "1234");
		expect(await screen.findByText("PIN incorrecto")).toBeDefined();
		await userEvent.type(campoPin(), "5678");
		expect(await panelAbierto()).toBeDefined();
	});

	it("mutación: sin llamar a checkPin, un PIN de cualquier valor no debería abrir (regresión de N3)", async () => {
		await montar({ pin: "4321" });
		fireEvent.change(campoPin(), { target: { value: "9999" } });
		expect(await screen.findByText("PIN incorrecto")).toBeDefined();
		// El panel de verdad (con "Cerrar") solo existe autenticado; la puerta con PIN
		// incorrecto no debe montarlo.
		expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
	});
});
