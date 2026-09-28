import type { GlyphPoint } from "@/content/glyphs";
import { SAMPLE_STEP, type TraceStroke } from "@/engine/trace";

/**
 * Reimplementación del remuestreo de `trace.ts`, solo para construir tinta de prueba: no se
 * exporta desde `trace.ts` porque es un detalle interno de producción, así que los tests que
 * necesitan datos remuestreados (el "temblor" de G2/G14) la comparten desde aquí en vez de
 * duplicarla en cada fichero de test.
 */
export function resampleForTest(stroke: readonly GlyphPoint[]): GlyphPoint[] {
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

/** El "temblor" de G2/G14: remuestrea cada trazo y desplaza su muestra i. */
export function withTremor(strokes: readonly GlyphPoint[][]): TraceStroke[] {
	return strokes.map((stroke) =>
		resampleForTest(stroke).map((p, i) => ({
			x: p.x + (i % 2 === 1 ? 0.08 : -0.08),
			y: p.y + (i % 3 !== 0 ? 0.04 : -0.04),
		})),
	);
}
