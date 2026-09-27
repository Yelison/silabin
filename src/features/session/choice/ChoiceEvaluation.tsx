"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { OptionCard } from "@/components/OptionCard";
import { useAudio } from "@/features/app-context";
import type { ChoiceEffect } from "@/features/session/choice/hint-effects";
import type { EvaluationProps } from "@/features/session/registry";

/**
 * Elegir entre opciones tocando. Sirve a cualquier plantilla de elección: quien la usa pone las
 * opciones y traduce la pista del motor a un `ChoiceEffect`; aquí solo se pinta y se ejecuta.
 *
 * - `dim`: la opción atenuada deja de responder y sigue atenuada en los intentos siguientes.
 * - `sequence`: cada opción pulsa mientras suena la suya; la entrada está bloqueada hasta que
 *   resuelve el último `play`. No depende de `onSegment` ni de que algo suene.
 * - `mark`: solo responde la opción marcada, y avisa con `onModelDone`, nunca con `onAnswer`.
 */
export function ChoiceEvaluation(
	props: EvaluationProps & {
		options: { id: string; label: string; content: ReactNode }[];
		effectFor(action: string): ChoiceEffect;
		layout?: "row" | "grid";
	},
) {
	const {
		attemptKey,
		feedback,
		locked,
		onAnswer,
		onModelDone,
		options,
		effectFor,
		layout = "row",
	} = props;
	const audio = useAudio();
	const [dimmed, setDimmed] = useState<string | null>(null);
	const [pulsing, setPulsing] = useState<string | null>(null);
	const [marked, setMarked] = useState<string | null>(null);
	const [sequencing, setSequencing] = useState(false);
	// Refs para lo que dos toques seguidos o una promesa tardía deben ver al instante.
	const blocked = useRef(false);
	const modelDone = useRef(false);
	const alive = useRef(true);
	/** Cada pista o intento nuevo invalida la secuencia que aún esté sonando. */
	const token = useRef(0);
	const effectForRef = useRef(effectFor);
	effectForRef.current = effectFor;

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			audio.stop();
		};
	}, [audio]);

	// Intento nuevo: lo que pulsaba se apaga. `dimmed` se conserva: la pista 1 sigue valiendo.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al intento
	useEffect(() => {
		token.current++;
		setPulsing(null);
	}, [attemptKey]);

	// La pista que ordena el motor. Una vez por feedback nuevo, no por cada pintado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al feedback
	useEffect(() => {
		const mine = ++token.current;
		blocked.current = false;
		setSequencing(false);
		const action = feedback?.hint?.action;
		if (action === undefined) return;
		const play = (request: Parameters<typeof audio.play>[0]) =>
			audio.play(request).catch(() => {
				// El sonido acompaña, no manda.
			});
		const effect = effectForRef.current(action);
		switch (effect.kind) {
			case "none":
				return;
			case "dim":
				setDimmed(effect.optionId);
				void play(effect.replay);
				return;
			case "replay":
				void play(effect.request);
				return;
			case "pulse":
				setPulsing(effect.optionId);
				void play(effect.request);
				return;
			case "mark":
				setMarked(effect.optionId);
				return;
			case "sequence": {
				blocked.current = true;
				setSequencing(true);
				void (async () => {
					for (const step of effect.steps) {
						if (!alive.current || token.current !== mine) return;
						setPulsing(step.optionId);
						await play(step.request);
						if (!alive.current || token.current !== mine) return;
						setPulsing(null);
					}
					blocked.current = false;
					setSequencing(false);
				})();
				return;
			}
		}
	}, [feedback]);

	function select(id: string) {
		if (locked || blocked.current) return;
		if (marked !== null) {
			if (id === marked && !modelDone.current) {
				modelDone.current = true;
				onModelDone();
			}
			return;
		}
		if (dimmed === id) return;
		onAnswer(id);
	}

	return (
		<div
			className={
				layout === "grid"
					? "grid grid-cols-2 justify-items-center gap-6"
					: "flex flex-row flex-wrap items-center justify-center gap-6"
			}
		>
			{options.map((option) => {
				const state =
					marked === option.id
						? "marked"
						: dimmed === option.id
							? "dimmed"
							: pulsing === option.id
								? "pulsing"
								: "idle";
				return (
					<OptionCard
						key={option.id}
						state={state}
						disabled={
							locked ||
							sequencing ||
							dimmed === option.id ||
							(marked !== null && marked !== option.id)
						}
						aria-label={option.label}
						onSelect={() => select(option.id)}
					>
						{option.content}
					</OptionCard>
				);
			})}
		</div>
	);
}
