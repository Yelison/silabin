import type { Locator, Page } from "@playwright/test";
import { dibujarGlifo } from "./draw";

export type Resumen = {
	/** Cuántas veces se vio cada plantilla en evaluación (`data-template`). */
	plantillas: Record<string, number>;
	trazosDibujados: number;
	/** Los trazos de cada glifo dibujado, en unidades de la letra. */
	glifos: { x: number; y: number }[][][];
};

const EJERCICIO = "[data-exercise-kind]";
// Opciones de toque fuera de las casillas de `build` (las piezas ya colocadas no cuentan).
const OPCION =
	'[data-exercise-kind] button[data-state]:not(fieldset button):not([aria-disabled="true"])';

async function clic(loc: Locator): Promise<boolean> {
	try {
		await loc.click({ timeout: 2_000 });
		return true;
	} catch {
		// Se desmontó o se bloqueó entre medias (celebración): se vuelve a mirar.
		return false;
	}
}

/**
 * Un paso de resolución sin conocer la respuesta (S12). Devuelve `false` si no había nada
 * que tocar todavía (el motor está celebrando o cambiando de ejercicio).
 */
async function paso(page: Page, resumen: Resumen): Promise<boolean> {
	// Presentación: solo tiene «Siguiente».
	const siguiente = page.getByRole("button", { name: "Siguiente" });
	if (await siguiente.isVisible()) return clic(siguiente);

	const ejercicio = page.locator(EJERCICIO).first();
	if ((await ejercicio.count()) === 0) return false;
	const plantilla = (await ejercicio.getAttribute("data-template")) ?? "";

	if (plantilla === "trace") {
		const listo = page.locator(
			'svg[aria-label="Lienzo para trazar la letra"]:not([data-disabled])',
		);
		if ((await listo.count()) === 0) return false;
		// El modelo del rung 3 (`animation="full"`) bloquea el lienzo mientras anima.
		resumen.plantillas[plantilla] = (resumen.plantillas[plantilla] ?? 0) + 1;
		try {
			resumen.glifos.push(await dibujarGlifo(page));
			resumen.trazosDibujados += 1;
			return true;
		} catch {
			return false;
		}
	}

	// Voz: en headless no hay micrófono (P4), el adulto da el veredicto.
	for (const nombre of ["Lo dijo bien", "Lo repitió"]) {
		const b = page.getByRole("button", { name: nombre });
		if (
			(await b.count()) > 0 &&
			(await b.first().getAttribute("aria-disabled")) !== "true"
		) {
			resumen.plantillas[plantilla] = (resumen.plantillas[plantilla] ?? 0) + 1;
			return clic(b.first());
		}
	}

	// Opciones: la marcada por el modelo y, si no hay, la primera que responda. Las piezas ya
	// colocadas en las casillas de `build` (dentro de un `fieldset`) no cuentan.
	const marcada = page.locator(`${OPCION}[data-state="marked"]`).first();
	const objetivo =
		(await marcada.count()) > 0 ? marcada : page.locator(OPCION).first();
	if ((await objetivo.count()) === 0) return false;
	resumen.plantillas[plantilla] = (resumen.plantillas[plantilla] ?? 0) + 1;
	return clic(objetivo);
}

/** Juega la sesión hasta la pantalla de fin (`data-screen="end"`). */
export async function resolverSesion(page: Page): Promise<Resumen> {
	const resumen: Resumen = { plantillas: {}, trazosDibujados: 0, glifos: [] };
	const fin = page.locator('[data-screen="end"]');
	const limite = Date.now() + 150_000;
	while (Date.now() < limite) {
		if ((await fin.count()) > 0) return resumen;
		const hecho = await paso(page, resumen);
		if (!hecho) await page.waitForTimeout(150);
	}
	throw new Error(
		`La sesión no terminó a tiempo: ${JSON.stringify(resumen.plantillas)}`,
	);
}
