"use client";

import { useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import type { SpokenVerdict } from "@/engine";
import { useApp, useAudio, useSpeech } from "@/features/app-context";
import { type ListenResult, pickEvaluator, type SpeechTarget } from "@/speech";

/** La cuenta atrás de tres puntos: colchón para que la voz del dispositivo no se oiga (P7). */
export const COUNTDOWN_MS = 900;
/** Silencios seguidos tras los que el adulto tiene los botones (P4). */
export const MAX_SILENT_TURNS = 2;
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
	const cuentaAtras = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const guarda = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
			clearTimeout(cuentaAtras.current);
			clearTimeout(guarda.current);
		},
		[],
	);

	/** Da un veredicto una sola vez, corta lo que estuviera en curso y rearma tras la guarda. */
	const resolver = (dar: () => void) => {
		if (vivo.current.disabled || faseRef.current === "resuelto") return;
		control.current?.abort();
		clearTimeout(cuentaAtras.current);
		ir("resuelto");
		silenciosRef.current = 0;
		setSilencios(0);
		setNivel(0);
		guarda.current = setTimeout(() => ir("idle"), TAP_GUARD_MS);
		dar();
	};

	const alOir = async (c: AbortController) => {
		if (vivo.current.mode === "model") {
			resolver(() => vivo.current.onModelDone());
			return;
		}
		ir("evaluating");
		try {
			const evaluador = await pickEvaluator(
				vivo.current.evaluators,
				vivo.current.speechMode,
			);
			const v = await evaluador.evaluate({ target: vivo.current.target });
			if (c.signal.aborted || faseRef.current !== "evaluating") return;
			// P1: solo un `ok` se salta al adulto; `retry` y `unsure` se le piden.
			if (v.verdict === "ok") resolver(() => vivo.current.onVerdict("ok"));
			else ir("adulto");
		} catch {
			if (c.signal.aborted || faseRef.current !== "evaluating") return;
			ir("adulto");
		}
	};

	const escuchar = async (c: AbortController) => {
		ir("listening");
		let resultado: ListenResult;
		try {
			resultado = await vivo.current.listener.listen({
				signal: c.signal,
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
		cuentaAtras.current = setTimeout(() => void escuchar(c), COUNTDOWN_MS);
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
