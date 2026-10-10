import { expect, type Page } from "@playwright/test";

/**
 * Sin scroll horizontal en el documento **y en la zona del camino** (`main > div`, la de
 * `overflow-y-auto`). Con ese overflow su `overflow-x` computa a `auto`: un desbordamiento
 * horizontal interno ya no ensancha el documento, así que medir solo `documentElement` pasa en
 * vacío para el camino.
 */
export async function sinDesbordeHorizontal(
	page: Page,
	contexto: string,
): Promise<void> {
	const m = await page.evaluate(() => {
		const zona = document.querySelector("main > div");
		if (!zona) throw new Error("No hay la zona del camino (main > div)");
		return {
			docScroll: document.documentElement.scrollWidth,
			docAncho: document.documentElement.clientWidth,
			zonaScroll: zona.scrollWidth,
			zonaAncho: zona.clientWidth,
		};
	});
	expect(m.docScroll, `${contexto}: documento`).toBeLessThanOrEqual(m.docAncho);
	expect(m.zonaScroll, `${contexto}: zona del camino`).toBeLessThanOrEqual(
		m.zonaAncho,
	);
}
