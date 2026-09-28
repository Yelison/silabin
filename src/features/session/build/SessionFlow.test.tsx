// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentExercise, curriculum } from "@/engine";
import { SessionScreen } from "@/features/session/SessionScreen";
import {
	conProveedores,
	crearStore,
	documentoConUnidadesHechas,
	fakeAudio,
} from "@/features/test-support";
import { createMemoryAdapter } from "@/store";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const boton = (nombre: string) => screen.getByRole("button", { name: nombre });
const enCasilla = (n: 1 | 2) =>
	within(screen.getByRole("group", { name: `Casilla ${n}` }))
		.queryAllByRole("button")
		.map((b) => b.getAttribute("aria-label"));

/**
 * Integración con el motor y `SessionScreen` reales: el tercer fallo llega como `assisted`, SIN
 * intento nuevo, con las casillas aún llenas de la respuesta errónea. El niño tiene que poder
 * colocar el modelo y avanzar.
 */
describe("build dentro de SessionScreen (motor real)", () => {
	it("C1: tras tres fallos el modelo se puede completar y la sesión avanza", async () => {
		// Por la vía normal: la Fase 2 activa (`phase2:m`, con la letra ya dominada para que salgan
		// las sílabas) y la semilla fija de `crearStore` planifican un `build` de `syllable:ma`.
		const store = crearStore(
			createMemoryAdapter(
				documentoConUnidadesHechas("phase2:m", {
					itemsExtra: ["phoneme:m", "letter:m"],
				}),
			),
		);
		await store.getState().load();
		store.getState().beginSession();
		const ejercicioActual = () => {
			const run = store.getState().run;
			return run === null ? null : currentExercise(run);
		};
		const onEnd = vi.fn();
		render(
			conProveedores(
				store,
				fakeAudio(),
				<SessionScreen onEnd={onEnd} onExit={vi.fn()} celebrationMs={0} />,
			),
		);
		// Se pasan las presentaciones con el reloj falso y, ya en el `build`, se vuelve al real.
		vi.useFakeTimers();
		for (let vuelta = 0; vuelta < 100; vuelta++) {
			const ex = ejercicioActual();
			if (ex?.kind === "evaluation") break;
			const siguiente = screen.queryByRole("button", { name: "Siguiente" });
			if (siguiente !== null) fireEvent.click(siguiente);
			await act(async () => {
				await vi.advanceTimersByTimeAsync(500);
			});
		}
		vi.useRealTimers();
		const ejercicio = ejercicioActual();
		expect(ejercicio?.templateId).toBe("build");
		expect(ejercicio?.itemId).toBe("syllable:ma");
		for (const id of ejercicio?.optionIds ?? [])
			expect(curriculum.items.has(id)).toBe(true);
		// Dos fallos con pista (rung 1 y 2): cada uno abre un intento nuevo y vacía las casillas.
		// Se falla con vocales, que la pista 1 no atenúa.
		for (let intento = 0; intento < 2; intento++) {
			fireEvent.click(boton("a"));
			fireEvent.click(boton("e"));
			await waitFor(() => expect(enCasilla(1)).toEqual([]));
		}
		// Tercer fallo: `assisted`, sin intento nuevo.
		fireEvent.click(boton("a"));
		fireEvent.click(boton("e"));
		await waitFor(() =>
			expect(boton("m").getAttribute("data-state")).toBe("marked"),
		);
		expect(enCasilla(1)).toEqual([]);
		expect(enCasilla(2)).toEqual([]);
		fireEvent.click(boton("a")); // fuera de orden: no entra
		expect(enCasilla(1)).toEqual([]);
		fireEvent.click(boton("m"));
		fireEvent.click(boton("a"));
		// Ya no es una corrida de un solo ejercicio: avanzar es pasar al siguiente, sin acabar.
		await waitFor(() => expect(ejercicioActual()?.id).not.toBe(ejercicio?.id));
		expect(store.getState().run?.resolutions.at(-1)?.status).toBe("assisted");
		expect(onEnd).not.toHaveBeenCalled();
	});
});
