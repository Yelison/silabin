// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	curriculum,
	emptyItemProgress,
	emptyProgressState,
	REWARDS,
	type SessionSummary,
} from "@/engine";
import { MapScreen } from "@/features/map/MapScreen";
import { CosmeticBackground } from "@/features/rewards/CosmeticBackground";
import { RewardsScreen } from "@/features/rewards/RewardsScreen";
import { EndScreen } from "@/features/session/EndScreen";
import {
	conProveedores,
	crearStore,
	documentoConUnidadesHechas,
	fakeAudio,
} from "@/features/test-support";
import { createMemoryAdapter } from "@/store";

afterEach(cleanup);

// V13: sobre un fondo cosmético (un cielo de noche, una pradera) el texto y los indicadores no
// se leen si van pintados directamente encima. Cada uno tiene que tener, antes de llegar al
// fondo, un ancestro (o ser él mismo) con una superficie opaca de token.

/**
 * Una superficie es una clase `bg-<token>` sin `/opacidad` (una superficie translúcida deja pasar
 * el fondo) y sin confundir `bg-calm` con `bg-calm-border` (un borde no es un fondo).
 */
const SUPERFICIE = /\bbg-(card|surface|action|calm|mark)(?![\w/-])/;

/** Lo que se pinta sin texto pero se tiene que ver: la barra, los puntos y las fichas de la galería. */
const INDICADORES =
	'[role="progressbar"], [data-unit-dot], [data-cosmetic], [data-reward]';

/** Una clase de opacidad que no sea la total: `opacity-60`, `opacity-[0.15]`, no `opacity-100`. */
const ATENUADO = /\bopacity-(?!100(?![\w/-]))/;

/**
 * Una superficie con `opacity-*` propia o en un ancestro deja ver el fondo a su través: no es
 * opaca. Se sube desde `n` hasta el fondo cosmético.
 */
function atenuadoHasta(n: Element): boolean {
	for (let e: Element | null = n; e !== null; e = e.parentElement) {
		if (e.hasAttribute("data-cosmetic-background")) return false;
		if (ATENUADO.test(e.getAttribute("class") ?? "")) return true;
	}
	return false;
}

function tieneSuperficie(el: Element): boolean {
	for (let n: Element | null = el; n !== null; n = n.parentElement) {
		if (n.hasAttribute("data-cosmetic-background")) return false;
		if (SUPERFICIE.test(n.getAttribute("class") ?? "") && !atenuadoHasta(n))
			return true;
	}
	return false;
}

type Revisado = { que: string; sobreSuperficie: boolean };

/** Todo texto visible y todo indicador dentro de `raiz`, con si va sobre una superficie. */
function revisar(raiz: Element): Revisado[] {
	const revisados: Revisado[] = [];
	const doc = raiz.ownerDocument;
	const walker = doc.createTreeWalker(raiz, 4 /* NodeFilter.SHOW_TEXT */);
	for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
		const padre = n.parentElement;
		const texto = (n.textContent ?? "").trim();
		if (padre === null || texto === "") continue;
		if (padre.closest(".sr-only, [data-art-fallback]") !== null) continue;
		revisados.push({
			que: `texto «${texto}»`,
			sobreSuperficie: tieneSuperficie(padre),
		});
	}
	for (const el of raiz.querySelectorAll(INDICADORES)) {
		if (el.closest(".sr-only") !== null) continue;
		revisados.push({
			que: `indicador <${el.tagName.toLowerCase()} ${el.getAttribute("class") ?? ""}>`,
			sobreSuperficie: tieneSuperficie(el),
		});
	}
	return revisados;
}

function sinSuperficie(raiz: Element): string[] {
	return revisar(raiz)
		.filter((r) => !r.sobreSuperficie)
		.map((r) => r.que);
}

/** Un documento con todos los logros ganados y `bg:espacio` equipado: el fondo más oscuro. */
function docConEspacio() {
	const doc = documentoConUnidadesHechas(null);
	const unlockedAt = Object.fromEntries(
		REWARDS.map((r) => [r.id, "2026-09-26T12:00:00.000Z"]),
	);
	return {
		...doc,
		rewards: {
			unlockedAt,
			equipped: {
				background: "bg:espacio",
				companion: "companion:first",
				trail: "trail:estrellitas",
			},
		},
	};
}

async function storeConEspacio(
	cambios: (doc: ReturnType<typeof docConEspacio>) => void = () => {},
) {
	const doc = docConEspacio();
	cambios(doc);
	const store = crearStore(createMemoryAdapter(doc));
	await store.getState().load();
	return store;
}

describe("legibilidad sobre el fondo (V13)", () => {
	it("LE1: en el mapa, con Espacio equipado, todo texto e indicador va sobre una superficie", async () => {
		const store = await storeConEspacio((doc) => {
			const items = curriculum.units.get("phase0:clap")?.introduces ?? [];
			// Dos letras dominadas de la unidad activa: salen los puntos de avance.
			for (const id of items.slice(0, 2))
				(doc.items as Record<string, unknown>)[id] = {
					...emptyItemProgress(),
					presented: true,
					firstTryCorrect: 3,
				};
		});
		act(() => {
			// Estrellas ganadas (barra hasta el próximo hito) y la marca de «guardado».
			store.setState((s) => ({
				lastSavedAt: "2026-09-26T12:00:00.000Z",
				progress: {
					...s.progress,
					units: {
						...s.progress.units,
						"prueba:estrellas": { status: "done", bestStars: 3 },
					},
				},
			}));
		});
		const { container } = render(
			conProveedores(
				store,
				fakeAudio(),
				<CosmeticBackground>
					<MapScreen
						onStart={vi.fn()}
						onOpenPanel={vi.fn()}
						onOpenRewards={vi.fn()}
					/>
				</CosmeticBackground>,
			),
		);
		const fondo = container.querySelector("[data-cosmetic-background]");
		expect(fondo?.getAttribute("data-cosmetic-background")).toBe("bg:espacio");
		// No pasa en vacío: el título, el contador, el ✓ de guardado, la barra y los dos puntos.
		const todo = revisar(container);
		expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
		expect(container.querySelectorAll("[data-unit-dot]")).toHaveLength(2);
		expect(todo.filter((r) => r.que.includes("Silabín"))).toHaveLength(1);
		expect(todo.filter((r) => r.que.includes("✓"))).toHaveLength(1);
		expect(todo.filter((r) => r.que.includes("«3»"))).toHaveLength(1);
		expect(sinSuperficie(container)).toEqual([]);
	});

	it("LE2: en la galería, con Espacio equipado, todo texto e indicador va sobre una superficie", async () => {
		const store = await storeConEspacio();
		const { container } = render(
			conProveedores(
				store,
				fakeAudio(),
				<CosmeticBackground>
					<RewardsScreen onClose={vi.fn()} />
				</CosmeticBackground>,
			),
		);
		// No pasa en vacío: las fichas de los tres cosméticos y el ✓ del equipado.
		expect(
			container.querySelectorAll("[data-cosmetic]").length,
		).toBeGreaterThan(6);
		const todo = revisar(container);
		expect(todo.filter((r) => r.que.includes("✓"))).toHaveLength(3);
		expect(sinSuperficie(container)).toEqual([]);
	});

	it("LE2b: con solo algunos logros ganados, las entradas «por descubrir» (atenuadas) siguen sobre la banda del álbum", async () => {
		// `opacity-40` en la propia entrada la deja sin superficie propia: solo la banda del
		// álbum la sostiene. Con todos los logros ganados eso nunca se pinta.
		const store = await storeConEspacio((doc) => {
			const ganado = "2026-09-26T12:00:00.000Z";
			doc.rewards.unlockedAt = {
				"vowel-a": ganado,
				"steady-hand": ganado,
			};
		});
		const { container } = render(
			conProveedores(
				store,
				fakeAudio(),
				<CosmeticBackground>
					<RewardsScreen onClose={vi.fn()} />
				</CosmeticBackground>,
			),
		);
		const sinGanar = container.querySelectorAll(
			'[data-reward][data-earned="false"]',
		);
		expect(sinGanar.length).toBeGreaterThan(3);
		expect(
			container.querySelectorAll('[data-reward][data-earned="true"]').length,
		).toBeGreaterThan(0);
		expect(sinSuperficie(container)).toEqual([]);
	});

	it("LE3: en el fin de sesión, con 3 estrellas y un logro, los ★ y el logro van sobre una superficie", async () => {
		const store = await storeConEspacio();
		const resumen: SessionSummary = {
			progress: emptyProgressState(),
			stars: 3,
			newRewardIds: ["vowel-a"],
			entry: {
				index: 0,
				unitId: "phase0:clap",
				stars: 3,
				endedAt: "2026-09-26T12:00:00.000Z",
			},
		};
		store.setState({ summary: resumen });
		const { container } = render(
			conProveedores(
				store,
				fakeAudio(),
				<CosmeticBackground>
					<EndScreen onDone={vi.fn()} />
				</CosmeticBackground>,
			),
		);
		const todo = revisar(container);
		expect(todo.filter((r) => r.que.includes("★★★"))).toHaveLength(1);
		expect(container.querySelector('[data-reward="vowel-a"]')).not.toBeNull();
		expect(sinSuperficie(container)).toEqual([]);
	});

	it("LE5: el ayudante no pasa en falso: solo `bg-card` opaco cuenta, no `bg-calm-border`, `bg-card/80` ni una ficha con `opacity-*`", () => {
		const raiz = document.createElement("div");
		raiz.innerHTML = `
			<div data-cosmetic-background="bg:espacio">
				<div class="bg-calm-border"><span>borde</span></div>
				<div class="bg-card/80"><span>translúcida</span></div>
				<div class="rounded-card bg-card p-3"><span>superficie</span></div>
				<div class="bg-card opacity-60"><span>ficha atenuada</span></div>
				<div class="opacity-40"><div class="bg-card"><span>ficha bajo un atenuado</span></div></div>
				<div class="bg-card"><span class="opacity-50">contenido atenuado</span></div>
				<span>suelto</span>
			</div>`;
		document.body.append(raiz);
		const r = revisar(raiz);
		document.body.removeChild(raiz);
		expect(r.map((x) => [x.que, x.sobreSuperficie])).toEqual([
			["texto «borde»", false],
			["texto «translúcida»", false],
			["texto «superficie»", true],
			["texto «ficha atenuada»", false],
			["texto «ficha bajo un atenuado»", false],
			["texto «contenido atenuado»", true],
			["texto «suelto»", false],
		]);
	});
});
