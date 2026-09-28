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
 * Botón de «Borrar»/«Listo»: misma forma y tamaño que `ReplayButton`, con un emoji provisional
 * como contenido en vez de un `Icon`. S21 (registro del Plan 6) fija iconos provisionales con
 * emoji para borrar/listo hasta el Plan 7: darles una entrada en `ICON_NAMES` ahora exigiría un
 * PNG real que ese plan va a reemplazar de todos modos.
 */
function BotonAccion(props: {
	emoji: string;
	"aria-label": string;
	onClick: () => void;
}) {
	const { emoji, onClick, ...rest } = props;
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex min-h-18 min-w-18 items-center justify-center rounded-card bg-action p-4 text-action-ink shadow-md active:scale-95"
			{...rest}
		>
			<span aria-hidden="true">{emoji}</span>
		</button>
	);
}

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
	const { guide, onTrace, clearKey } = trace;
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
	// Un ref: el temporizador de inactividad cierra el intento con lo que había al armarse, y
	// `acceptsModel` cambia de identidad (y de corrida) en cada pintado de la sesión.
	const acceptsModelRef = useRef(trace.acceptsModel);
	acceptsModelRef.current = trace.acceptsModel;

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

	// D19: el motor ignoró el trazo (tinta despreciable). No es un intento nuevo: se borra la
	// tinta y el envío para poder volver a trazar, y NADA MÁS. Ni `pulseStart` ni `animation`:
	// la pista que se estaba mostrando sigue, que es lo que un toque sin querer no debe quitar.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo a `clearKey`
	useEffect(() => {
		strokesRef.current = [];
		setInk([]);
		setSubmitted(false);
		if (idleTimer.current !== null) {
			clearTimeout(idleTimer.current);
			idleTimer.current = null;
		}
	}, [clearKey]);

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
			// El rung 3 garantiza el acierto: un intento cerrado que el motor da por bueno avisa
			// del modelo, nunca puntúa ni pasa por `onTrace` (mutación 3).
			if (strokes.length === 0 || modelDone.current) return;
			// D19 en el modelo (P12): la tinta despreciable no lo cierra. Lo decide el motor; aquí
			// solo se borra y se sigue esperando.
			if (!acceptsModelRef.current(strokes)) {
				strokesRef.current = [];
				setInk([]);
				return;
			}
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

	// Los dos botones cancelan el temporizador de inactividad antes de tocar nada: si no, el
	// `setTimeout` que ya estaba armado (con el `cerrarIntento` de un pintado anterior, que
	// cerró sobre `submitted = false` de entonces) vuelve a dispararse más tarde y manda un
	// segundo envío, esta vez con la tinta que dejó «Borrar» o «Listo» tras de sí.
	function cancelarTemporizador() {
		if (idleTimer.current !== null) {
			clearTimeout(idleTimer.current);
			idleTimer.current = null;
		}
	}

	/** «Borrar»: vacía el intento en curso. No es un envío: no toca el motor ni el audio. */
	function handleBorrar() {
		cancelarTemporizador();
		strokesRef.current = [];
		setInk([]);
	}

	/** «Listo»: el mismo camino que el temporizador, pero en el acto. */
	function handleListo() {
		cancelarTemporizador();
		cerrarIntento();
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
	// Borrar/Listo (D31b, S9): solo con algo que borrar o confirmar, y nunca mientras el
	// lienzo está bloqueado, se anima una pista o el intento ya se envió — momentos en los que
	// tocarlos no tendría nada que hacer, o («Borrar» sobre la celebración) borraría el acierto
	// que el niño está mirando.
	const mostrarBotones = ink.length > 0 && !disabled;

	return (
		<div className="flex flex-col items-center justify-center gap-4 landscape:flex-row landscape:gap-4">
			{/*
			 * Repetir, Borrar y Listo van juntos, en la franja que antes solo tenía Repetir: fila
			 * en vertical, columna en horizontal (`landscape:`), la orientación contraria a la
			 * del contenedor de fuera. Borrar y Listo se pintan dentro de un hueco de 72×72
			 * SIEMPRE montado (aparezcan o no) para que la franja no cambie de tamaño al soltar
			 * el primer trazo: si cambiara, el lienzo —que este mismo `flex` centra al lado—
			 * saltaría justo cuando el niño va a hacer el siguiente trazo.
			 */}
			<div className="flex flex-row items-center justify-center gap-4 landscape:flex-col">
				<ReplayButton
					aria-label="Oír otra vez"
					disabled={locked}
					onReplay={() => {
						audio.play({ key: item.audioKey }).catch(() => {
							// Sin voz también se puede jugar.
						});
					}}
				/>
				<div className="flex h-18 w-18 items-center justify-center">
					{mostrarBotones && (
						<BotonAccion
							emoji="🧽"
							aria-label="Borrar"
							onClick={handleBorrar}
						/>
					)}
				</div>
				<div className="flex h-18 w-18 items-center justify-center">
					{mostrarBotones && (
						<BotonAccion emoji="👍" aria-label="Listo" onClick={handleListo} />
					)}
				</div>
			</div>
			{/*
			 * El lienzo mide directamente contra el viewport (no contra el padre: la cadena de
			 * flex de SessionScreen centra sin estirar, así que un `h-full` aquí no tendría
			 * nada que llenar). En vertical, la franja de botones va encima y el lienzo tiene
			 * todo el ancho corto para sí, así que lo que decide el tamaño es el ancho (88vw),
			 * no el alto: por eso el alto se recorta a 65vh, lo justo para que la franja (72 px,
			 * igual con uno o con tres botones: el ancho de la franja no consume alto) + el
			 * hueco no empujen la página a hacer scroll en 360×640, sin que la letra pierda nada
			 * (sigue limitada por el ancho). En horizontal (`landscape:`) la franja se pone al
			 * lado, ahora de tres botones en columna (3×72 + 2×16 = 248 px, dentro de los ~328 px
			 * que quedan libres de los 360 px de alto en apaisado 640×360) para no comerle alto
			 * al lienzo, que ahí sí es quien decide el 60 % del lado corto pedido por el spec.
			 */}
			<div className="flex h-[65vh] w-[88vw] items-center justify-center landscape:h-[85vh] landscape:w-[78vw]">
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
