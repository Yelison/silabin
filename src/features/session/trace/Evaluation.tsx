"use client";

import { useEffect, useRef, useState } from "react";
import { ReplayButton } from "@/components/ReplayButton";
import { type TraceAnimation, TraceCanvas } from "@/components/TraceCanvas";
import type { TraceGuide, TraceStroke } from "@/engine";
import { useAudio } from "@/features/app-context";
import type { EvaluationProps } from "@/features/session/registry";
import { traceEffect } from "@/features/session/trace/hint-effects";

/** Tras soltar el dedo, lo que se espera antes de dar el intento por cerrado. */
export const TRACE_IDLE_MS = 1500;

/**
 * «Repasa la letra»: el niño traza con el dedo sobre la guía que manda el motor. No puntúa ni
 * decide el nivel de guía (eso es del motor, D17): guarda los trazos cerrados del intento y,
 * tras `TRACE_IDLE_MS` sin tocar, los manda con `trace.onTrace` — o avisa con `onModelDone` si
 * está en el modo del tercer rung, que nunca puntúa.
 *
 * `props.trace` es obligatorio para esta plantilla (lanza si falta): `EvaluationProps` lo deja
 * opcional para no tocar las demás plantillas de toque.
 */
export function Evaluation(props: EvaluationProps) {
	const { exercise, item, attemptKey, feedback, locked, trace } = props;
	if (trace === undefined) {
		throw new Error(
			`El ejercicio ${exercise.id} es de trazo: necesita props.trace`,
		);
	}
	const { guide, onTrace } = trace;
	const audio = useAudio();

	const [animation, setAnimation] = useState<TraceAnimation>("none");
	const [animating, setAnimating] = useState(false);
	const [pulseStart, setPulseStart] = useState(false);
	const [ink, setInk] = useState<readonly TraceStroke[]>([]);
	const [submitted, setSubmitted] = useState(false);

	const strokesRef = useRef<TraceStroke[]>([]);
	const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const modelMode = useRef(false);
	const modelDone = useRef(false);
	const onTraceRef = useRef(onTrace);
	onTraceRef.current = onTrace;
	const onModelDoneRef = useRef(props.onModelDone);
	onModelDoneRef.current = props.onModelDone;

	// Guía congelada tras acertar (spec de `trace`, §4): mientras no está `locked` sigue a
	// `guide`, tal cual la manda el motor. En cuanto se bloquea (celebración) se queda con la
	// última que pintó, porque el motor ya subió la caja y `guide` daría un nivel más tenue
	// mientras el niño todavía está viendo el acierto.
	const guiaCongelada = useRef<TraceGuide>(guide);
	if (!locked) guiaCongelada.current = guide;
	const guiaMostrada = guiaCongelada.current;

	// Desmontaje a media pista: el audio se corta y el temporizador de inactividad no
	// sobrevive al componente.
	useEffect(() => {
		return () => {
			audio.stop();
			if (idleTimer.current !== null) clearTimeout(idleTimer.current);
		};
	}, [audio]);

	// Intento nuevo: se borra la tinta y cualquier temporizador pendiente, como en las demás
	// evaluaciones (`attemptKey`).
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al intento
	useEffect(() => {
		strokesRef.current = [];
		setInk([]);
		setSubmitted(false);
		modelMode.current = false;
		modelDone.current = false;
		setAnimation("none");
		setAnimating(false);
		setPulseStart(false);
		if (idleTimer.current !== null) {
			clearTimeout(idleTimer.current);
			idleTimer.current = null;
		}
	}, [attemptKey]);

	// La pista que ordena el motor. Una vez por feedback nuevo, no por cada pintado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al feedback
	useEffect(() => {
		setPulseStart(false);
		setAnimation("none");
		setAnimating(false);
		const action = feedback?.hint?.action;
		if (action === undefined) return;
		const effect = traceEffect({ action, item });
		switch (effect.kind) {
			case "none":
				return;
			case "pulse-start":
				setPulseStart(true);
				return;
			case "dot":
				setAnimating(true);
				setAnimation("dot");
				audio.play(effect.request).catch(() => {
					// El sonido acompaña, no manda: sin voz el lienzo se desbloquea igual, por
					// temporizador (mutación 4).
				});
				return;
			case "model":
				// El tercer fallo llega sin `attemptKey` nuevo (no es un intento más: es el
				// modelo del mismo intento ya resuelto como `assisted`), así que el efecto de
				// `attemptKey` no pasa por aquí para desbloquear ni limpiar la tinta errónea
				// del tercer intento. Se hace aquí, como en `build/Evaluation.tsx`.
				modelMode.current = true;
				modelDone.current = false;
				setSubmitted(false);
				strokesRef.current = [];
				setInk([]);
				if (idleTimer.current !== null) {
					clearTimeout(idleTimer.current);
					idleTimer.current = null;
				}
				setAnimating(true);
				setAnimation("full");
				return;
		}
	}, [feedback]);

	function cerrarIntento() {
		idleTimer.current = null;
		const strokes = strokesRef.current;
		if (modelMode.current) {
			// El rung 3 garantiza el acierto: cualquier intento cerrado con al menos un trazo
			// avisa del modelo, nunca puntúa ni pasa por `onTrace` (mutación 3).
			if (strokes.length === 0 || modelDone.current) return;
			modelDone.current = true;
			onModelDoneRef.current();
			return;
		}
		if (submitted) return;
		setSubmitted(true);
		onTraceRef.current(strokes);
	}

	function armarTemporizador() {
		if (idleTimer.current !== null) clearTimeout(idleTimer.current);
		idleTimer.current = setTimeout(cerrarIntento, TRACE_IDLE_MS);
	}

	function handleStrokeStart() {
		// Un trazo nuevo cancela la cuenta de inactividad (mutación 1): recolocarse entre
		// trazos, o tardar en empezar el siguiente, no debe cerrar el intento a medio gesto.
		if (idleTimer.current !== null) {
			clearTimeout(idleTimer.current);
			idleTimer.current = null;
		}
	}

	function handleStrokeEnd(stroke: TraceStroke) {
		strokesRef.current = [...strokesRef.current, stroke];
		setInk(strokesRef.current);
		armarTemporizador();
	}

	const disabled = locked || animating || submitted;

	return (
		<div className="flex flex-col items-center justify-center gap-4 landscape:flex-row landscape:gap-4">
			<ReplayButton
				aria-label="Oír otra vez"
				disabled={locked}
				onReplay={() => {
					audio.play({ key: item.audioKey }).catch(() => {
						// Sin voz también se puede jugar.
					});
				}}
			/>
			{/*
			 * El lienzo mide directamente contra el viewport (no contra el padre: la cadena de
			 * flex de SessionScreen centra sin estirar, así que un `h-full` aquí no tendría
			 * nada que llenar). En vertical, el botón va encima y el lienzo tiene todo el ancho
			 * corto para sí; en horizontal (`landscape:`) el botón se pone al lado para no
			 * comerle alto al lienzo, que es lo que limita el 60 % del lado corto pedido por el
			 * spec (apaisado 768 px de alto es más estrecho que ancho: ahí se decide todo).
			 */}
			<div className="flex h-[75vh] w-[88vw] items-center justify-center landscape:h-[85vh] landscape:w-[78vw]">
				<TraceCanvas
					glyph={guiaMostrada.glyph}
					level={guiaMostrada.level}
					strokes={ink}
					animation={animation}
					pulseStart={pulseStart}
					disabled={disabled}
					onStrokeStart={handleStrokeStart}
					onStrokeEnd={handleStrokeEnd}
					onAnimationEnd={() => {
						setAnimating(false);
						setAnimation("none");
					}}
				/>
			</div>
		</div>
	);
}
