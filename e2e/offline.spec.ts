import { expect, test } from "@playwright/test";
import { documentoFase1, fijarSemilla, sembrar } from "./helpers/seed";

test("J3: el panel de padres crea el PIN, cambia la longitud a 6 y la sesión lo refleja", async ({
	page,
}) => {
	await fijarSemilla(page);
	await sembrar(page, documentoFase1());
	await page.getByRole("button", { name: "Empezar" }).click();

	// Mantener pulsado el logo (PANEL_HOLD_MS = 3000).
	const logo = page.getByRole("heading", { name: "Silabín" });
	await expect(logo).toBeVisible();
	const caja = await logo.boundingBox();
	if (caja === null) throw new Error("El logo no tiene caja");
	await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(3300);
	await page.mouse.up();

	const puerta = page.getByRole("dialog", {
		name: "Entrada al panel de padres",
	});
	await expect(puerta).toBeVisible();
	await puerta.getByLabel("Escribe el PIN").fill("1234");
	await puerta.getByLabel("Repite el PIN").fill("1234");

	const panel = page.getByLabel("Panel de padres");
	await expect(panel).toBeVisible();
	await panel.getByLabel("Longitud de la sesión").selectOption("6");
	await panel.getByRole("button", { name: "Cerrar" }).click();

	await page.locator('[data-status="active"]').first().click();
	await expect(
		page.getByRole("progressbar", { name: "Progreso" }),
	).toHaveAttribute("aria-valuemax", "6");
});

test("J4: sin red la app arranca, muestra el mapa y carga una ilustración", async ({
	page,
	context,
}) => {
	await sembrar(page, documentoFase1());
	// Espera a que el SW esté activo y controle la página (clientsClaim).
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	await expect
		.poll(() =>
			page.evaluate(() => navigator.serviceWorker.controller !== null),
		)
		.toBe(true);
	// Da tiempo a que termine el precaché (instalación) antes de cortar la red.
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const r = await caches.match("/images/palabras/sol.webp", {
					ignoreSearch: true,
				});
				return r !== undefined;
			}),
		)
		.toBe(true);

	await context.setOffline(true);
	await page.reload();

	await page.getByRole("button", { name: "Empezar" }).click();
	await expect(page.locator('[data-status="active"]').first()).toBeVisible();

	const estado = await page.evaluate(async () => {
		const r = await fetch("/images/palabras/sol.webp");
		return { ok: r.ok, tipo: r.headers.get("content-type") };
	});
	expect(estado.ok).toBe(true);
	expect(estado.tipo).toContain("image/");
});
