"use client";

import { useEffect, useRef, useState } from "react";
import { Picture } from "@/components/Picture";
import { ReplayButton } from "@/components/ReplayButton";
import { useAudio } from "@/features/app-context";
import { Luces } from "@/features/session/count-syllables/parts";
import type { EvaluationProps } from "@/features/session/registry";

/** Silencio que cierra la respuesta: el niño terminó de tocar. */
export const TAP_SETTLE_MS = 1500;
/** Toques que caben en una respuesta. Los siguientes se ignoran. */
export const MAX_TAPS = 5;

const REDUCE = "replay-by-syllable+light-per-syllable";
const SOUND = "replay-with-audible-beats";
const MODEL = "prefill-circles+await-taps";

/**
 * Cuenta las sílabas con el tambor. Cada toque enciende un círculo y suena un golpe (`beat`);
 * tras `TAP_SETTLE_MS` sin toques se responde con la cuenta. Las pistas las manda el motor
 * (`feedback.hint.action`) y aquí solo se pintan: nunca dicen el número, suenan.
 */
export function Evaluation(props: EvaluationProps) {
	const { item, attemptKey, feedback, locked, onAnswer, onModelDone } = props;
	const audio = useAudio();
	const [toques, setToques] = useState(0);
	const [modeloToques, setModeloToques] = useState(0);
	const [luces, setLuces] = useState(0);
	// Refs para lo que un temporizador o dos toques seguidos deben ver al instante.
	const toquesRef = useRef(0);
	const modeloRef = useRef(0);
	const modeloHecho = useRef(false);
	const respondido = useRef(false);
	const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
	const vivo = useRef(true);
	/** Cada pista o intento nuevo invalida las luces que aún lleguen de la anterior. */
	const ficha = useRef(0);
	const onAnswerRef = useRef(onAnswer);
	onAnswerRef.current = onAnswer;

	const silabas = item.syllables ?? [];
	const modelo = feedback?.hint?.action === MODEL;

	function cancelarSilencio() {
		if (temporizador.current !== null) clearTimeout(temporizador.current);
		temporizador.current = null;
	}

	useEffect(() => {
		vivo.current = true;
		return () => {
			vivo.current = false;
			if (temporizador.current !== null) clearTimeout(temporizador.current);
			temporizador.current = null;
			audio.stop();
		};
	}, [audio]);

	// Intento nuevo: entrada a cero y silencio pendiente cancelado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al intento
	useEffect(() => {
		cancelarSilencio();
		toquesRef.current = 0;
		respondido.current = false;
		ficha.current++;
		setToques(0);
		setLuces(0);
	}, [attemptKey]);

	// La pista que ordena el motor. Una vez por feedback nuevo, no por cada pintado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al feedback
	useEffect(() => {
		const mia = ++ficha.current;
		setLuces(0);
		modeloRef.current = 0;
		modeloHecho.current = false;
		setModeloToques(0);
		const action = feedback?.hint?.action;
		const sonar = (request: Parameters<typeof audio.play>[0]) => {
			audio.play(request).catch(() => {
				// El sonido acompaña, no manda.
			});
		};
		if (action === REDUCE) {
			sonar({
				key: item.audioKey,
				style: "by-syllable",
				syllables: item.syllables ?? [],
				// Las luces son un adorno: sin `onSegment` no se enciende ninguna y nada se bloquea.
				onSegment: (i) => {
					if (vivo.current && ficha.current === mia)
						setLuces((l) => Math.max(l, i + 1));
				},
			});
		} else if (action === SOUND) {
			sonar({
				key: item.audioKey,
				style: "beats",
				syllables: item.syllables ?? [],
			});
		}
	}, [feedback]);

	function tocarModelo() {
		if (modeloHecho.current) return;
		if (modeloRef.current < silabas.length) {
			modeloRef.current++;
			setModeloToques(modeloRef.current);
			audio.beat();
		}
		if (modeloRef.current >= silabas.length) {
			modeloHecho.current = true;
			onModelDone();
		}
	}

	function tocar() {
		if (locked) return;
		if (modelo) return tocarModelo();
		if (respondido.current || toquesRef.current >= MAX_TAPS) return;
		toquesRef.current++;
		setToques(toquesRef.current);
		audio.beat();
		cancelarSilencio();
		temporizador.current = setTimeout(() => {
			temporizador.current = null;
			if (respondido.current) return;
			respondido.current = true;
			onAnswerRef.current(String(toquesRef.current));
		}, TAP_SETTLE_MS);
	}

	function oirOtraVez() {
		if (locked) return;
		audio.play({ key: item.audioKey }).catch(() => {
			// Sin voz también se puede jugar.
		});
	}

	return (
		<div className="flex flex-col items-center gap-6">
			<Picture imageKey={item.imageKey} />
			<ReplayButton
				aria-label="Oír otra vez"
				onReplay={oirOtraVez}
				disabled={locked}
			/>
			<Luces count={luces} />
			<button
				type="button"
				aria-label="Tambor"
				aria-disabled={locked}
				onClick={tocar}
				className="h-56 w-56 touch-manipulation select-none rounded-full bg-action text-8xl shadow-lg active:scale-95"
			>
				🥁
			</button>
			<div className="flex min-h-14 items-center gap-3">
				{modelo
					? silabas.map((s, i) => (
							<button
								type="button"
								// biome-ignore lint/suspicious/noArrayIndexKey: las sílabas pueden repetirse
								key={`${i}-${s}`}
								aria-label="Círculo"
								data-model-circle
								data-state={i < modeloToques ? "tapped" : "marked"}
								onClick={tocarModelo}
								className={`h-14 w-14 rounded-full border-4 border-mark-border ${i < modeloToques ? "bg-mark-border" : "motion-safe:animate-pulse bg-mark"}`}
							/>
						))
					: Array.from({ length: toques }, (_, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: los círculos no tienen identidad propia
								key={i}
								data-circle
								className="h-14 w-14 rounded-full bg-action"
							/>
						))}
			</div>
		</div>
	);
}
