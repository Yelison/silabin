import { expect, type Page, test } from "@playwright/test";
import { curriculum } from "@/engine";
import { emptyPersistedState, persistedStateSchema } from "@/store/schema";
import { empezar } from "./helpers/documentos";
import { sembrar } from "./helpers/seed";

// Plan 8, T3: el camino en serpiente. Proyecto `iphone` (Chromium), progreso nuevo.
// Disposición esperada: < 768 px → onda de una columna (3 posiciones horizontales distintas con
// los 5 nodos de la Fase 1), 768-1023 → serpiente de 3 columnas, ≥ 1024 → serpiente de 5 (MP9, MC3).
const VIEWPORTS = [
	{ width: 320, height: 640, layout: "base", columnas: 3 },
	{ width: 390, height: 844, layout: "base", columnas: 3 },
	{ width: 834, height: 1194, layout: "md", columnas: 3 },
	{ width: 1194, height: 834, layout: "lg", columnas: 5 },
] as const;

/** Solo `phase0:clap` terminada (con una estrella de menos, para que salga la pastilla ★★). */
function docClapHecha() {
	const doc = emptyPersistedState();
	const clap = curriculum.units.get("phase0:clap");
	if (!clap) throw new Error("sin phase0:clap");
	for (const id of clap.introduces)
		doc.items[id] = {
			box: 3,
			presented: true,
			firstTryCorrect: 3,
			assisted: 0,
			lastSessionIndex: 0,
			lastCreditSession: null,
			masteredAt: "2026-09-30T10:00:00.000Z",
		};
	doc.units["phase0:clap"] = { status: "done", bestStars: 2 };
	return persistedStateSchema.parse(doc);
}

type Caja = { l: number; t: number; r: number; b: number };

async function cajasDeUnidades(page: Page, ambito = "main") {
	return page.locator(`${ambito} [data-unit]`).evaluateAll((els) =>
		els.map((e) => {
			const r = e.getBoundingClientRect();
			return {
				id: e.getAttribute("data-unit") ?? "",
				w: r.width,
				h: r.height,
				l: r.left,
				t: r.top,
				r: r.right,
				b: r.bottom,
			};
		}),
	);
}

const separacion = (a: Caja, b: Caja) =>
	Math.max(b.l - a.r, a.l - b.r, b.t - a.b, a.t - b.b);

for (const vp of VIEWPORTS) {
	test.describe(`mapa ${vp.width}×${vp.height}`, () => {
		test.beforeEach(async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto("/");
			await empezar(page);
			await expect(page.locator("[data-unit]").first()).toBeVisible();
		});

		test(`de los tres caminos de la Fase 1 solo se ve el de la disposición ${vp.layout}`, async ({
			page,
		}) => {
			const visibles = page.locator(
				"section[aria-label='Fase 1'] svg[data-layout]:visible",
			);
			await expect(visibles).toHaveCount(1);
			await expect(visibles).toHaveAttribute("data-layout", vp.layout);
		});

		test("una unidad terminada (con su pastilla de estrellas) tiene la ficha a la altura de su vecina", async ({
			page,
		}) => {
			await sembrar(page, docClapHecha());
			await empezar(page);
			// Con la onda cada nodo va en su fila: se compara el centro de la ficha con el de su
			// celda, no con el del vecino. Si las estrellas empujaran la ficha, se desviaría.
			const centro = (id: string) =>
				page
					.locator(`[data-unit="${id}"] > span`)
					.first()
					.evaluate((e) => {
						const r = e.getBoundingClientRect();
						const c = (
							e.closest("[data-unit]")?.parentElement ?? e
						).getBoundingClientRect();
						return {
							y: r.top + r.height / 2 - (c.top + c.height / 2),
							h: r.height,
						};
					});
			await expect(page.locator('[data-unit="phase0:clap"]')).toHaveAttribute(
				"data-look",
				"completed",
			);
			const clap = await centro("phase0:clap");
			const rhyme = await centro("phase0:rhyme");
			expect(clap.h, "alto de la ficha de clap").toBeCloseTo(88, 0);
			expect(rhyme.h, "alto de la ficha de rhyme").toBeCloseTo(88, 0);
			expect(Math.abs(clap.y - rhyme.y)).toBeLessThanOrEqual(1);
		});

		test("sin scroll horizontal", async ({ page }) => {
			const { scroll, ancho } = await page.evaluate(() => ({
				scroll: document.documentElement.scrollWidth,
				ancho: innerWidth,
			}));
			expect(scroll).toBeLessThanOrEqual(ancho);
		});

		test(`la Fase 1 se reparte en ${vp.columnas} posiciones horizontales (${vp.layout})`, async ({
			page,
		}) => {
			const fase = page.getByRole("region", { name: "Fase 1" });
			const cajas = await fase.locator("[data-unit]").evaluateAll((els) =>
				els.map((e) => {
					const r = e.getBoundingClientRect();
					return Math.round(r.left + r.width / 2);
				}),
			);
			expect(cajas).toHaveLength(5);
			expect(new Set(cajas).size).toBe(vp.columnas);
		});

		test("los nodos miden al menos 72 px y quedan a 16 px o más de su vecino", async ({
			page,
		}) => {
			const cajas = await cajasDeUnidades(page);
			expect(cajas.length).toBeGreaterThan(5);
			for (const c of cajas) {
				expect(c.w, `ancho ${c.id}`).toBeGreaterThanOrEqual(71.5);
				expect(c.h, `alto ${c.id}`).toBeGreaterThanOrEqual(71.5);
			}
			for (let i = 1; i < cajas.length; i++) {
				const a = cajas[i - 1];
				const b = cajas[i];
				if (!a || !b) continue;
				expect(separacion(a, b), `${a.id} → ${b.id}`).toBeGreaterThanOrEqual(
					15.5,
				);
			}
		});

		test("el camino no recibe toques y un clic real en la unidad activa arranca la sesión", async ({
			page,
		}) => {
			const caminos = page.locator("svg[data-layout]:visible");
			expect(await caminos.count()).toBeGreaterThan(0);
			for (const svg of await caminos.all())
				await expect(svg).toHaveCSS("pointer-events", "none");
			await page.locator('[data-status="active"]').first().click();
			await expect(page.locator("[data-unit]")).toHaveCount(0);
		});
	});
}
