// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpokenVerdict } from "@/engine";
import { AppProviders, type SpeechDeps } from "@/features/app-context";
import {
	COUNTDOWN_MS,
	EVALUATION_MAX_MS,
	MAX_SILENT_TURNS,
	TAP_GUARD_MS,
	VoiceTurn,
} from "@/features/session/voice/VoiceTurn";
import { crearStore, fakeAudio } from "@/features/test-support";
import {
	createParentEvaluator,
	type ListenResult,
	type SpeechEvaluator,
	type SpeechTarget,
} from "@/speech";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const OBJETIVO: SpeechTarget = {
	text: "ma",
	phonemes: ["m", "a"],
	lang: "es-US",
};

function evaluador(
	id: SpeechEvaluator["id"],
	verdict: "ok" | "retry" | "unsure",
): SpeechEvaluator {
	return {
		id,
		available: async () => true,
		evaluate: async () => ({ verdict, confidence: 1 }),
	};
}

async function montar(
	opts: {
		resultados?: ListenResult[];
		/** `listen` que no acaba hasta que se aborta la señal; entonces devuelve `alAbortar`. */
		colgado?: boolean;
		alAbortar?: ListenResult;
		evaluators?: SpeechEvaluator[];
		speechMode?: "auto" | "parent";
		mode?: "attempt" | "model";
		disabled?: boolean;
		hideMic?: boolean;
	} = {},
) {
	const store = crearStore();
	await store.getState().load();
	const doc = store.getState().doc;
	store.setState({
		doc: {
			...doc,
			settings: {
				...doc.settings,
				speechMode: opts.speechMode ?? "parent",
			},
		},
	});
	const audio = fakeAudio();
	const orden: string[] = [];
	audio.stop.mockImplementation(() => {
		orden.push("stop");
	});
	const senales: AbortSignal[] = [];
	const resultados = opts.resultados ?? [{ kind: "heard" }];
	let n = 0;
	const listen = vi.fn(
		async (o?: {
			signal?: AbortSignal;
			onLevel?(r: number): void;
			onReady?(): void;
			warmupMs?: number;
		}): Promise<ListenResult> => {
			orden.push("listen");
			if (o?.signal !== undefined) senales.push(o.signal);
			if (opts.colgado === true) {
				return new Promise<ListenResult>((res) => {
					o?.signal?.addEventListener("abort", () =>
						res(opts.alAbortar ?? { kind: "aborted" }),
					);
				});
			}
			// Simula la preparación real del micrófono (capture.ts): se llama de inmediato, pero
			// `onReady` (y el resultado) no llegan hasta que pasa `warmupMs`, como el colchón P7.
			if (o?.warmupMs !== undefined && o.warmupMs > 0) {
				await new Promise<void>((res) => {
					setTimeout(res, o.warmupMs);
				});
			}
			o?.onReady?.();
			const r = resultados[Math.min(n, resultados.length - 1)];
			n += 1;
			return r ?? { kind: "aborted" as const };
		},
	);
	const speech: SpeechDeps = {
		listener: { listen },
		evaluators: opts.evaluators ?? [createParentEvaluator()],
	};
	const onVerdict = vi.fn<(v: SpokenVerdict) => void>();
	const onModelDone = vi.fn();
	const arbol = (over: { disabled?: boolean } = {}) => (
		<AppProviders store={store} audio={audio} speech={speech}>
			<VoiceTurn
				mode={opts.mode ?? "attempt"}
				target={OBJETIVO}
				disabled={over.disabled ?? opts.disabled ?? false}
				hideMic={opts.hideMic ?? false}
				onVerdict={onVerdict}
				onModelDone={onModelDone}
			/>
		</AppProviders>
	);
	const r = render(arbol());
	return {
		...r,
		rerenderCon: (over: { disabled?: boolean }) => r.rerender(arbol(over)),
		audio,
		orden,
		listen,
		senales,
		onVerdict,
		onModelDone,
	};
}

const mic = () => screen.queryByRole("button", { name: "Micrófono" });
const boton = (nombre: string) =>
	screen.queryByRole("button", { name: nombre });

async function avanzar(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

/** Toca el micrófono y deja pasar la cuenta atrás y lo que sigue. */
async function turno() {
	const el = mic();
	if (el === null) throw new Error("No hay micrófono");
	fireEvent.click(el);
	await avanzar(COUNTDOWN_MS);
}

describe("VoiceTurn: el turno", () => {
	it("V5 (post-PR): audio.stop() suena y listen se llama de inmediato, con warmupMs: COUNTDOWN_MS (el micrófono se prepara en paralelo con la cuenta atrás, no después)", async () => {
		const t = await montar();
		fireEvent.click(mic() as HTMLElement);
		expect(t.audio.stop).toHaveBeenCalledTimes(1);
		expect(t.listen).toHaveBeenCalledTimes(1);
		expect(t.orden).toEqual(["stop", "listen"]);
		const opts = t.listen.mock.calls[0]?.[0];
		expect(opts?.warmupMs).toBe(COUNTDOWN_MS);
		expect(typeof opts?.onReady).toBe("function");
	});

	it("la fase no pasa a listening hasta que el listener avisa con onReady, aunque ya pasó COUNTDOWN_MS", async () => {
		const t = await montar();
		const prep = (() => {
			let resolver: () => void = () => {};
			const promesa = new Promise<void>((res) => {
				resolver = res;
			});
			return { promesa, resolver };
		})();
		const resultado = (() => {
			let resolver: (v: ListenResult) => void = () => {};
			const promesa = new Promise<ListenResult>((res) => {
				resolver = res;
			});
			return { promesa, resolver };
		})();
		t.listen.mockImplementationOnce(async (o) => {
			await prep.promesa;
			o?.onReady?.();
			return resultado.promesa;
		});
		fireEvent.click(mic() as HTMLElement);
		await avanzar(COUNTDOWN_MS);
		expect(mic()?.getAttribute("data-state")).toBe("countdown");
		await act(async () => {
			prep.resolver();
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(mic()?.getAttribute("data-state")).toBe("listening");
		await act(async () => {
			resultado.resolver({ kind: "silence" });
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(t.onVerdict).not.toHaveBeenCalled();
	});

	it("un segundo toque durante la cuenta atrás o la escucha no abre otra escucha ni corta el audio de nuevo", async () => {
		const t = await montar({ colgado: true });
		fireEvent.click(mic() as HTMLElement);
		fireEvent.click(mic() as HTMLElement);
		await avanzar(COUNTDOWN_MS);
		fireEvent.click(mic() as HTMLElement);
		await avanzar(COUNTDOWN_MS * 2);
		expect(t.listen).toHaveBeenCalledTimes(1);
		expect(t.audio.stop).toHaveBeenCalledTimes(1);
	});

	it("V4: heard con el evaluador parent (unsure) pide al adulto; cada botón da su veredicto una sola vez aunque se toque dos veces", async () => {
		const t = await montar();
		await turno();
		expect(boton("Lo dijo bien")).not.toBeNull();
		expect(boton("Otra vez")).not.toBeNull();
		expect(t.onVerdict).not.toHaveBeenCalled();
		const bien = boton("Lo dijo bien") as HTMLElement;
		fireEvent.click(bien);
		fireEvent.click(bien);
		expect(t.onVerdict.mock.calls).toEqual([["ok"]]);
	});

	it("V4: «Otra vez» da retry una sola vez aunque se toque dos veces", async () => {
		const t = await montar();
		await turno();
		const otra = boton("Otra vez") as HTMLElement;
		fireEvent.click(otra);
		fireEvent.click(otra);
		expect(t.onVerdict.mock.calls).toEqual([["retry"]]);
	});

	it("tras un veredicto, pasado TAP_GUARD_MS el micrófono vuelve y el turno se puede repetir", async () => {
		const t = await montar();
		await turno();
		fireEvent.click(boton("Otra vez") as HTMLElement);
		await avanzar(TAP_GUARD_MS);
		expect(boton("Otra vez")).toBeNull();
		await turno();
		expect(t.listen).toHaveBeenCalledTimes(2);
		expect(boton("Otra vez")).not.toBeNull();
	});

	it("V6: un evaluador que da ok con speechMode auto → onVerdict(ok) sin botones", async () => {
		const t = await montar({
			speechMode: "auto",
			evaluators: [evaluador("azure", "ok"), createParentEvaluator()],
		});
		await turno();
		expect(t.onVerdict.mock.calls).toEqual([["ok"]]);
		expect(boton("Lo dijo bien")).toBeNull();
		expect(boton("Otra vez")).toBeNull();
	});

	it("V6: con speechMode parent el mismo evaluador en la lista no se usa → botones", async () => {
		const t = await montar({
			speechMode: "parent",
			evaluators: [evaluador("azure", "ok"), createParentEvaluator()],
		});
		await turno();
		expect(t.onVerdict).not.toHaveBeenCalled();
		expect(boton("Lo dijo bien")).not.toBeNull();
	});

	it("P1: un retry de un evaluador automático se trata como unsure → botones, sin veredicto", async () => {
		const t = await montar({
			speechMode: "auto",
			evaluators: [evaluador("azure", "retry"), createParentEvaluator()],
		});
		await turno();
		expect(t.onVerdict).not.toHaveBeenCalled();
		expect(boton("Lo dijo bien")).not.toBeNull();
	});

	it("si el evaluador lanza, salen los botones y el niño no queda atrapado", async () => {
		const roto: SpeechEvaluator = {
			id: "azure",
			available: async () => true,
			evaluate: async () => {
				throw new Error("sin red");
			},
		};
		const t = await montar({ speechMode: "auto", evaluators: [roto] });
		await turno();
		expect(t.onVerdict).not.toHaveBeenCalled();
		expect(boton("Lo dijo bien")).not.toBeNull();
		expect(boton("Otra vez")).not.toBeNull();
	});

	it("V7: silence → suena feedback:no-speech, vuelve el micrófono y no hay veredicto; al segundo, los botones", async () => {
		expect(MAX_SILENT_TURNS).toBe(2);
		const t = await montar({ resultados: [{ kind: "silence" }] });
		await turno();
		expect(t.audio.play.mock.calls.map((c) => c[0].key)).toEqual([
			"feedback:no-speech",
		]);
		expect(mic()).not.toBeNull();
		expect(boton("Lo dijo bien")).toBeNull();
		expect(t.onVerdict).not.toHaveBeenCalled();
		await turno();
		expect(t.audio.play).toHaveBeenCalledTimes(2);
		expect(boton("Lo dijo bien")).not.toBeNull();
		expect(boton("Otra vez")).not.toBeNull();
		expect(t.onVerdict).not.toHaveBeenCalled();
	});

	it("los silencios se cuentan por intento: tras un veredicto hacen falta otros MAX_SILENT_TURNS para los botones", async () => {
		const t = await montar({ resultados: [{ kind: "silence" }] });
		await turno();
		await turno();
		fireEvent.click(boton("Otra vez") as HTMLElement);
		await avanzar(TAP_GUARD_MS);
		expect(boton("Otra vez")).toBeNull();
		await turno();
		expect(boton("Otra vez")).toBeNull();
		await turno();
		expect(boton("Otra vez")).not.toBeNull();
		expect(t.onVerdict.mock.calls).toEqual([["retry"]]);
	});

	it("un botón del adulto pulsado con una escucha en curso la aborta y da un solo veredicto aunque el listener conteste heard al abortar", async () => {
		const t = await montar({
			resultados: [{ kind: "silence" }],
			evaluators: [evaluador("azure", "ok"), createParentEvaluator()],
			speechMode: "auto",
		});
		await turno();
		await turno();
		expect(boton("Lo dijo bien")).not.toBeNull();
		// Tercer turno: escucha colgada que, al abortarse, contesta heard.
		t.listen.mockImplementationOnce(
			(o) =>
				new Promise<ListenResult>((res) => {
					if (o?.signal !== undefined) t.senales.push(o.signal);
					o?.signal?.addEventListener("abort", () => res({ kind: "heard" }));
				}),
		);
		await turno();
		expect(t.senales.at(-1)?.aborted).toBe(false);
		fireEvent.click(boton("Otra vez") as HTMLElement);
		await avanzar(COUNTDOWN_MS);
		expect(t.senales.at(-1)?.aborted).toBe(true);
		expect(t.onVerdict.mock.calls).toEqual([["retry"]]);
	});

	it("V7: si feedback:no-speech no acaba nunca de sonar, el micrófono vuelve igual", async () => {
		const t = await montar({ resultados: [{ kind: "silence" }] });
		t.audio.play.mockImplementation(() => new Promise<void>(() => {}));
		await turno();
		expect(mic()).not.toBeNull();
	});

	it("V7: si feedback:no-speech falla al sonar, no se rompe nada", async () => {
		const t = await montar({ resultados: [{ kind: "silence" }] });
		t.audio.play.mockRejectedValue(new Error("sin voz"));
		await turno();
		expect(mic()).not.toBeNull();
	});

	it("V8: hideMic → los botones desde el principio, sin micrófono y sin llamar a listen", async () => {
		const t = await montar({ hideMic: true });
		expect(mic()).toBeNull();
		expect(boton("Lo dijo bien")).not.toBeNull();
		expect(boton("Otra vez")).not.toBeNull();
		fireEvent.click(boton("Lo dijo bien") as HTMLElement);
		expect(t.onVerdict.mock.calls).toEqual([["ok"]]);
		expect(t.listen).not.toHaveBeenCalled();
	});

	it.each(["no-api", "denied", "error"] as const)(
		"V9: unavailable/%s → los botones, sin micrófono ni error visible",
		async (reason) => {
			const t = await montar({ resultados: [{ kind: "unavailable", reason }] });
			await turno();
			expect(boton("Lo dijo bien")).not.toBeNull();
			expect(boton("Otra vez")).not.toBeNull();
			expect(mic()).toBeNull();
			expect(screen.queryByRole("alert")).toBeNull();
			expect(t.onVerdict).not.toHaveBeenCalled();
		},
	);

	it("un listener que lanza se trata como unavailable: botones", async () => {
		const t = await montar();
		t.listen.mockRejectedValueOnce(new Error("boom"));
		await turno();
		expect(boton("Lo dijo bien")).not.toBeNull();
	});

	it("aborted sin desmontar: no hay veredicto ni botones y el micrófono sigue disponible", async () => {
		const t = await montar({ resultados: [{ kind: "aborted" }] });
		await turno();
		expect(t.onVerdict).not.toHaveBeenCalled();
		expect(boton("Lo dijo bien")).toBeNull();
		expect(mic()).not.toBeNull();
	});
});

describe("VoiceTurn: limpieza", () => {
	it("V10: desmontar durante listening aborta la señal", async () => {
		const t = await montar({ colgado: true });
		await turno();
		expect(t.senales).toHaveLength(1);
		expect(t.senales[0]?.aborted).toBe(false);
		t.unmount();
		expect(t.senales[0]?.aborted).toBe(true);
	});

	it("desmontar durante la cuenta atrás (post-PR: listen ya se llamó, en paralelo) aborta la señal y no deja timers", async () => {
		const t = await montar({ colgado: true });
		fireEvent.click(mic() as HTMLElement);
		expect(t.listen).toHaveBeenCalledTimes(1);
		expect(t.senales[0]?.aborted).toBe(false);
		t.unmount();
		expect(t.senales[0]?.aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("un resultado que llega tras desmontar no da veredicto", async () => {
		const t = await montar({ evaluators: [createParentEvaluator()] });
		fireEvent.click(mic() as HTMLElement);
		t.unmount();
		await avanzar(COUNTDOWN_MS * 3);
		expect(t.onVerdict).not.toHaveBeenCalled();
		expect(t.onModelDone).not.toHaveBeenCalled();
	});

	it.each(["attempt", "model"] as const)(
		"un listener que contesta heard justo al abortar por desmontaje no da veredicto ni model-done (%s)",
		async (mode) => {
			const t = await montar({
				mode,
				colgado: true,
				alAbortar: { kind: "heard" },
				speechMode: "auto",
				evaluators: [evaluador("azure", "ok"), createParentEvaluator()],
			});
			await turno();
			t.unmount();
			await avanzar(COUNTDOWN_MS);
			expect(t.onVerdict).not.toHaveBeenCalled();
			expect(t.onModelDone).not.toHaveBeenCalled();
		},
	);

	it("desmontar tras un veredicto no deja el temporizador de guarda pendiente", async () => {
		const t = await montar();
		await turno();
		fireEvent.click(boton("Otra vez") as HTMLElement);
		t.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("VoiceTurn: modo model", () => {
	it("V11: heard → onModelDone y ningún botón", async () => {
		const t = await montar({ mode: "model" });
		await turno();
		expect(t.onModelDone).toHaveBeenCalledTimes(1);
		expect(t.onVerdict).not.toHaveBeenCalled();
		expect(boton("Lo repitió")).toBeNull();
		expect(boton("Lo dijo bien")).toBeNull();
	});

	it("V11: hideMic → solo «Lo repitió», que llama onModelDone una sola vez", async () => {
		const t = await montar({ mode: "model", hideMic: true });
		expect(mic()).toBeNull();
		expect(boton("Otra vez")).toBeNull();
		expect(boton("Lo dijo bien")).toBeNull();
		const repitio = boton("Lo repitió") as HTMLElement;
		fireEvent.click(repitio);
		fireEvent.click(repitio);
		expect(t.onModelDone).toHaveBeenCalledTimes(1);
		expect(t.onVerdict).not.toHaveBeenCalled();
	});

	it("V11: dos silence → «Lo repitió»", async () => {
		const t = await montar({
			mode: "model",
			resultados: [{ kind: "silence" }],
		});
		await turno();
		expect(boton("Lo repitió")).toBeNull();
		await turno();
		fireEvent.click(boton("Lo repitió") as HTMLElement);
		expect(t.onModelDone).toHaveBeenCalledTimes(1);
		expect(t.onVerdict).not.toHaveBeenCalled();
	});

	it("unavailable en modo model → «Lo repitió»", async () => {
		await montar({
			mode: "model",
			resultados: [{ kind: "unavailable", reason: "denied" }],
		});
		await turno();
		expect(boton("Lo repitió")).not.toBeNull();
		expect(mic()).toBeNull();
	});
});

describe("VoiceTurn: disabled", () => {
	it("V12: con disabled el micrófono no llama a audio.stop ni a listen", async () => {
		const t = await montar({ disabled: true });
		fireEvent.click(mic() as HTMLElement);
		await avanzar(COUNTDOWN_MS * 2);
		expect(t.audio.stop).not.toHaveBeenCalled();
		expect(t.listen).not.toHaveBeenCalled();
	});

	it("V12: con disabled los botones del adulto no responden; al soltarse, sí", async () => {
		const t = await montar({ hideMic: true, disabled: true });
		fireEvent.click(boton("Lo dijo bien") as HTMLElement);
		fireEvent.click(boton("Otra vez") as HTMLElement);
		expect(t.onVerdict).not.toHaveBeenCalled();
		t.rerenderCon({ disabled: false });
		fireEvent.click(boton("Lo dijo bien") as HTMLElement);
		expect(t.onVerdict.mock.calls).toEqual([["ok"]]);
	});

	it("V12: con disabled el botón «Lo repitió» tampoco responde", async () => {
		const t = await montar({ mode: "model", hideMic: true, disabled: true });
		fireEvent.click(boton("Lo repitió") as HTMLElement);
		expect(t.onModelDone).not.toHaveBeenCalled();
	});
});

describe("VoiceTurn: accesibilidad y tamaños", () => {
	it("los botones del adulto son botones con su texto, de al menos 72 px y separados 16 px", async () => {
		await montar({ hideMic: true });
		for (const nombre of ["Lo dijo bien", "Otra vez"]) {
			const b = boton(nombre) as HTMLElement;
			expect(b.tagName).toBe("BUTTON");
			expect(b.className).toContain("min-h-18");
		}
		expect((boton("Otra vez") as HTMLElement).parentElement?.className).toMatch(
			/\bgap-4\b/,
		);
	});
});

/** Una promesa que se resuelve cuando el test lo decide. */
function diferida<T>() {
	let resolver: (v: T) => void = () => {};
	const promesa = new Promise<T>((res) => {
		resolver = res;
	});
	return { promesa, resolver };
}

function evaluadorDiferido(id: SpeechEvaluator["id"] = "azure") {
	const d = diferida<{
		verdict: "ok" | "retry" | "unsure";
		confidence: number;
	}>();
	const evaluator: SpeechEvaluator = {
		id,
		available: async () => true,
		evaluate: () => d.promesa,
	};
	return { evaluator, terminar: d.resolver };
}

describe("VoiceTurn: disabled a mitad de turno (Ruling: se descarta el resultado y se vuelve a idle)", () => {
	it.each(["attempt", "model"] as const)(
		"disabled durante la escucha y llega heard (%s): sin veredicto, vuelve a idle y un toque nuevo abre otra escucha",
		async (mode) => {
			const t = await montar({
				mode,
				speechMode: "auto",
				evaluators: [evaluador("azure", "ok"), createParentEvaluator()],
			});
			const escucha = diferida<ListenResult>();
			t.listen.mockImplementationOnce(() => escucha.promesa);
			await turno();
			t.rerenderCon({ disabled: true });
			await act(async () => {
				escucha.resolver({ kind: "heard" });
				await vi.advanceTimersByTimeAsync(0);
			});
			t.rerenderCon({ disabled: false });
			await avanzar(EVALUATION_MAX_MS);
			expect(t.onVerdict).not.toHaveBeenCalled();
			expect(t.onModelDone).not.toHaveBeenCalled();
			expect(boton("Lo dijo bien")).toBeNull();
			expect(t.listen).toHaveBeenCalledTimes(1);
			await turno();
			expect(t.listen).toHaveBeenCalledTimes(2);
		},
	);

	it.each(["attempt", "model"] as const)(
		"disabled durante la cuenta atrás y luego heard (%s): sin veredicto y vuelve a idle",
		async (mode) => {
			const t = await montar({
				mode,
				speechMode: "auto",
				evaluators: [evaluador("azure", "ok"), createParentEvaluator()],
			});
			fireEvent.click(mic() as HTMLElement);
			t.rerenderCon({ disabled: true });
			await avanzar(COUNTDOWN_MS);
			t.rerenderCon({ disabled: false });
			expect(t.onVerdict).not.toHaveBeenCalled();
			expect(t.onModelDone).not.toHaveBeenCalled();
			await turno();
			expect(t.listen).toHaveBeenCalledTimes(2);
		},
	);

	it("un heard descartado por disabled no cuenta como silencio: tras MAX_SILENT_TURNS descartes no salen los botones", async () => {
		const t = await montar({
			speechMode: "auto",
			evaluators: [evaluador("azure", "ok"), createParentEvaluator()],
		});
		for (let i = 0; i < MAX_SILENT_TURNS; i += 1) {
			const escucha = diferida<ListenResult>();
			t.listen.mockImplementationOnce(() => escucha.promesa);
			await turno();
			t.rerenderCon({ disabled: true });
			await act(async () => {
				escucha.resolver({ kind: "heard" });
				await vi.advanceTimersByTimeAsync(0);
			});
			t.rerenderCon({ disabled: false });
		}
		expect(t.audio.play).not.toHaveBeenCalled();
		expect(boton("Lo dijo bien")).toBeNull();
		expect(mic()).not.toBeNull();
	});

	it("disabled durante la evaluación: al acabar se descarta el resultado (aunque sea ok) y se vuelve a idle", async () => {
		const lento = evaluadorDiferido();
		const t = await montar({
			speechMode: "auto",
			evaluators: [lento.evaluator, createParentEvaluator()],
		});
		await turno();
		t.rerenderCon({ disabled: true });
		await act(async () => {
			lento.terminar({ verdict: "ok", confidence: 1 });
			await vi.advanceTimersByTimeAsync(0);
		});
		t.rerenderCon({ disabled: false });
		expect(t.onVerdict).not.toHaveBeenCalled();
		await turno();
		expect(t.listen).toHaveBeenCalledTimes(2);
	});
});

describe("VoiceTurn: evaluador colgado o tardío (P4)", () => {
	it("un evaluador que no acaba nunca: pasado EVALUATION_MAX_MS salen los botones del adulto", async () => {
		expect(EVALUATION_MAX_MS).toBe(5000);
		const colgado: SpeechEvaluator = {
			id: "azure",
			available: async () => true,
			evaluate: () => new Promise(() => {}),
		};
		const t = await montar({ speechMode: "auto", evaluators: [colgado] });
		await turno();
		await avanzar(EVALUATION_MAX_MS - 1);
		expect(boton("Lo dijo bien")).toBeNull();
		await avanzar(1);
		expect(boton("Lo dijo bien")).not.toBeNull();
		expect(boton("Otra vez")).not.toBeNull();
		expect(t.onVerdict).not.toHaveBeenCalled();
	});

	it("un available() que no acaba nunca también cae al tope", async () => {
		const colgado: SpeechEvaluator = {
			id: "azure",
			available: () => new Promise(() => {}),
			evaluate: async () => ({ verdict: "ok", confidence: 1 }),
		};
		await montar({ speechMode: "auto", evaluators: [colgado] });
		await turno();
		await avanzar(EVALUATION_MAX_MS);
		expect(boton("Lo dijo bien")).not.toBeNull();
	});

	it("un evaluador que resuelve ok después de vencer el tope no da veredicto", async () => {
		const lento = evaluadorDiferido();
		const t = await montar({
			speechMode: "auto",
			evaluators: [lento.evaluator],
		});
		await turno();
		await avanzar(EVALUATION_MAX_MS);
		expect(boton("Lo dijo bien")).not.toBeNull();
		await act(async () => {
			lento.terminar({ verdict: "ok", confidence: 1 });
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(t.onVerdict).not.toHaveBeenCalled();
		expect(boton("Lo dijo bien")).not.toBeNull();
	});

	it("un evaluador lento que resuelve ok tras desmontar no da veredicto", async () => {
		const lento = evaluadorDiferido();
		const t = await montar({
			speechMode: "auto",
			evaluators: [lento.evaluator],
		});
		await turno();
		t.unmount();
		await act(async () => {
			lento.terminar({ verdict: "ok", confidence: 1 });
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(t.onVerdict).not.toHaveBeenCalled();
	});

	it("desmontar durante la evaluación no deja el temporizador del tope pendiente", async () => {
		const lento = evaluadorDiferido();
		const t = await montar({
			speechMode: "auto",
			evaluators: [lento.evaluator],
		});
		await turno();
		t.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("una evaluación a tiempo que pide al adulto no deja el temporizador del tope pendiente", async () => {
		await montar({ speechMode: "parent" });
		await turno();
		expect(boton("Lo dijo bien")).not.toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
});
