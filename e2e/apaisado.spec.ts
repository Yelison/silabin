import { expect, type Page, test } from "@playwright/test";
import {
	avanzarHasta,
	docConSilabas,
	docHasta,
	empezar,
} from "./helpers/documentos";
import { fijarSemilla, sembrar } from "./helpers/seed";
import { resolverSesion } from "./helpers/solve";

// Defecto B (Plan 7, T8): en móvil apaisado bajo, ni `trace`, ni `build`, ni el fin de
// sesión pueden hacer scroll ni sacar un control del viewport. Proyecto `iphone` (Chromium).
const VIEWPORTS = [
	{ width: 640, height: 360 },
	{ width: 667, height: 375 },
	{ width: 852, height: 393 },
	{ width: 360, height: 640 },
	{ width: 1194, height: 834 },
] as const;

// Alto del lienzo de `trace` en 1194×834 medido antes de tocar los estilos (T8): no puede encoger.
const LIENZO_IPAD_ANTES = 708.89;

type Caja = {
	l: number;
	t: number;
	r: number;
	b: number;
	w: number;
	h: number;
};

async function cajas(page: Page, selector: string): Promise<Caja[]> {
	return page.locator(selector).evaluateAll((els) =>
		els
			.map((e) => e.getBoundingClientRect())
			.filter((r) => r.width > 0 && r.height > 0)
			.map((r) => ({
				l: r.left,
				t: r.top,
				r: r.right,
				b: r.bottom,
				w: r.width,
				h: r.height,
			})),
	);
}

async function medir(page: Page) {
	const base = await page.evaluate(() => ({
		scroll: document.documentElement.scrollHeight - innerHeight,
		vw: innerWidth,
		vh: innerHeight,
	}));
	return base;
}

function dentro(c: Caja, vw: number, vh: number, nombre: string) {
	const m = JSON.stringify(c);
	expect(c.l, `${nombre} izq ${m}`).toBeGreaterThanOrEqual(-0.5);
	expect(c.t, `${nombre} arriba ${m}`).toBeGreaterThanOrEqual(-0.5);
	expect(c.r, `${nombre} der ${m}`).toBeLessThanOrEqual(vw + 0.5);
	expect(c.b, `${nombre} abajo ${m}`).toBeLessThanOrEqual(vh + 0.5);
}

for (const vp of VIEWPORTS) {
	const etiqueta = `${vp.width}×${vp.height}`;

	test.describe(etiqueta, () => {
		test.beforeEach(async ({ page }) => {
			await page.setViewportSize(vp);
		});

		test("trace: sin tinta y con tinta, sin scroll y con botones enteros", async ({
			page,
		}) => {
			await fijarSemilla(page, 7);
			await sembrar(page, docHasta(1));
			await empezar(page);
			await page.locator('[data-status="active"]').first().click();
			await avanzarHasta(page, "trace");
			await page.waitForTimeout(1500);

			const comprobar = async (momento: string, conBotones: boolean) => {
				const { scroll, vw, vh } = await medir(page);
				expect(scroll, `scroll ${momento}`).toBeLessThanOrEqual(0);
				const [lienzo] = await cajas(
					page,
					'svg[aria-label="Lienzo para trazar la letra"]',
				);
				expect(lienzo).toBeDefined();
				if (!lienzo) return;
				expect(
					Math.min(lienzo.w, lienzo.h),
					`lienzo ${momento}`,
				).toBeGreaterThanOrEqual(0.6 * Math.min(vw, vh) - 0.5);
				const [listo] = await cajas(page, '[aria-label="Listo"]');
				console.log(
					"MEDIDA",
					etiqueta,
					momento,
					`scroll=${scroll} lienzo=${Math.round(lienzo.h)}x${Math.round(lienzo.w)} listo.b=${listo ? Math.round(listo.b) : "-"}`,
				);
				if (vp.width === 1194)
					expect(lienzo.h, "lienzo iPad").toBeGreaterThanOrEqual(
						LIENZO_IPAD_ANTES - 0.5,
					);
				const nombres = conBotones
					? ["Oír otra vez", "Borrar", "Listo"]
					: ["Oír otra vez"];
				for (const n of nombres) {
					const [c] = await cajas(page, `[aria-label="${n}"]`);
					expect(c, `${n} ${momento}`).toBeDefined();
					if (!c) continue;
					dentro(c, vw, vh, `${n} ${momento}`);
					expect(c.w, `${n} ancho`).toBeGreaterThanOrEqual(71.5);
					expect(c.h, `${n} alto`).toBeGreaterThanOrEqual(71.5);
				}
				if (conBotones) {
					const bs = (
						await Promise.all(
							["Oír otra vez", "Borrar", "Listo"].map((n) =>
								cajas(page, `[aria-label="${n}"]`),
							),
						)
					).map((x) => x[0] as Caja);
					for (let i = 0; i < bs.length; i++)
						for (let j = i + 1; j < bs.length; j++) {
							const a = bs[i] as Caja;
							const b = bs[j] as Caja;
							const sepX = Math.max(b.l - a.r, a.l - b.r);
							const sepY = Math.max(b.t - a.b, a.t - b.b);
							expect(Math.max(sepX, sepY), "separación").toBeGreaterThanOrEqual(
								15.5,
							);
						}
				}
			};

			await comprobar("sin tinta", false);
			const svg = await page
				.locator('svg[aria-label="Lienzo para trazar la letra"]')
				.boundingBox();
			if (!svg) throw new Error("sin lienzo");
			await page.mouse.move(svg.x + svg.width * 0.5, svg.y + svg.height * 0.3);
			await page.mouse.down();
			for (let i = 1; i <= 8; i++)
				await page.mouse.move(
					svg.x + svg.width * 0.5,
					svg.y + svg.height * (0.3 + i * 0.04),
				);
			await page.mouse.up();
			await expect(page.getByRole("button", { name: "Listo" })).toBeVisible();
			await comprobar("con tinta", true);
		});

		test("build: bandeja llena y con una pieza colocada, sin scroll", async ({
			page,
		}) => {
			await fijarSemilla(page, 2);
			await sembrar(page, docConSilabas());
			await empezar(page);
			await page.locator('[data-status="active"]').first().click();
			await avanzarHasta(page, "build");
			await page.waitForTimeout(1500);

			const comprobar = async (momento: string) => {
				const { scroll, vw, vh } = await medir(page);
				expect(scroll, `scroll ${momento}`).toBeLessThanOrEqual(0);
				const todo = [
					...(await cajas(page, "[data-exercise-kind] button")),
					...(await cajas(page, "[data-exercise-kind] fieldset")),
				];
				expect(todo.length).toBeGreaterThan(2);
				for (const c of todo) dentro(c, vw, vh, `build ${momento}`);
				for (const c of await cajas(
					page,
					'[data-exercise-kind] span[aria-hidden="true"].absolute',
				))
					dentro(c, vw, vh, `insignia ${momento}`);
			};

			await comprobar("bandeja llena");
			const piezas = page.locator(
				'[data-exercise-kind] button[data-state]:not(fieldset button):not([aria-disabled="true"])',
			);
			const marcada = page.locator(
				'[data-exercise-kind] button[data-state="marked"]:not(fieldset button)',
			);
			const insignias = page.locator(
				'[data-exercise-kind] span[aria-hidden="true"].absolute',
			);
			// La insignia numerada solo existe con el modelo (pista 3, tras errores): se provocan
			// intentos con las dos últimas piezas hasta que el motor lo pida.
			for (let i = 0; i < 8 && (await marcada.count()) === 0; i++) {
				const n = await piezas.count();
				await piezas.nth(n - 1).click();
				await piezas.nth(n - 2).click();
				await page.waitForTimeout(1800);
			}
			expect(await marcada.count(), "el modelo no apareció").toBeGreaterThan(0);
			expect(await insignias.count(), "insignias del modelo").toBeGreaterThan(
				0,
			);
			await comprobar("modelo en la bandeja");
			await marcada.first().click();
			await page.waitForTimeout(400);
			const enCasilla = page.locator(
				'[data-exercise-kind] fieldset span[aria-hidden="true"].absolute',
			);
			expect(await enCasilla.count(), "insignia en la casilla").toBeGreaterThan(
				0,
			);
			await comprobar("pieza colocada");
		});

		test("fin de sesión: sin scroll y todo dentro", async ({ page }) => {
			await fijarSemilla(page, 7);
			await sembrar(page, docHasta(1, ["first-session"]));
			await empezar(page);
			await page.locator('[data-status="active"]').first().click();
			await resolverSesion(page);
			const fin = page.locator('[data-screen="end"]');
			await expect(fin).toBeVisible();
			await page.waitForTimeout(1200);
			const { scroll, vw, vh } = await medir(page);
			expect(scroll, "scroll fin").toBeLessThanOrEqual(0);
			const logros = await cajas(page, "[data-reward]");
			expect(logros.length).toBeGreaterThanOrEqual(1);
			for (const c of logros) dentro(c, vw, vh, "logro");
			const compañero = await cajas(page, "[data-screen=end] [data-companion]");
			expect(compañero.length, "compañero").toBeGreaterThan(0);
			for (const c of compañero) dentro(c, vw, vh, "compañero");
			// Toda sesión da al menos 1 ★ (J1 de fase1 lo afirma): la caja debe existir.
			const estrellas = await cajas(
				page,
				'[data-screen=end] [role="img"][aria-label$="estrella"], [data-screen=end] [role="img"][aria-label$="estrellas"]',
			);
			expect(estrellas.length, "estrellas").toBeGreaterThan(0);
			for (const c of estrellas) dentro(c, vw, vh, "estrellas");
		});
	});
}
