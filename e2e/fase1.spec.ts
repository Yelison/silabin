import { expect, test } from "@playwright/test";
import { LOWER_GLYPHS, UPPER_GLYPHS } from "@/content/glyphs";
import { documentoFase1, fijarSemilla, sembrar } from "./helpers/seed";
import { resolverSesion } from "./helpers/solve";

const coincide = (
	tabla: Readonly<Record<string, { strokes: { x: number; y: number }[][] }>>,
	dibujado: unknown,
) =>
	Object.values(tabla).some(
		(g) => JSON.stringify(g.strokes) === JSON.stringify(dibujado),
	);
const esDeMayuscula = (d: unknown) => coincide(UPPER_GLYPHS, d);
const esDeMinuscula = (d: unknown) => coincide(LOWER_GLYPHS, d);

/** Con 42 el planificador no saca ningún `trace` (sesión de initial-sound y say-it); con 7 sí. No se fuerza el planificador: se cambia la semilla. */
const SEMILLA = 7;

async function jugarDesdeElMapa(page: import("@playwright/test").Page) {
	await page.getByRole("button", { name: "Empezar" }).click();
	// La unidad activa (Fase 1) es la que se puede tocar.
	const activa = page.locator('[data-status="active"]').first();
	await expect(activa).toBeVisible();
	await activa.click();
	return resolverSesion(page);
}

test.describe("Fase 1 de punta a punta", () => {
	test("J1: una sesión completa acaba con estrellas y traza por toques", async ({
		page,
	}) => {
		await fijarSemilla(page, SEMILLA);
		await sembrar(page, documentoFase1());
		const resumen = await jugarDesdeElMapa(page);
		expect(resumen.trazosDibujados).toBeGreaterThan(0);
		expect(esDeMayuscula(resumen.glifos[0])).toBe(true);
		await expect(
			page
				.locator('[data-screen="end"]')
				.getByRole("img", { name: /^[123] estrellas?$/ }),
		).toBeVisible();
		await expect(page.locator('[data-screen="end"]')).toContainText("★");
	});

	test("J2: con minúsculas, el trazo se dibuja sobre la minúscula", async ({
		page,
	}) => {
		await fijarSemilla(page, SEMILLA);
		await sembrar(page, documentoFase1({ lowercaseTracing: true }));
		const resumen = await jugarDesdeElMapa(page);
		expect(resumen.trazosDibujados).toBeGreaterThan(0);
		expect(esDeMinuscula(resumen.glifos[0])).toBe(true);
		await expect(page.locator('[data-screen="end"]')).toContainText("★");
	});
});
