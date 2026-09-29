import type { CDPSession, Page } from "@playwright/test";

type Punto = { x: number; y: number };

/** Lo que se lee del lienzo: sus vértices de guía (unidades de la letra), su viewBox y su caja. */
type Lienzo = {
	trazos: Punto[][];
	vb: { x: number; y: number; w: number; h: number };
	rect: { left: number; top: number; width: number; height: number };
};

const LIENZO = 'svg[aria-label="Lienzo para trazar la letra"]';
/** Puntos intermedios por tramo: el trazo llega denso al motor, como un dedo real. */
const PASOS_POR_TRAMO = 6;

/**
 * Lee del DOM el mismo glifo que pinta `TraceCanvas`: las sendas `guide-lane` llevan los
 * vértices de cada trazo en unidades de la letra, y el `viewBox` es la caja. Así no hace falta
 * conocer qué letra toca ni tocar producción.
 */
async function leerLienzo(page: Page): Promise<Lienzo> {
	return page.locator(LIENZO).evaluate((svg) => {
		const vbTxt = svg.getAttribute("viewBox") ?? "";
		const [x = 0, y = 0, w = 1, h = 1] = vbTxt.split(/\s+/).map(Number);
		const trazos = Array.from(
			svg.querySelectorAll('[data-testid="guide-lane"]'),
		).map((path) => {
			const nums = (path.getAttribute("d") ?? "").match(/-?\d*\.?\d+/g) ?? [];
			const pts: { x: number; y: number }[] = [];
			for (let i = 0; i + 1 < nums.length; i += 2) {
				pts.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
			}
			return pts;
		});
		const r = svg.getBoundingClientRect();
		return {
			trazos,
			vb: { x, y, w, h },
			rect: { left: r.left, top: r.top, width: r.width, height: r.height },
		};
	});
}

/** La misma transformación que `toLetterSpace` de `TraceCanvas`, a la inversa. */
function aPantalla(p: Punto, l: Lienzo): Punto {
	const s = Math.min(l.rect.width / l.vb.w, l.rect.height / l.vb.h);
	const ox = l.rect.left + (l.rect.width - l.vb.w * s) / 2;
	const oy = l.rect.top + (l.rect.height - l.vb.h * s) / 2;
	return { x: ox + (p.x - l.vb.x) * s, y: oy + (p.y - l.vb.y) * s };
}

function interpolar(pts: readonly Punto[]): Punto[] {
	const fuera: Punto[] = [];
	for (let i = 0; i < pts.length; i += 1) {
		const a = pts[i];
		if (a === undefined) continue;
		fuera.push(a);
		const b = pts[i + 1];
		if (b === undefined) continue;
		for (let k = 1; k < PASOS_POR_TRAMO; k += 1) {
			const t = k / PASOS_POR_TRAMO;
			fuera.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
		}
	}
	return fuera;
}

const toque = (p: Punto) => [{ x: p.x, y: p.y, id: 1 }];

async function trazar(cdp: CDPSession, pts: readonly Punto[]): Promise<void> {
	const [primero, ...resto] = pts;
	if (primero === undefined) return;
	await cdp.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: toque(primero),
	});
	for (const p of resto) {
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: toque(p),
		});
	}
	await cdp.send("Input.dispatchTouchEvent", {
		type: "touchEnd",
		touchPoints: [],
	});
}

/** Dibuja el glifo entero con toques por CDP y pulsa «Listo» (T4). Solo Chromium. */
export async function dibujarGlifo(page: Page): Promise<Punto[][]> {
	const lienzo = await leerLienzo(page);
	const cdp = await page.context().newCDPSession(page);
	try {
		for (const trazo of lienzo.trazos) {
			const puntos = interpolar(trazo).map((p) => aPantalla(p, lienzo));
			await trazar(cdp, puntos);
		}
	} finally {
		await cdp.detach();
	}
	await page.getByRole("button", { name: "Listo" }).click();
	return lienzo.trazos;
}
