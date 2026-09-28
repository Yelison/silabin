"use client";

import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Glyph, GlyphPoint, GuideLevel, TraceStroke } from "@/engine";

/** Milisegundos de animación por unidad de longitud de trazo (alturas de letra). */
export const ANIMATION_MS_PER_UNIT = 900;
/** Ninguna animación dura menos que esto: una letra muy corta no parpadearía. */
const ANIMATION_MS_MIN = 800;
/** Margen de la caja de la letra que entra en el `viewBox`, por lado. */
const MARGIN = 0.2;

function strokeLength(stroke: readonly GlyphPoint[]): number {
	let length = 0;
	for (let i = 1; i < stroke.length; i += 1) {
		const a = stroke[i - 1];
		const b = stroke[i];
		if (a === undefined || b === undefined) continue;
		length += Math.hypot(b.x - a.x, b.y - a.y);
	}
	return length;
}

/** Suma de longitudes de todos los trazos × `ANIMATION_MS_PER_UNIT`, con mínimo 800 ms. */
export function animationMs(glyph: Glyph): number {
	const total = glyph.strokes.reduce(
		(sum, stroke) => sum + strokeLength(stroke),
		0,
	);
	return Math.max(ANIMATION_MS_MIN, total * ANIMATION_MS_PER_UNIT);
}

export type TraceAnimation = "none" | "dot" | "full";

type ViewBox = { x: number; y: number; w: number; h: number };

function viewBoxOf(glyph: Glyph): ViewBox {
	return {
		x: -MARGIN,
		y: -MARGIN,
		w: glyph.width + 2 * MARGIN,
		h: 1 + 2 * MARGIN,
	};
}

/**
 * Coordenadas de pantalla → caja de la letra. Con `preserveAspectRatio="xMidYMid meet"` el
 * lienzo puede llevar bandas a los lados o arriba/abajo si su proporción no encaja con la del
 * `viewBox`; un toque en la banda cae, a propósito, fuera de la caja (x o y fuera de
 * `[-MARGIN, width/1+MARGIN]`). Si el lienzo todavía no tiene tamaño (montaje, rotación, o
 * `getBoundingClientRect` sin simular en jsdom), el evento se ignora: nunca se manda `NaN`
 * ni `Infinity` al motor.
 */
function toLetterSpace(
	clientX: number,
	clientY: number,
	rect: { left: number; top: number; width: number; height: number },
	vb: ViewBox,
): GlyphPoint | null {
	if (rect.width === 0 || rect.height === 0) return null;
	const s = Math.min(rect.width / vb.w, rect.height / vb.h);
	const ox = rect.left + (rect.width - vb.w * s) / 2;
	const oy = rect.top + (rect.height - vb.h * s) / 2;
	return { x: vb.x + (clientX - ox) / s, y: vb.y + (clientY - oy) / s };
}

function pathD(stroke: readonly GlyphPoint[]): string {
	return stroke.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
}

function combinedPathD(glyph: Glyph): string {
	return glyph.strokes.map(pathD).join(" ");
}

function pointsAttr(stroke: readonly GlyphPoint[]): string {
	return stroke.map((p) => `${p.x},${p.y}`).join(" ");
}

function strokeAngleDeg(stroke: readonly GlyphPoint[]): number {
	const b = stroke[stroke.length - 1];
	const a = stroke[Math.max(0, stroke.length - 2)];
	if (a === undefined || b === undefined) return 0;
	return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Igual que `strokeAngleDeg`, pero con los dos *primeros* puntos: la dirección de salida. */
function strokeStartAngleDeg(stroke: readonly GlyphPoint[]): number {
	const a = stroke[0];
	const b = stroke[1] ?? a;
	if (a === undefined || b === undefined) return 0;
	return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function sameStart(a: GlyphPoint, b: GlyphPoint): boolean {
	return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

/**
 * Distancia (en unidades de la caja de la letra) a la que se desplaza el marcador de inicio de
 * un trazo cuando coincide con el de otro trazo de la misma letra (candidato D18, Tarea 6: A, E,
 * M y P tienen dos trazos que empiezan en el mismo punto exacto). El círculo mide 0.07 de radio,
 * así que hacen falta ≥0.14 entre centros; con A y M, casi alineados, el ángulo entre sus dos
 * direcciones iniciales es pequeño (~43.6° y ~36.9°) y el desplazamiento mínimo que separa sus
 * marcadores esa distancia es ~0.189 y ~0.221 respectivamente — 0.24 deja margen para los dos.
 */
const START_MARKER_OFFSET = 0.24;

/**
 * Posición de pintado del marcador de inicio de cada trazo de `glyph`: la del propio trazo, o
 * desplazada a lo largo de su dirección inicial si coincide con la de otro trazo de la misma
 * letra. Trazos con inicio único no se mueven.
 */
function startMarkerPositions(glyph: Glyph): (GlyphPoint | undefined)[] {
	return glyph.strokes.map((stroke, i) => {
		const start = stroke[0];
		if (start === undefined) return undefined;
		const overlaps = glyph.strokes.some((other, j) => {
			if (j === i) return false;
			const otherStart = other[0];
			return otherStart !== undefined && sameStart(otherStart, start);
		});
		if (!overlaps) return start;
		const rad = (strokeStartAngleDeg(stroke) * Math.PI) / 180;
		return {
			x: start.x + START_MARKER_OFFSET * Math.cos(rad),
			y: start.y + START_MARKER_OFFSET * Math.sin(rad),
		};
	});
}

/** Grosor y atenuación del carril, según el nivel (grueso y visible → tenue → muy tenue). */
const LANE_WIDTH: Record<GuideLevel, number> = { 1: 0.06, 2: 0.035, 3: 0.02 };
const LANE_OPACITY: Record<GuideLevel, string> = {
	1: "opacity-100",
	2: "opacity-40",
	3: "opacity-[0.15]",
};

/**
 * Triángulo compartido por la flecha estática de fin de trazo (`guide-arrow-{n}`) y la guía de
 * dirección animada (`animation === "dot"`, Tarea 6). Crece de ~0.03-0.05 a ~0.06-0.08 unidades
 * (la prueba manual de la Tarea 5 la pidió más grande; mismo color `calm-border`, ya al mínimo
 * de contraste aceptado, no se toca). Apunta hacia +x: la estática la orienta con
 * `transform: rotate(...)` sobre `strokeAngleDeg`, la animada con `offset-rotate: auto` sobre el
 * `offsetPath` que ya recorre `combinedPathD`.
 */
export const TRACE_ARROW_POINTS = "-0.06,-0.07 0.08,0 -0.06,0.07";

/** Un trazo de un solo punto se pinta como un punto redondo, no como una línea vacía. */
function Ink(props: { stroke: readonly GlyphPoint[]; strokeWidthPx: number }) {
	const { stroke, strokeWidthPx } = props;
	const first = stroke[0];
	if (first === undefined) return null;
	if (stroke.length === 1) {
		return (
			<circle
				data-testid="ink"
				cx={first.x}
				cy={first.y}
				r={strokeWidthPx / 2}
				className="fill-trace-ink"
			/>
		);
	}
	return (
		<polyline
			data-testid="ink"
			points={pointsAttr(stroke)}
			fill="none"
			className="stroke-trace-ink"
			strokeWidth={strokeWidthPx}
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	);
}

/**
 * El lienzo de trazo: un SVG con la caja de la letra y su guía de 1 a 3 niveles. No puntúa ni
 * decide nada de pedagogía (eso vive en el motor, D17): solo pinta lo que le mandan y avisa de
 * los gestos con `onStrokeStart`/`onStrokeEnd`. La tinta ya cerrada del intento la lleva el
 * padre (`strokes`); el trazo en curso lo lleva el propio lienzo, para que un padre que se
 * repinta a medio gesto no lo corte.
 *
 * Solo el puntero primario dibuja (V3): un segundo dedo o la palma no pintan ni cortan el
 * trazo del primero. `pointerup` y `pointercancel` cierran igual, una sola vez (V4): en iOS un
 * gesto del sistema cancela a media letra y aun así hay que puntuar lo que llevaba.
 */
export function TraceCanvas(props: {
	glyph: Glyph;
	level: GuideLevel;
	strokes: readonly TraceStroke[];
	animation: TraceAnimation;
	onAnimationEnd?(): void;
	pulseStart?: boolean;
	disabled: boolean;
	onStrokeStart(): void;
	onStrokeEnd(stroke: TraceStroke): void;
	/**
	 * Duración de `animation === "dot"`, en ms. Por omisión es `animationMs(glyph)`, igual que
	 * antes (la pista 2 de `trace/Evaluation.tsx` no la pasa: sigue con la misma duración de
	 * siempre). `trace/Presentation.tsx` la pasa más corta cuando reutiliza "dot" para la guía de
	 * dirección animada que sigue al dibujo completo (Tarea 6, punto 3).
	 */
	dotDurationMs?: number;
}) {
	const {
		glyph,
		level,
		strokes,
		animation,
		onAnimationEnd,
		pulseStart = false,
		disabled,
		onStrokeStart,
		onStrokeEnd,
		dotDurationMs,
	} = props;

	const svgRef = useRef<SVGSVGElement>(null);
	const activePointer = useRef<number | null>(null);
	const currentStroke = useRef<TraceStroke>([]);
	const [liveStroke, setLiveStroke] = useState<TraceStroke>([]);
	const [revealed, setRevealed] = useState(false);
	const onStrokeStartRef = useRef(onStrokeStart);
	onStrokeStartRef.current = onStrokeStart;
	const onStrokeEndRef = useRef(onStrokeEnd);
	onStrokeEndRef.current = onStrokeEnd;
	const onAnimationEndRef = useRef(onAnimationEnd);
	onAnimationEndRef.current = onAnimationEnd;

	const vb = viewBoxOf(glyph);

	function pointFromEvent(e: {
		clientX: number;
		clientY: number;
	}): GlyphPoint | null {
		const svg = svgRef.current;
		if (svg === null) return null;
		return toLetterSpace(e.clientX, e.clientY, svg.getBoundingClientRect(), vb);
	}

	function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
		if (disabled || !e.isPrimary) return;
		const p = pointFromEvent(e);
		if (p === null) return;
		e.currentTarget.setPointerCapture?.(e.pointerId);
		activePointer.current = e.pointerId;
		currentStroke.current = [p];
		setLiveStroke([p]);
		onStrokeStartRef.current();
	}

	function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
		if (activePointer.current !== e.pointerId) return;
		const p = pointFromEvent(e);
		if (p === null) return;
		currentStroke.current = [...currentStroke.current, p];
		setLiveStroke(currentStroke.current);
	}

	function endStroke(e: ReactPointerEvent<SVGSVGElement>) {
		if (activePointer.current !== e.pointerId) return;
		activePointer.current = null;
		const stroke = currentStroke.current;
		currentStroke.current = [];
		setLiveStroke([]);
		onStrokeEndRef.current(stroke);
	}

	// La animación (pista 2 o 3) siempre acaba por temporizador, suene o no el audio, y aunque
	// jsdom no tenga eventos de animación de verdad. El punto/trazo revelado solo se mueve con
	// `motion-safe:`; con movimiento reducido aparece entero igual, porque `revealed` sigue
	// llegando a `true`, solo que sin transición que lo anime. Eso exige también
	// `motion-reduce:transition-none` en los elementos animados (Tarea 6): sin él,
	// `transition-property` cae a su valor inicial `all` cuando `motion-safe:` no aplica, y como
	// `transitionDuration`/`transitionDelay` van por estilo en línea (siempre activos), el
	// elemento se animaría igual, ignorando la preferencia del sistema.
	useEffect(() => {
		if (animation === "none") {
			setRevealed(false);
			return;
		}
		setRevealed(false);
		const duracion =
			animation === "dot"
				? (dotDurationMs ?? animationMs(glyph))
				: animationMs(glyph);
		const empezar = setTimeout(() => setRevealed(true), 0);
		const acabar = setTimeout(() => {
			onAnimationEndRef.current?.();
		}, duracion);
		return () => {
			clearTimeout(empezar);
			clearTimeout(acabar);
		};
	}, [animation, glyph, dotDurationMs]);

	const strokeWidthPx = LANE_WIDTH[1] + 0.01;
	const perStrokeMs =
		glyph.strokes.length === 0 ? 0 : animationMs(glyph) / glyph.strokes.length;
	const dotMs = dotDurationMs ?? animationMs(glyph);
	const markerPositions = startMarkerPositions(glyph);

	return (
		<svg
			ref={svgRef}
			viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
			preserveAspectRatio="xMidYMid meet"
			data-level={level}
			data-disabled={disabled ? "true" : undefined}
			aria-label="Lienzo para trazar la letra"
			style={{ touchAction: "none" }}
			className={`h-full max-h-full w-full max-w-full ${disabled ? "opacity-70" : ""}`}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endStroke}
			onPointerCancel={endStroke}
		>
			{glyph.strokes.map((stroke, i) => (
				<path
					// biome-ignore lint/suspicious/noArrayIndexKey: los trazos de una letra son fijos
					key={`lane-${i}`}
					data-testid="guide-lane"
					d={pathD(stroke)}
					fill="none"
					className={`stroke-calm-border ${LANE_OPACITY[level]}`}
					style={{ strokeWidth: LANE_WIDTH[level] }}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			))}
			{level === 1 &&
				glyph.strokes.map((stroke, i) => (
					<path
						// biome-ignore lint/suspicious/noArrayIndexKey: los trazos de una letra son fijos
						key={`dash-${i}`}
						data-testid="guide-dash"
						d={pathD(stroke)}
						fill="none"
						className="stroke-ink-soft"
						style={{ strokeWidth: 0.015, strokeDasharray: "0.04 0.05" }}
						strokeLinecap="round"
					/>
				))}
			{glyph.strokes.map((_stroke, i) => {
				const n = i + 1;
				if (level === 3 && n !== 1) return null;
				const marker = markerPositions[i];
				if (marker === undefined) return null;
				return (
					<g
						// biome-ignore lint/suspicious/noArrayIndexKey: los trazos de una letra son fijos
						key={`start-${i}`}
						data-testid={`guide-start-${n}`}
						data-pulse={pulseStart && n === 1 ? "true" : undefined}
						className={
							pulseStart && n === 1 ? "motion-safe:animate-pulse" : undefined
						}
					>
						<circle
							cx={marker.x}
							cy={marker.y}
							r={0.07}
							className="fill-card stroke-calm-border"
							style={{ strokeWidth: 0.015 }}
						/>
						<text
							x={marker.x}
							y={marker.y}
							textAnchor="middle"
							dominantBaseline="central"
							className="fill-ink-soft"
							style={{ fontSize: 0.09 }}
						>
							{n}
						</text>
					</g>
				);
			})}
			{level === 1 &&
				glyph.strokes.map((stroke, i) => {
					const end = stroke[stroke.length - 1];
					if (end === undefined) return null;
					const angle = strokeAngleDeg(stroke);
					return (
						<polygon
							// biome-ignore lint/suspicious/noArrayIndexKey: los trazos de una letra son fijos
							key={`arrow-${i}`}
							data-testid={`guide-arrow-${i + 1}`}
							points={TRACE_ARROW_POINTS}
							className="fill-calm-border"
							transform={`translate(${end.x} ${end.y}) rotate(${angle})`}
						/>
					);
				})}
			{strokes.map((stroke, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: la tinta cerrada solo crece al final
				<Ink key={`ink-${i}`} stroke={stroke} strokeWidthPx={strokeWidthPx} />
			))}
			{liveStroke.length > 0 && (
				<Ink stroke={liveStroke} strokeWidthPx={strokeWidthPx} />
			)}
			{animation === "full" &&
				glyph.strokes.map((stroke, i) => (
					<path
						// biome-ignore lint/suspicious/noArrayIndexKey: los trazos de una letra son fijos
						key={`full-${i}`}
						data-testid="anim-full"
						d={pathD(stroke)}
						pathLength={1}
						fill="none"
						className="stroke-trace-ink motion-safe:transition-[stroke-dashoffset] motion-safe:ease-linear motion-reduce:transition-none"
						style={{
							strokeWidth: strokeWidthPx,
							strokeDasharray: 1,
							strokeDashoffset: revealed ? 0 : 1,
							transitionDuration: `${perStrokeMs}ms`,
							transitionDelay: `${i * perStrokeMs}ms`,
						}}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				))}
			{animation === "dot" && (
				<polygon
					data-testid="anim-dot"
					points={TRACE_ARROW_POINTS}
					className="fill-trace-ink motion-safe:transition-[offset-distance] motion-safe:ease-linear motion-reduce:transition-none"
					style={{
						offsetPath: `path('${combinedPathD(glyph)}')`,
						offsetDistance: revealed ? "100%" : "0%",
						offsetRotate: "auto",
						transitionDuration: `${dotMs}ms`,
					}}
				/>
			)}
		</svg>
	);
}
