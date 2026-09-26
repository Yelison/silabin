// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TemplateViews } from "@/features/session/registry";
import { SessionScreen } from "@/features/session/SessionScreen";
import {
	conProveedores,
	crearStore,
	fakeAudio,
	vistasFalsas,
} from "@/features/test-support";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

async function montar(
	opciones: { views?: Partial<Record<"count-syllables", TemplateViews>> } = {},
) {
	const store = crearStore();
	await store.getState().load();
	store.getState().beginSession();
	const audio = fakeAudio();
	const vistas = vistasFalsas();
	const onEnd = vi.fn();
	const onExit = vi.fn();
	const { container } = render(
		conProveedores(
			store,
			audio,
			<SessionScreen
				onEnd={onEnd}
				onExit={onExit}
				views={opciones.views ?? { "count-syllables": vistas.views }}
				celebrationMs={0}
			/>,
		),
	);
	const claves = () => audio.play.mock.calls.map((c) => c[0].key);
	const run = () => {
		const r = store.getState().run;
		if (r === null) throw new Error("No hay corrida");
		return r;
	};
	return { store, audio, vistas, onEnd, onExit, container, claves, run };
}

/** Pasa las presentaciones del principio hasta que se pinta la primera evaluación. */
async function hastaEvaluacion(user: ReturnType<typeof userEvent.setup>) {
	for (let i = 0; i < 10; i++) {
		const listo = screen.queryByRole("button", { name: "listo" });
		if (listo === null) return;
		await user.click(listo);
	}
	throw new Error("Demasiadas presentaciones");
}

const bien = () => screen.getByRole("button", { name: "bien" });
const mal = () => screen.getByRole("button", { name: "mal" });

describe("SessionScreen", () => {
	it("E1: una sesión que empieza por presentación pinta la Presentation falsa y onDone avanza", async () => {
		const { run, container } = await montar();
		const user = userEvent.setup();
		expect(run().exercises[0]?.kind).toBe("presentation");
		expect(run().cursor).toBe(0);
		expect(
			container.querySelector('[data-view="presentation"]'),
		).not.toBeNull();
		await user.click(screen.getByRole("button", { name: "listo" }));
		expect(run().cursor).toBe(1);
		const siguiente = run().exercises[1];
		expect(
			container.querySelector("[data-view]")?.getAttribute("data-exercise"),
		).toBe(siguiente?.id);
	});

	it("la barra de progreso refleja cursor / total", async () => {
		const { run } = await montar();
		const user = userEvent.setup();
		const barra = screen.getByRole("progressbar");
		expect(barra.getAttribute("aria-valuenow")).toBe("0");
		expect(barra.getAttribute("aria-valuemax")).toBe(
			String(run().exercises.length),
		);
		await user.click(screen.getByRole("button", { name: "listo" }));
		expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
			"1",
		);
	});

	it("al pintar una evaluación suena su instrucción, una sola vez aunque haya reintentos", async () => {
		const { claves } = await montar();
		const user = userEvent.setup();
		await hastaEvaluacion(user);
		expect(
			claves().filter((k) => k === "instruction:count-syllables"),
		).toHaveLength(1);
		await user.click(mal());
		await waitFor(() => expect(claves()).toContain("feedback:retry"));
		expect(
			claves().filter((k) => k === "instruction:count-syllables"),
		).toHaveLength(1);
	});

	it("E2: responder bien suena celebrate:correct, con la respuesta ya registrada, y el cursor avanza después", async () => {
		const { run, audio, claves } = await montar();
		const user = userEvent.setup();
		await hastaEvaluacion(user);
		const antes = run().cursor;
		let durante: { cursor: number; resueltos: number } | null = null;
		audio.play.mockImplementation(async (r) => {
			if (r.key === "celebrate:correct")
				durante = { cursor: run().cursor, resueltos: run().resolutions.length };
		});
		await user.click(bien());
		await waitFor(() => expect(run().cursor).toBe(antes + 1));
		expect(claves()).toContain("celebrate:correct");
		expect(durante).toEqual({ cursor: antes, resueltos: 1 });
		expect(run().resolutions).toEqual([{ status: "mastery-credit" }]);
	});

	it("E3: responder mal suena feedback:retry y ningún celebrate; attemptKey cambia y la Evaluation recibe la pista reduce", async () => {
		const { run, audio, claves, vistas } = await montar();
		const user = userEvent.setup();
		await hastaEvaluacion(user);
		const cursor = run().cursor;
		const antes = vistas.ultimo();
		expect(antes?.feedback).toBeNull();
		expect(antes?.locked).toBe(false);

		// El sonido de fallo no termina hasta que el test lo suelta: la entrada sigue bloqueada.
		let soltar: () => void = () => {};
		let intentoAlSonar = 0;
		audio.play.mockImplementation((r) => {
			if (r.key !== "feedback:retry") return Promise.resolve();
			intentoAlSonar = run().attempt.attempt;
			return new Promise<void>((res) => {
				soltar = res;
			});
		});
		await user.click(mal());
		await waitFor(() => expect(claves()).toContain("feedback:retry"));
		expect(intentoAlSonar).toBe(2);
		expect(vistas.ultimo()?.locked).toBe(true);
		expect(vistas.ultimo()?.attemptKey).toBe(antes?.attemptKey);

		await act(async () => soltar());
		await waitFor(() => expect(vistas.ultimo()?.locked).toBe(false));
		expect(vistas.ultimo()?.attemptKey).toBe((antes?.attemptKey ?? 0) + 1);
		expect(vistas.ultimo()?.feedback?.hint?.rung).toBe("reduce");
		expect(vistas.ultimo()?.feedback?.resolution).toBeNull();
		expect(claves().some((k) => k.startsWith("celebrate:"))).toBe(false);
		expect(run().cursor).toBe(cursor);
	});

	it("E4: a la tercera vez feedback trae model y assisted, no suena un segundo retry y el cursor espera a onModelDone", async () => {
		const { run, claves, vistas } = await montar();
		const user = userEvent.setup();
		await hastaEvaluacion(user);
		const cursor = run().cursor;
		await user.click(mal());
		await waitFor(() => expect(vistas.ultimo()?.attemptKey).toBe(1));
		await user.click(mal());
		await waitFor(() => expect(vistas.ultimo()?.attemptKey).toBe(2));
		expect(claves().filter((k) => k === "feedback:retry")).toHaveLength(2);
		await user.click(mal());
		await waitFor(() =>
			expect(vistas.ultimo()?.feedback?.resolution).toEqual({
				status: "assisted",
			}),
		);
		expect(vistas.ultimo()?.feedback?.hint?.rung).toBe("model");
		expect(vistas.ultimo()?.locked).toBe(false);
		// Ni segundo retry, ni celebración, ni avance mientras el modelo no se complete.
		await new Promise((r) => setTimeout(r, 20));
		expect(claves().filter((k) => k === "feedback:retry")).toHaveLength(2);
		expect(claves().some((k) => k.startsWith("celebrate:"))).toBe(false);
		expect(run().cursor).toBe(cursor);

		await user.click(screen.getByRole("button", { name: "modelo" }));
		expect(run().cursor).toBe(cursor + 1);
	});

	it("un segundo aviso de modelo completado no avanza dos ejercicios", async () => {
		const { run, vistas } = await montar();
		const user = userEvent.setup();
		await hastaEvaluacion(user);
		const cursor = run().cursor;
		for (const n of [1, 2, 3]) {
			await user.click(mal());
			if (n < 3)
				await waitFor(() => expect(vistas.ultimo()?.attemptKey).toBe(n));
		}
		await waitFor(() =>
			expect(vistas.ultimo()?.feedback?.resolution).toEqual({
				status: "assisted",
			}),
		);
		const onModelDone = vistas.ultimo()?.onModelDone;
		act(() => {
			onModelDone?.();
			onModelDone?.();
		});
		expect(run().cursor).toBe(cursor + 1);
	});

	it("E5: dos respuestas seguidas sin esperar registran un solo intento", async () => {
		const { run, vistas } = await montar();
		const user = userEvent.setup();
		await hastaEvaluacion(user);
		const onAnswer = vistas.ultimo()?.onAnswer;
		await act(async () => {
			onAnswer?.("__respuesta_mala__");
			onAnswer?.("__respuesta_mala__");
		});
		await waitFor(() => expect(vistas.ultimo()?.attemptKey).toBe(1));
		expect(run().attempt.attempt).toBe(2);
	});

	it("E6: un toque corto en salir no hace nada; mantenerlo 1,5 s vuelve al mapa y run es null", async () => {
		const { store, onExit, audio } = await montar();
		vi.useFakeTimers();
		const salir = screen.getByRole("button", { name: /salir/i });

		fireEvent.pointerDown(salir);
		act(() => {
			vi.advanceTimersByTime(1499);
		});
		fireEvent.pointerUp(salir);
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(onExit).not.toHaveBeenCalled();
		expect(store.getState().run).not.toBeNull();

		fireEvent.click(salir);
		expect(onExit).not.toHaveBeenCalled();

		fireEvent.pointerDown(salir);
		act(() => {
			vi.advanceTimersByTime(1500);
		});
		expect(onExit).toHaveBeenCalledTimes(1);
		expect(store.getState().run).toBeNull();
		expect(store.getState().summary).toBeNull();
		expect(audio.stop).toHaveBeenCalled();
	});

	it("E7: al resolver la última evaluación se cierra la sesión, hay resumen y se avisa a onEnd", async () => {
		const { store, onEnd, run } = await montar();
		const user = userEvent.setup();
		const total = run().exercises.length;
		for (let i = 0; i < total * 2 && store.getState().summary === null; i++) {
			const listo = screen.queryByRole("button", { name: "listo" });
			if (listo !== null) await user.click(listo);
			else {
				const cursor = run().cursor;
				await user.click(bien());
				await waitFor(() => {
					const r = store.getState().run;
					expect(r === null || r.cursor > cursor).toBe(true);
				});
			}
		}
		await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1));
		const resumen = store.getState().summary;
		expect(resumen).not.toBeNull();
		expect(resumen?.stars).toBe(3);
		expect(store.getState().run).toBeNull();
		expect(store.getState().doc.sessions).toHaveLength(1);
	});

	it("una corrida de 0 ejercicios no enseña resumen: se cierra y se vuelve al mapa", async () => {
		const store = crearStore();
		await store.getState().load();
		store.getState().beginSession();
		const run = store.getState().run;
		if (run === null) throw new Error("sin corrida");
		store.setState({ run: { ...run, exercises: [] } });
		const onEnd = vi.fn();
		const onExit = vi.fn();
		render(
			conProveedores(
				store,
				fakeAudio(),
				<SessionScreen
					onEnd={onEnd}
					onExit={onExit}
					views={{ "count-syllables": vistasFalsas().views }}
				/>,
			),
		);
		await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
		expect(onEnd).not.toHaveBeenCalled();
		expect(store.getState().summary).toBeNull();
		expect(store.getState().run).toBeNull();
	});

	it("una plantilla sin vista registrada abandona la sesión y vuelve al mapa sin pintar nada", async () => {
		const { store, onExit, onEnd, container } = await montar({ views: {} });
		await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
		expect(onEnd).not.toHaveBeenCalled();
		expect(store.getState().run).toBeNull();
		expect(container.textContent).toBe("");
	});

	it("si el sonido no llega a resolver por sí solo la interfaz no depende de onSegment: con un play que resuelve al instante avanza igual", async () => {
		const { run, audio } = await montar();
		const user = userEvent.setup();
		await hastaEvaluacion(user);
		const antes = run().cursor;
		// Sin llamar jamás a onSegment, como el reproductor silencioso.
		audio.play.mockImplementation(async () => {});
		await user.click(bien());
		await waitFor(() => expect(run().cursor).toBe(antes + 1));
		for (const c of audio.play.mock.calls)
			expect(c[0].onSegment).toBeUndefined();
	});
});
