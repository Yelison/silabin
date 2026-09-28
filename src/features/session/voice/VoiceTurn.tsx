"use client";

import { useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import type { SpokenVerdict } from "@/engine";
import { useApp, useAudio, useSpeech } from "@/features/app-context";
import { type ListenResult, pickEvaluator, type SpeechTarget } from "@/speech";

/**
 * La cuenta atrás de tres puntos: colchón para que la voz del dispositivo no se oiga (P7). Se
 * pasa como `warmupMs` a `listener.listen`, que la corre en paralelo con abrir el micrófono
 * (`getUserMedia` puede tardar 800-1700 ms en dispositivos reales): gana el que tarde más. La
 * fase solo pasa a `"listening"` cuando el `listener` avisa con `onReady` (ver `escuchar`).
 */
export const COUNTDOWN_MS = 900;
/** Silencios seguidos tras los que el adulto tiene los botones (P4). */
export const MAX_SILENT_TURNS = 2;
/**
 * Lo máximo que se espera a que un evaluador conteste (P4). Al vencer se trata como si hubiera
 * fallado: salen los botones del adulto. Los evaluadores por red (`browser`, `azure`) pueden colgarse.
 */
export const EVALUATION_MAX_MS = 5000;
/** Tras un veredicto se ignoran los toques este tiempo: un doble toque no da dos veredictos. */
export const TAP_GUARD_MS = 800;

/** Cuántos pasos distintos tiene la onda: menos pasos, menos pintados en el bucle del micrófono. */
const NIVELES = 10;
/** El habla del niño ronda 0,02 a 0,2 de energía (RMS): se amplifica para llenar la onda. */
const GANANCIA = 8;

type Fase =
	| "idle"
	| "countdown"
	| "listening"
	| "evaluating"
	| "adulto"
	| "resuelto";

type Props = {
	mode: "attempt" | "model";
	target: SpeechTarget;
	/** Bloqueado o con audio de pista sonando: ni el micrófono ni los botones responden. */
	disabled: boolean;
	hideMic: boolean;
	/** Solo en `"attempt"`. */
	onVerdict(verdict: SpokenVerdict): void;
	/** Solo en `"model"`. */
	onModelDone(): void;
};

/**
 * El turno de voz del niño. Pulsar el micrófono corta el audio (P7), cuenta tres puntos,
 * escucha y, según lo oído, da el veredicto, pide el del adulto o vuelve a empezar. Nunca
 * decide pedagogía: le devuelve al motor un `"ok"`/`"retry"` (o `onModelDone`).
 *
 * P4, el adulto nunca queda atrapado: sin micrófono, denegado, `hideMic` o tras
 * `MAX_SILENT_TURNS` silencios, salen los botones. Cada veredicto se da una sola vez por toque
 * y el turno se puede repetir pasado `TAP_GUARD_MS`, sin necesidad de remontarlo.
 */
export function VoiceTurn(props: Props) {
	const { mode, disabled, hideMic } = props;
	const audio = useAudio();
	const { listener, evaluators } = useSpeech();
	const speechMode = useApp((s) => s.doc.settings.speechMode);

	const [fase, setFaseEstado] = useState<Fase>("idle");
	const [nivel, setNivel] = useState(0);
	const [silencios, setSilencios] = useState(0);
	const [sinMicrofono, setSinMicrofono] = useState(false);
	// La fase también va en una ref: dos toques en el mismo instante ven la misma fase de estado.
	const faseRef = useRef<Fase>("idle");
	const silenciosRef = useRef(0);
	const control = useRef<AbortController | null>(null);
	const guarda = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const topeEvaluacion = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	// Lo último que dicen las props y el contexto, para lo que se decide tras un `await`.
	const vivo = useRef({ ...props, audio, listener, evaluators, speechMode });
	useEffect(() => {
		vivo.current = { ...props, audio, listener, evaluators, speechMode };
	});

	const ir = (f: Fase) => {
		faseRef.current = f;
		setFaseEstado(f);
	};

	useEffect(
		() => () => {
			control.current?.abort();
			clearTimeout(guarda.current);
			clearTimeout(topeEvaluacion.current);
		},
		[],
	);

	/**
	 * Da un veredicto una sola vez, corta lo que estuviera en curso y rearma tras la guarda. No
	 * mira `disabled`: eso lo hace quien llama. Los toques del adulto lo comprueban en el botón;
	 * un resultado que llega con `disabled` se descarta antes (`descartar`), nunca aquí.
	 */
	const resolver = (dar: () => void) => {
		if (faseRef.current === "resuelto") return;
		control.current?.abort();
		clearTimeout(topeEvaluacion.current);
		ir("resuelto");
		silenciosRef.current = 0;
		setSilencios(0);
		setNivel(0);
		guarda.current = setTimeout(() => ir("idle"), TAP_GUARD_MS);
		dar();
	};

	/**
	 * Un resultado que llega con `disabled` no puede aceptarse: el motor está ocupado o suena
	 * una pista, y la voz del dispositivo no debe contar como la del niño (P7). Se descarta y el
	 * micrófono vuelve a estar listo. Nunca deja el turno atrapado.
	 */
	const descartar = () => {
		setNivel(0);
		ir("idle");
	};

	const alOir = async (c: AbortController) => {
		if (vivo.current.mode === "model") {
			resolver(() => vivo.current.onModelDone());
			return;
		}
		ir("evaluating");
		try {
			// El tope cubre `pickEvaluator` y `evaluate` juntos; un resultado tardío ya no cuenta.
			const tope = new Promise<never>((_, rechazar) => {
				topeEvaluacion.current = setTimeout(
					() => rechazar(new Error("El evaluador no contestó a tiempo")),
					EVALUATION_MAX_MS,
				);
			});
			const evaluar = async () => {
				const evaluador = await pickEvaluator(
					vivo.current.evaluators,
					vivo.current.speechMode,
				);
				return evaluador.evaluate({ target: vivo.current.target });
			};
			let v: Awaited<ReturnType<typeof evaluar>>;
			try {
				v = await Promise.race([evaluar(), tope]);
			} finally {
				clearTimeout(topeEvaluacion.current);
			}
			if (c.signal.aborted || faseRef.current !== "evaluating") return;
			if (vivo.current.disabled) {
				descartar();
				return;
			}
			// P1: solo un `ok` se salta al adulto; `retry` y `unsure` se le piden.
			if (v.verdict === "ok") resolver(() => vivo.current.onVerdict("ok"));
			else ir("adulto");
		} catch {
			if (c.signal.aborted || faseRef.current !== "evaluating") return;
			ir("adulto");
		}
	};

	const escuchar = async (c: AbortController) => {
		let resultado: ListenResult;
		try {
			resultado = await vivo.current.listener.listen({
				signal: c.signal,
				// El colchón corre en paralelo con abrir el micrófono; solo cuando ambos se cumplen
				// (ver docblock de COUNTDOWN_MS) el `listener` avisa y el botón se pone azul.
				warmupMs: COUNTDOWN_MS,
				onReady: () => {
					if (!c.signal.aborted) ir("listening");
				},
				onLevel: (rms) => {
					if (c.signal.aborted) return;
					const paso =
						Math.round(Math.min(1, rms * GANANCIA) * NIVELES) / NIVELES;
					setNivel(paso);
				},
			});
		} catch {
			resultado = { kind: "unavailable", reason: "error" };
		}
		if (c.signal.aborted) return;
		setNivel(0);
		switch (resultado.kind) {
			case "heard":
				if (vivo.current.disabled) {
					descartar();
					return;
				}
				await alOir(c);
				return;
			case "silence": {
				// El «No te oí» es solo audio neutro y no se espera: si no suena, se sigue.
				try {
					void Promise.resolve(
						vivo.current.audio.play({ key: "feedback:no-speech" }),
					).catch(() => {});
				} catch {
					// Un reproductor que falla al empezar no debe romper el turno.
				}
				silenciosRef.current += 1;
				setSilencios(silenciosRef.current);
				ir("idle");
				return;
			}
			case "unavailable":
				setSinMicrofono(true);
				ir("idle");
				return;
			case "aborted":
				ir("idle");
				return;
		}
	};

	const pulsar = () => {
		if (vivo.current.disabled || faseRef.current !== "idle") return;
		// P7: lo que suene del dispositivo se corta antes de abrir el micrófono.
		vivo.current.audio.stop();
		const c = new AbortController();
		control.current = c;
		ir("countdown");
		// `escuchar` abre el micrófono de inmediato: `warmupMs` es lo que se encarga de no llegar a
		// "listening" antes de tiempo, no un `setTimeout` previo aquí.
		void escuchar(c);
	};

	const sinMic = hideMic || sinMicrofono;
	const mostrarMic = !sinMic && fase !== "adulto";
	const mostrarBotones =
		sinMic || fase === "adulto" || silencios >= MAX_SILENT_TURNS;
	const inertes = disabled || fase === "resuelto";

	const boton = (texto: string, dar: () => void) => (
		<button
			key={texto}
			type="button"
			aria-disabled={inertes}
			onClick={() => {
				if (inertes) return;
				resolver(dar);
			}}
			className={`min-h-18 min-w-18 rounded-card bg-action px-6 py-3 text-xl font-bold text-action-ink shadow-md active:scale-95 ${inertes ? "opacity-30" : ""}`}
		>
			{texto}
		</button>
	);

	return (
		<div className="flex flex-col items-center gap-4">
			{mostrarMic && (
				<MicButton
					state={fase === "countdown" || fase === "listening" ? fase : "idle"}
					level={nivel}
					disabled={disabled}
					onPress={pulsar}
				/>
			)}
			{mostrarBotones && (
				<div className="flex flex-wrap items-center justify-center gap-4">
					{mode === "model"
						? boton("Lo repitió", () => props.onModelDone())
						: [
								boton("Lo dijo bien", () => props.onVerdict("ok")),
								boton("Otra vez", () => props.onVerdict("retry")),
							]}
				</div>
			)}
		</div>
	);
}
