// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useArranque } from "@/features/start/use-arranque";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

/** Monta el gancho con el audio de prueba, como lo hacía el test de `StartScreen`. */
function montar(
	onStart: () => void,
	applyUpdate: (signal: AbortSignal) => Promise<boolean>,
) {
	const audio = fakeAudio();
	const store = crearStore();
	const wrapper = ({ children }: { children: ReactNode }) =>
		conProveedores(store, audio, children);
	const { result } = renderHook(() => useArranque(onStart, applyUpdate), {
		wrapper,
	});
	return { arrancar: result.current, audio };
}

describe("useArranque", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("AR1 (H4): con una actualización pendiente no llama a onStart antes de 3 s", async () => {
		const onStart = vi.fn();
		const applyUpdate = vi.fn(async () => true);
		const { arrancar } = montar(onStart, applyUpdate);
		arrancar();
		// Menos que el respaldo de la recarga (3 s): la app va a recargar sola.
		await vi.advanceTimersByTimeAsync(2999);
		expect(applyUpdate).toHaveBeenCalledTimes(1);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("AR2 (M2): si se pidió la actualización pero la recarga no llega, a los 3 s se empieza igual", async () => {
		const onStart = vi.fn();
		const { arrancar } = montar(
			onStart,
			vi.fn(async () => true),
		);
		arrancar();
		await vi.advanceTimersByTimeAsync(2999);
		expect(onStart).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(onStart).toHaveBeenCalledTimes(1);
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("AR3 (M2): pasado el segundo la señal se aborta, se empieza una vez y resolver tarde no vuelve a llamar", async () => {
		const onStart = vi.fn();
		let senal: AbortSignal | undefined;
		let resolver: (v: boolean) => void = () => {};
		const applyUpdate = vi.fn((signal: AbortSignal) => {
			senal = signal;
			return new Promise<boolean>((resolve) => {
				resolver = resolve;
			});
		});
		const { arrancar } = montar(onStart, applyUpdate);
		arrancar();
		await vi.advanceTimersByTimeAsync(999);
		expect(senal?.aborted).toBe(false);
		expect(onStart).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(senal?.aborted).toBe(true);
		expect(onStart).toHaveBeenCalledTimes(1);
		resolver(true);
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("AR4 (H4): sin actualización pendiente llama a onStart una vez, sin esperar al segundo", async () => {
		const onStart = vi.fn();
		const { arrancar } = montar(
			onStart,
			vi.fn(async () => false),
		);
		arrancar();
		await vi.advanceTimersByTimeAsync(0);
		expect(onStart).toHaveBeenCalledTimes(1);
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("AR5: si la comprobación rechaza, se empieza igualmente una vez", async () => {
		const onStart = vi.fn();
		const { arrancar } = montar(
			onStart,
			vi.fn(async () => {
				throw new Error("sin red");
			}),
		);
		arrancar();
		await vi.advanceTimersByTimeAsync(0);
		expect(onStart).toHaveBeenCalledTimes(1);
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("AR6: un doble toque durante la primera comprobación arranca una sola sesión", async () => {
		const onStart = vi.fn();
		let resolver: (v: boolean) => void = () => {};
		const applyUpdate = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					resolver = resolve;
				}),
		);
		const { arrancar } = montar(onStart, applyUpdate);
		arrancar();
		await vi.advanceTimersByTimeAsync(300);
		arrancar();
		expect(applyUpdate).toHaveBeenCalledTimes(1);
		resolver(false);
		await vi.advanceTimersByTimeAsync(0);
		expect(onStart).toHaveBeenCalledTimes(1);
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
		expect(applyUpdate).toHaveBeenCalledTimes(1);
	});

	it("AR6b: el doble toque también se ignora si el segundo cae justo al vencer el segundo", async () => {
		const onStart = vi.fn();
		const applyUpdate = vi.fn(() => new Promise<boolean>(() => {}));
		const { arrancar } = montar(onStart, applyUpdate);
		arrancar();
		await vi.advanceTimersByTimeAsync(999);
		arrancar();
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
		expect(applyUpdate).toHaveBeenCalledTimes(1);
	});

	it("AR7: ya comprobada la primera vez, las siguientes llamadas empiezan en el acto y no vuelven a comprobar", async () => {
		const onStart = vi.fn();
		const applyUpdate = vi.fn(async () => false);
		const { arrancar } = montar(onStart, applyUpdate);
		arrancar();
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);

		arrancar();
		// Síncrono: sin esperar promesas ni temporizadores.
		expect(onStart).toHaveBeenCalledTimes(2);
		arrancar();
		expect(onStart).toHaveBeenCalledTimes(3);
		expect(applyUpdate).toHaveBeenCalledTimes(1);
	});

	it("AR8: unlock se llama de forma síncrona en cada llamada, también en la ignorada y en las posteriores", async () => {
		const onStart = vi.fn();
		let resolver: (v: boolean) => void = () => {};
		const applyUpdate = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					resolver = resolve;
				}),
		);
		const { arrancar, audio } = montar(onStart, applyUpdate);
		arrancar();
		// Antes de cualquier await: el gesto sigue activo.
		expect(audio.unlock).toHaveBeenCalledTimes(1);
		arrancar();
		expect(audio.unlock).toHaveBeenCalledTimes(2);
		resolver(false);
		await vi.runAllTimersAsync();
		arrancar();
		expect(audio.unlock).toHaveBeenCalledTimes(3);
	});

	it("AR9: al decidir se llama al onStart más reciente, no al que había en el toque", async () => {
		const viejo = vi.fn();
		const nuevo = vi.fn();
		const audio = fakeAudio();
		const store = crearStore();
		const wrapper = ({ children }: { children: ReactNode }) =>
			conProveedores(store, audio, children);
		const { result, rerender } = renderHook(
			({ onStart }: { onStart: () => void }) =>
				useArranque(onStart, () => new Promise<boolean>(() => {})),
			{ wrapper, initialProps: { onStart: viejo } },
		);
		result.current();
		rerender({ onStart: nuevo });
		await vi.advanceTimersByTimeAsync(1000);
		expect(viejo).not.toHaveBeenCalled();
		expect(nuevo).toHaveBeenCalledTimes(1);
	});

	it("un unlock que rechaza no impide empezar", async () => {
		const onStart = vi.fn();
		const { arrancar, audio } = montar(
			onStart,
			vi.fn(async () => false),
		);
		audio.unlock.mockRejectedValue(new Error("bloqueado"));
		arrancar();
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
	});
});
