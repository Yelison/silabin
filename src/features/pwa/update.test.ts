import { describe, expect, it, vi } from "vitest";
import { applyWaitingUpdate } from "@/features/pwa/update";

type ContenedorReal = Pick<
	ServiceWorkerContainer,
	"getRegistration" | "addEventListener"
>;

/**
 * Un `ServiceWorkerContainer` mínimo: solo lo que pide el contrato. `ServiceWorkerRegistration`
 * y `ServiceWorker` reales cargan muchas más propiedades que no hacen falta para esta prueba,
 * así que el doble se moldea con `as unknown as` en vez de implementarlas todas.
 */
function contenedorFalso(opciones: {
	registro?:
		| { waiting: { postMessage: (m: unknown) => void } | null }
		| undefined;
}) {
	const listeners = new Map<string, { fn: () => void; once: boolean }[]>();
	const container = {
		getRegistration: vi.fn(async () => opciones.registro),
		addEventListener: vi.fn(
			(tipo: string, fn: () => void, opts?: { once?: boolean }) => {
				const lista = listeners.get(tipo) ?? [];
				lista.push({ fn, once: opts?.once ?? false });
				listeners.set(tipo, lista);
			},
		),
	} as unknown as ContenedorReal;
	const disparar = (tipo: string) => {
		for (const listener of listeners.get(tipo) ?? []) listener.fn();
		if ((listeners.get(tipo) ?? []).some((l) => l.once))
			listeners.set(
				tipo,
				(listeners.get(tipo) ?? []).filter((l) => !l.once),
			);
	};
	return { container, disparar };
}

describe("applyWaitingUpdate", () => {
	it("H2: sin container devuelve false", async () => {
		const reload = vi.fn();
		await expect(
			applyWaitingUpdate({ container: undefined, reload }),
		).resolves.toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});

	it("H2: sin registro devuelve false", async () => {
		const { container } = contenedorFalso({ registro: undefined });
		const reload = vi.fn();
		await expect(applyWaitingUpdate({ container, reload })).resolves.toBe(
			false,
		);
		expect(reload).not.toHaveBeenCalled();
	});

	it("H2: con registro sin waiting devuelve false", async () => {
		const { container } = contenedorFalso({ registro: { waiting: null } });
		const reload = vi.fn();
		await expect(applyWaitingUpdate({ container, reload })).resolves.toBe(
			false,
		);
		expect(reload).not.toHaveBeenCalled();
	});

	it("H3: con waiting envía SKIP_WAITING, devuelve true, y reload solo al cambiar el controlador y solo una vez", async () => {
		const postMessage = vi.fn();
		const { container, disparar } = contenedorFalso({
			registro: { waiting: { postMessage } },
		});
		const reload = vi.fn();
		await expect(applyWaitingUpdate({ container, reload })).resolves.toBe(true);
		expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
		expect(reload).not.toHaveBeenCalled();
		disparar("controllerchange");
		expect(reload).toHaveBeenCalledTimes(1);
		disparar("controllerchange");
		expect(reload).toHaveBeenCalledTimes(1);
	});
});
