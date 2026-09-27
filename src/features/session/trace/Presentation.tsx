"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { type TraceAnimation, TraceCanvas } from "@/components/TraceCanvas";
import { glyphFor, type TraceStroke } from "@/engine";
import { useAudio } from "@/features/app-context";
import { Written } from "@/features/session/listen-tap/Written";
import type { PresentationProps } from "@/features/session/registry";

/**
 * Introducción sin error de `trace` (spec §2, D12): la mayúscula se dibuja sola en nivel 1
 * antes de pedir que se trace. El par a/A va siempre visible, como en las demás presentaciones.
 * `glyphFor` solo tiene mayúsculas por ahora (D16).
 *
 * El botón «Siguiente» aparece cuando el lienzo avisa de que acabó su animación
 * (`onAnimationEnd`, por el temporizador de `animationMs` en `TraceCanvas`), nunca cuando
 * termina el audio: si no hay voz se sigue jugando igual.
 *
 * El niño puede repasar la letra mientras tanto: se pinta su tinta (`disabled={false}`, sin
 * bloquear durante la animación, a diferencia de la evaluación), pero no se puntúa ni se manda
 * a ningún sitio — eso es solo de `trace/Evaluation.tsx`.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const glyph = glyphFor(item, "upper");

	const [ready, setReady] = useState(false);
	const [animation, setAnimation] = useState<TraceAnimation>("full");
	const [ink, setInk] = useState<readonly TraceStroke[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: el sonido va una vez por ítem montado
	useEffect(() => {
		void audio.play({ key: item.audioKey }).catch(() => {
			// Sin voz también se puede seguir.
		});
		return () => {
			// También cubre el doble montaje del modo estricto: la primera pasada se corta
			// antes de sonar y solo queda la segunda.
			audio.stop();
		};
	}, []);

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="flex h-32 items-center justify-center font-reading">
				<Written item={item} size="lg" />
			</div>
			{/*
			 * En 360×640 quedan 528 px bajo el encabezado y el relleno de `SessionScreen`
			 * (640 − 80 de encabezado − 32 de relleno). El par (h-32 = 128), el hueco del botón
			 * (h-28 = 112) y los dos huecos de `gap-4` (32) ya suman 272: al lienzo le caben
			 * como mucho 256 (40vh). 38vh dejan margen sin costarle tamaño a la letra, que en
			 * vertical manda el ancho (82vw), no el alto (como en `trace/Evaluation.tsx`).
			 */}
			<div className="flex h-[38vh] w-[82vw] items-center justify-center">
				<TraceCanvas
					glyph={glyph}
					level={1}
					strokes={ink}
					animation={animation}
					disabled={false}
					onStrokeStart={() => {}}
					onStrokeEnd={(stroke) => setInk((prev) => [...prev, stroke])}
					onAnimationEnd={() => {
						// La letra dibujada se apaga al acabar: si se quedara en "full" taparía
						// exactamente la tinta del niño donde su repaso coincide con el trazo.
						setAnimation("none");
						setReady(true);
					}}
				/>
			</div>
			<div className="flex h-28 items-center">
				{ready && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						<Icon name="next" />
					</BigButton>
				)}
			</div>
		</div>
	);
}
