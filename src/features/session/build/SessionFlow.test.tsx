// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { curriculum, type PlannedExercise } from "@/engine";
import { SessionScreen } from "@/features/session/SessionScreen";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

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
		const store = crearStore();
		await store.getState().load();
		store.getState().beginSession();
		const ejercicio: PlannedExercise = {
			id: "ev:build:ma",
			kind: "evaluation",
			templateId: "build",
			itemId: "syllable:ma",
			optionIds: ["letter:e", "letter:m", "letter:a", "letter:l", "letter:o"],
			correctOptionId: null,
			source: "active-unit",
		};
		for (const id of ejercicio.optionIds)
			expect(curriculum.items.has(id)).toBe(true);
		const run = store.getState().run;
		if (run === null) throw new Error("Sin corrida");
		store.setState({ run: { ...run, exercises: [ejercicio], cursor: 0 } });
		const onEnd = vi.fn();
		render(
			conProveedores(
				store,
				fakeAudio(),
				<SessionScreen onEnd={onEnd} onExit={vi.fn()} celebrationMs={0} />,
			),
		);
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
		await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1));
	});
});
