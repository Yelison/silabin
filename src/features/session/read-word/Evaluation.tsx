"use client";

import { useEffect, useMemo, useState } from "react";
import { Picture } from "@/components/Picture";
import { ReplayButton } from "@/components/ReplayButton";
import { curriculum } from "@/engine";
import { useApp, useAudio } from "@/features/app-context";
import { Palabra } from "@/features/session/read-word/Palabra";
import type { EvaluationProps } from "@/features/session/registry";
import { playCapped } from "@/features/session/voice/hint-audio";
import { voiceEffect } from "@/features/session/voice/hint-effects";
import { VoiceTurn } from "@/features/session/voice/VoiceTurn";
import { speechTarget } from "@/speech";

/**
 * La imagen tapada: una tarjeta vacía. Su nombre accesible no dice qué hay debajo (nombrarla
 * sería darle la palabra a un lector de pantalla, y el niño tiene que leerla), y la imagen real
 * ni siquiera está en el DOM hasta que el ejercicio se resuelve.
 */
function TarjetaTapada() {
	return (
		<div
			role="img"
			aria-label="Imagen tapada"
			className="h-24 w-24 shrink-0 rounded-card border-4 border-dashed border-calm-border bg-calm"
		/>
	);
}

/**
 * «Lee la palabra»: el niño ve la palabra escrita, la dice y el adulto (o, más adelante, un
 * evaluador) confirma. Al resolverse (acierto o modelo) se descubre la imagen. Sin audio de la
 * palabra al montar (P8): oírla sería dársela. El motor decide la pista; aquí solo se ejecuta con
 * `voiceEffect` (sílabas separadas + instrucción, primera sílaba, o la palabra entera).
 *
 * `props.speech` es obligatorio para esta plantilla (lanza si falta).
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

	// Las sílabas separadas son la pista 1 y se quedan: las pistas suben, no se retiran.
	const [separada, setSeparada] = useState(false);
	const [mode, setMode] = useState<"attempt" | "model">("attempt");
	// Mientras suena el audio de una pista el micrófono no responde: la voz del dispositivo no
	// puede contar como la del niño (P7). El tope evita que un audio colgado lo deje bloqueado.
	const [hintBusy, setHintBusy] = useState(false);
	const target = useMemo(() => speechTarget(item, accent), [item, accent]);
	const revelada = feedback !== null && feedback.resolution !== null;

	// Desmontaje a media pista: el audio se corta.
	useEffect(() => {
		return () => audio.stop();
	}, [audio]);

	// La pista que ordena el motor. Una vez por feedback nuevo, no por cada pintado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al feedback
	useEffect(() => {
		setMode("attempt");
		setHintBusy(false);
		const action = feedback?.hint?.action;
		if (action === undefined) return;
		const effect = voiceEffect({ action, item, content: curriculum });
		if (effect.kind === "none") return;
		if (effect.kind === "split") setSeparada(true);
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
			<div className="flex flex-col items-center gap-3 font-reading">
				<Palabra item={item} separada={separada} />
				{/* La imagen y el altavoz comparten fila: en 360 × 640 cada fila cuenta. */}
				<div className="flex items-center gap-4">
					{revelada ? (
						<Picture imageKey={item.imageKey} size="md" />
					) : (
						<TarjetaTapada />
					)}
					<ReplayButton
						aria-label="Oír otra vez"
						disabled={locked || hintBusy}
						onReplay={() => {
							// P8: repite la instrucción, nunca la palabra.
							audio
								.play({ key: `instruction:${exercise.templateId}` })
								.catch(() => {
									// Sin voz también se puede jugar.
								});
						}}
					/>
				</div>
			</div>
			<VoiceTurn
				mode={mode}
				target={target}
				disabled={locked || hintBusy}
				hideMic={hideMic}
				onVerdict={speech.onVerdict}
				onModelDone={props.onModelDone}
			/>
		</div>
	);
}
