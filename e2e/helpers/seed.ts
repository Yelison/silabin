import type { Page } from "@playwright/test";
import { curriculum } from "@/engine";
import {
	emptyPersistedState,
	type PersistedState,
	persistedStateSchema,
} from "@/store/schema";

/** S22: el planificador tira de `Math.random`; con esta semilla la sesión es reproducible. */
export const SEMILLA_POR_DEFECTO = 42;

/** mulberry32: PRNG de 32 bits, se inyecta antes de que cargue la app (sin tocar producción). */
export async function fijarSemilla(
	page: Page,
	semilla = SEMILLA_POR_DEFECTO,
): Promise<void> {
	await page.addInitScript((s: number) => {
		let a = s >>> 0;
		Math.random = () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}, semilla);
}

/** Documento con todos los ítems de la Fase 0 dominados: la Fase 1 queda como unidad activa. */
export function documentoFase1(
	ajustes: Partial<PersistedState["settings"]> = {},
): PersistedState {
	const doc = emptyPersistedState();
	const enFecha = "2026-09-01T10:00:00.000Z";
	for (const unit of curriculum.units.values()) {
		if (unit.phase !== 0) continue;
		for (const id of unit.introduces) {
			doc.items[id] = {
				box: 3,
				presented: true,
				firstTryCorrect: 3,
				assisted: 0,
				lastSessionIndex: 0,
				lastCreditSession: null,
				masteredAt: enFecha,
			};
		}
		doc.units[unit.id] = { status: "done", bestStars: 3 };
	}
	doc.settings = { ...doc.settings, ...ajustes };
	return persistedStateSchema.parse(doc);
}

const STORAGE_KEY = "silabin.state.v1";

/**
 * Escribe el documento en IndexedDB (`keyval-store`/`keyval`, la base de `idb-keyval`) y
 * recarga. Hay que abrir la app antes: IndexedDB es por origen.
 */
export async function sembrar(page: Page, doc: PersistedState): Promise<void> {
	await page.goto("/");
	await page.evaluate(
		async ({ clave, valor }) => {
			await new Promise<void>((resolve, reject) => {
				const abrir = indexedDB.open("keyval-store");
				abrir.onupgradeneeded = () => {
					abrir.result.createObjectStore("keyval");
				};
				abrir.onerror = () => reject(abrir.error);
				abrir.onsuccess = () => {
					const db = abrir.result;
					const tx = db.transaction("keyval", "readwrite");
					tx.objectStore("keyval").put(valor, clave);
					tx.oncomplete = () => {
						db.close();
						resolve();
					};
					tx.onerror = () => reject(tx.error);
				};
			});
		},
		{ clave: STORAGE_KEY, valor: doc },
	);
	await page.reload();
}
