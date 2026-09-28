import type { Glyph, GlyphPoint } from "@/content/glyphs";
import type { Box } from "@/engine/types";

/** Tolerancia de cercanía, en alturas de letra (la caja del glifo mide 1 de alto). */
export const TOLERANCE = 0.15;
/** Cobertura mínima exigida a cada trazo de la letra por separado. */
export const MIN_COVERAGE = 0.75;
/** Precisión mínima exigida sobre el total de la tinta. */
export const MIN_PRECISION = 0.8;
/** Paso de remuestreo, en alturas de letra. */
export const SAMPLE_STEP = 0.02;

/** Fracción de la longitud del glifo por debajo de la cual la tinta se considera un toque sin querer. */
export const ACCIDENTAL_INK_RATIO = 0.1;

export type TraceStroke = GlyphPoint[];
export type TraceScore = {
	correct: boolean;
	coverage: number[];
	precision: number;
};

function isFinitePoint(p: GlyphPoint): boolean {
	return Number.isFinite(p.x) && Number.isFinite(p.y);
}

/**
 * El primer punto, un punto cada `SAMPLE_STEP` de longitud recorrida (arrastrando el
 * sobrante de un segmento al siguiente) y el último punto. Un trazo de un punto se
 * queda en ese punto.
 */
function resample(stroke: readonly GlyphPoint[]): GlyphPoint[] {
	const first = stroke[0];
	if (first === undefined) return [];
	if (stroke.length === 1) return [first];

	const out: GlyphPoint[] = [first];
	let traveled = 0;
	let nextSample = SAMPLE_STEP;
	for (let i = 1; i < stroke.length; i += 1) {
		const a = stroke[i - 1];
		const b = stroke[i];
		if (a === undefined || b === undefined) continue;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const segLen = Math.hypot(dx, dy);
		if (segLen === 0) continue;
		while (nextSample <= traveled + segLen) {
			const t = (nextSample - traveled) / segLen;
			out.push({ x: a.x + dx * t, y: a.y + dy * t });
			nextSample += SAMPLE_STEP;
		}
		traveled += segLen;
	}

	const last = stroke[stroke.length - 1];
	const lastOut = out[out.length - 1];
	if (
		last !== undefined &&
		(lastOut === undefined || lastOut.x !== last.x || lastOut.y !== last.y)
	) {
		out.push(last);
	}
	return out;
}

/** Distancia mínima de `p` a un segmento (`a`,`b`). Un segmento de longitud 0 es su punto. */
function pointToSegmentDistance(
	p: GlyphPoint,
	a: GlyphPoint,
	b: GlyphPoint,
): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSq = dx * dx + dy * dy;
	if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
	const t = Math.max(
		0,
		Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
	);
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distancia mínima de `p` a un trazo: la mínima a sus segmentos (un trazo de un solo
 * punto es ese punto). */
function distanceToStroke(
	p: GlyphPoint,
	stroke: readonly GlyphPoint[],
): number {
	const first = stroke[0];
	if (first === undefined) return Number.POSITIVE_INFINITY;
	if (stroke.length === 1) return Math.hypot(p.x - first.x, p.y - first.y);
	let min = Number.POSITIVE_INFINITY;
	for (let i = 1; i < stroke.length; i += 1) {
		const a = stroke[i - 1];
		const b = stroke[i];
		if (a === undefined || b === undefined) continue;
		const d = pointToSegmentDistance(p, a, b);
		if (d < min) min = d;
	}
	return min;
}

function isNearAny(
	p: GlyphPoint,
	strokes: readonly (readonly GlyphPoint[])[],
): boolean {
	return strokes.some((stroke) => distanceToStroke(p, stroke) <= TOLERANCE);
}

/**
 * Puntúa el trazo del niño contra la geometría de referencia de `glyph`. El orden de los
 * trazos y su dirección no cuentan. Los puntos con coordenadas no finitas se descartan
 * antes de nada; un trazo que se queda sin puntos se ignora.
 */
export function scoreTrace(
	glyph: Glyph,
	strokes: readonly TraceStroke[],
): TraceScore {
	const inkStrokes = strokes
		.map((stroke) => stroke.filter(isFinitePoint))
		.filter((stroke) => stroke.length > 0);

	if (inkStrokes.length === 0) {
		return {
			correct: false,
			coverage: glyph.strokes.map(() => 0),
			precision: 0,
		};
	}

	const coverage = glyph.strokes.map((letterStroke) => {
		const samples = resample(letterStroke);
		if (samples.length === 0) return 0;
		const near = samples.filter((p) => isNearAny(p, inkStrokes)).length;
		return near / samples.length;
	});

	const inkSamples = inkStrokes.flatMap((stroke) => resample(stroke));
	const nearLetter = inkSamples.filter((p) =>
		isNearAny(p, glyph.strokes),
	).length;
	const precision =
		inkSamples.length === 0 ? 0 : nearLetter / inkSamples.length;

	const correct =
		coverage.every((c) => c >= MIN_COVERAGE) && precision >= MIN_PRECISION;

	return { correct, coverage, precision };
}

/** Longitud de una polilínea; los puntos no finitos se descartan antes de medir. */
function polylineLength(stroke: readonly GlyphPoint[]): number {
	const points = stroke.filter(isFinitePoint);
	let total = 0;
	for (let i = 1; i < points.length; i += 1) {
		const a = points[i - 1];
		const b = points[i];
		if (a === undefined || b === undefined) continue;
		total += Math.hypot(b.x - a.x, b.y - a.y);
	}
	return total;
}

/**
 * D19: un toque sin querer no debe gastar un intento ni una pista. La tinta total (suma de las
 * longitudes de las polilíneas, solo con puntos finitos) es despreciable si es estrictamente
 * menor que `ACCIDENTAL_INK_RATIO` veces la longitud total de los trazos del glifo.
 */
export function isNegligibleTrace(
	glyph: Glyph,
	strokes: readonly TraceStroke[],
): boolean {
	const ink = strokes.reduce((sum, s) => sum + polylineLength(s), 0);
	const reference = glyph.strokes.reduce(
		(sum, s) => sum + polylineLength(s),
		0,
	);
	return ink < ACCIDENTAL_INK_RATIO * reference;
}

export type GuideLevel = 1 | 2 | 3;

/**
 * Nivel de guía base según la caja (0 → 1; 1 → 2; 2 y 3 → 3), reducido en uno con 1 o 2
 * pistas mostradas (mínimo 1), y siempre 1 con 3 pistas.
 */
export function guideLevel(box: Box, hintsShown: 0 | 1 | 2 | 3): GuideLevel {
	const base: GuideLevel = box === 0 ? 1 : box === 1 ? 2 : 3;
	if (hintsShown === 3) return 1;
	if (hintsShown === 1 || hintsShown === 2) {
		return Math.max(1, base - 1) as GuideLevel;
	}
	return base;
}
