"use client";

import { useEffect, useMemo, useState } from "react";
import { Mouth } from "@/components/Mouth";
import { ReplayButton } from "@/components/ReplayButton";
import { curriculum } from "@/engine";
import { useApp, useAudio } from "@/features/app-context";
import { Written } from "@/features/session/listen-tap/Written";
import type { EvaluationProps } from "@/features/session/registry";
import { playCapped } from "@/features/session/voice/hint-audio";
import { voiceEffect } from "@/features/session/voice/hint-effects";
import { safeMouthShapes } from "@/features/session/voice/safe-mouth";
import { VoiceTurn } from "@/features/session/voice/VoiceTurn";
import { speechTarget } from "@/speech";

/**
 * «Dilo tú»: el niño ve el objetivo y lo dice; el adulto (o, más adelante, un evaluador)
 * confirma. Sin audio del objetivo (P8): oírlo sería dárselo. El motor decide la pista; aquí solo
 * se ejecuta con `voiceEffect` (boca + instrucción, sonido alargado, o el modelo entero).
 *
 * `props.speech` es obligatorio para esta plantilla (lanza si falta): `EvaluationProps` lo deja
 * opcional para no tocar las plantillas de toque.
 */
export function Evaluation(props: EvaluationProps) {
	const { exercise, item, feedback, locked, speech } = props;
	if (speech === undefined) {
		throw new Error(
			`El ejercicio ${exercise.id} es de voz: necesita props.speech`,
		);
	}
	const audio = useAudio();
	const accent = useApp((s) => s.doc.settings.accent);
	const hideMic = useApp((s) => s.doc.settings.hideMic);

	const [mouth, setMouth] = useState(false);
	const [mode, setMode] = useState<"attempt" | "model">("attempt");
	// Mientras suena el audio de una pista el micrófono no responde: la voz del dispositivo no
	// puede contar como la del niño (P7). El tope evita que un audio colgado lo deje bloqueado.
	const [hintBusy, setHintBusy] = useState(false);
	const shapes = useMemo(() => safeMouthShapes(item), [item]);
	const target = useMemo(() => speechTarget(item, accent), [item, accent]);

	// Desmontaje a media pista: el audio se corta.
	useEffect(() => {
		return () => audio.stop();
	}, [audio]);

	// La pista que ordena el motor. Una vez por feedback nuevo, no por cada pintado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al feedback
	useEffect(() => {
		setMouth(false);
		setMode("attempt");
		setHintBusy(false);
		const action = feedback?.hint?.action;
		if (action === undefined) return;
		const effect = voiceEffect({ action, item, content: curriculum });
		if (effect.kind === "none") return;
		if (effect.kind === "mouth") setMouth(true);
		if (effect.kind === "model") setMode("model");
		let vigente = true;
		setHintBusy(true);
		void playCapped(audio, effect.request).then(() => {
			if (vigente) setHintBusy(false);
		});
		return () => {
			vigente = false;
		};
	}, [feedback]);

	return (
		<div className="flex flex-col items-center gap-4 landscape:flex-row landscape:gap-10">
			<div className="flex flex-col items-center gap-3">
				<div className="flex items-center justify-center font-reading">
					<Written item={item} size="lg" />
				</div>
				<div className="flex h-24 items-center justify-center">
					{mouth && shapes !== null && <Mouth shapes={shapes} playing />}
				</div>
			</div>
			<div className="flex flex-col items-center gap-4">
				<ReplayButton
					aria-label="Oír otra vez"
					disabled={locked || hintBusy}
					onReplay={() => {
						// P8: repite la instrucción, nunca el objetivo.
						audio
							.play({ key: `instruction:${exercise.templateId}` })
							.catch(() => {
								// Sin voz también se puede jugar.
							});
					}}
				/>
				<VoiceTurn
					mode={mode}
					target={target}
					disabled={locked || hintBusy}
					hideMic={hideMic}
					onVerdict={speech.onVerdict}
					onModelDone={props.onModelDone}
				/>
			</div>
		</div>
	);
}
