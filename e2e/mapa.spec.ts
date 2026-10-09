import { expect, type Page, test } from "@playwright/test";
import { empezar } from "./helpers/documentos";

// Plan 8, T3: el camino en serpiente. Proyecto `iphone` (Chromium), progreso nuevo.
// Columnas esperadas: < 768 px → 2, 768-1023 → 3, ≥ 1024 → 5 (MP9).
const VIEWPORTS = [
	{ width: 320, height: 640, columnas: 2 },
	{ width: 390, height: 844, columnas: 2 },
	{ width: 834, height: 1194, columnas: 3 },
	{ width: 1194, height: 834, columnas: 5 },
] as const;

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

		test("sin scroll horizontal", async ({ page }) => {
			const { scroll, ancho } = await page.evaluate(() => ({
				scroll: document.documentElement.scrollWidth,
				ancho: innerWidth,
			}));
			expect(scroll).toBeLessThanOrEqual(ancho);
		});

		test(`la Fase 1 se reparte en ${vp.columnas} columnas`, async ({
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
			const caminos = page.locator("svg[data-columns]:visible");
			expect(await caminos.count()).toBeGreaterThan(0);
			for (const svg of await caminos.all())
				await expect(svg).toHaveCSS("pointer-events", "none");
			await page.locator('[data-status="active"]').first().click();
			await expect(page.locator("[data-unit]")).toHaveCount(0);
		});
	});
}
