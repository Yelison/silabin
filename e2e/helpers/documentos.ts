import type { Page } from "@playwright/test";
import { curriculum } from "@/engine";
import {
	emptyPersistedState,
	type PersistedState,
	persistedStateSchema,
} from "@/store/schema";
import { dibujarGlifo } from "./draw";

const FECHA = "2026-09-30T10:00:00.000Z";
const TODOS_LOS_PREMIOS = [
	"first-session",
	"vowel-a",
	"five-vowels",
	"first-syllable-voice",
	"steady-hand",
	"ten-sessions",
	"word-reader",
	"phase2-done",
	"stars:10",
	"stars:25",
	"stars:50",
	"stars:100",
];

const dominado = {
	box: 3,
	presented: true,
	firstTryCorrect: 3,
	assisted: 0,
	lastSessionIndex: 0,
	lastCreditSession: null,
	masteredAt: FECHA,
} as const;

/**
 * Dominadas las fases anteriores a `hasta` (la fase `hasta` queda como unidad activa) y
 * desbloqueados todos los premios salvo los de `sin`: lo que se omite sale como logro nuevo.
 */
export function docHasta(hasta: number, sin: string[] = []): PersistedState {
	const doc = emptyPersistedState();
	for (const unit of curriculum.units.values()) {
		if (unit.phase >= hasta) continue;
		for (const id of unit.introduces) doc.items[id] = { ...dominado };
		doc.units[unit.id] = { status: "done", bestStars: 3 };
	}
	for (const r of TODOS_LOS_PREMIOS)
		if (!sin.includes(r)) doc.rewards.unlockedAt[r] = FECHA;
	return persistedStateSchema.parse(doc);
}

/** Fase 1 dominada y, en la primera unidad de la fase 2, vistos el fonema y la letra: salen sílabas y `build`. */
export function docConSilabas(): PersistedState {
	const doc = docHasta(2);
	const u = [...curriculum.units.values()].find((x) => x.phase === 2);
	if (!u) throw new Error("sin unidad de fase 2");
	for (const id of u.introduces) {
		if (id.startsWith("phoneme:") || id.startsWith("letter:"))
			doc.items[id] = { ...dominado };
	}
	return persistedStateSchema.parse(doc);
}

export async function empezar(page: Page): Promise<void> {
	await page.getByRole("button", { name: "Empezar" }).click();
	await page.getByRole("heading", { name: "Silabín" }).waitFor();
}

const OPCION =
	'[data-exercise-kind] button[data-state]:not(fieldset button):not([aria-disabled="true"])';

/** Juega hasta que aparezca la plantilla pedida (sin resolverla). */
export async function avanzarHasta(
	page: Page,
	plantilla: string,
	ms = 150_000,
): Promise<void> {
	const limite = Date.now() + ms;
	while (Date.now() < limite) {
		if ((await page.locator('[data-screen="end"]').count()) > 0)
			throw new Error(`la sesión acabó sin ${plantilla}`);
		const ej = page.locator("[data-exercise-kind]").first();
		const sig = page.getByRole("button", { name: "Siguiente" });
		const pl = (await ej.count())
			? await ej.getAttribute("data-template")
			: null;
		if (pl === plantilla && !(await sig.isVisible())) return;
		try {
			if (await sig.isVisible()) {
				await sig.click({ timeout: 2000 });
				continue;
			}
			if (pl === "trace") {
				if (
					(await page
						.locator(
							'svg[aria-label="Lienzo para trazar la letra"]:not([data-disabled])',
						)
						.count()) > 0
				)
					await dibujarGlifo(page);
				else await page.waitForTimeout(200);
				continue;
			}
			let hecho = false;
			for (const n of ["Lo dijo bien", "Lo repitió"]) {
				const b = page.getByRole("button", { name: n });
				if (
					(await b.count()) > 0 &&
					(await b.first().getAttribute("aria-disabled")) !== "true"
				) {
					await b.first().click({ timeout: 2000 });
					hecho = true;
					break;
				}
			}
			if (hecho) continue;
			const marcada = page.locator(`${OPCION}[data-state="marked"]`).first();
			const o =
				(await marcada.count()) > 0 ? marcada : page.locator(OPCION).first();
			if ((await o.count()) > 0) await o.click({ timeout: 2000 });
			else await page.waitForTimeout(150);
		} catch {
			await page.waitForTimeout(150);
		}
	}
	throw new Error(`no llegó ${plantilla}`);
}
