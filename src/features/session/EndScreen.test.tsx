// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyProgressState, REWARDS, type SessionSummary } from "@/engine";
import { EndScreen } from "@/features/session/EndScreen";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function resumen(
	stars: 0 | 1 | 2 | 3,
	newRewardIds: string[] = [],
): SessionSummary {
	return {
		progress: emptyProgressState(),
		stars,
		newRewardIds,
		entry: {
			index: 0,
			unitId: "phase0:clap",
			stars,
			endedAt: "2026-09-26T12:00:00.000Z",
		},
	};
}

async function montar(
	summary: SessionSummary | null,
	opciones: { reducedCelebrations?: boolean } = {},
) {
	const store = crearStore();
	await store.getState().load();
	if (opciones.reducedCelebrations)
		await store.getState().updateSettings({ reducedCelebrations: true });
	store.setState({ summary });
	const audio = fakeAudio();
	const onDone = vi.fn();
	const { container } = render(
		conProveedores(store, audio, <EndScreen onDone={onDone} />),
	);
	const claves = () => audio.play.mock.calls.map((c) => c[0].key);
	return { store, audio, onDone, container, claves };
}

describe("EndScreen", () => {
	it.each([
		[1, "1 estrella"],
		[2, "2 estrellas"],
		[3, "3 estrellas"],
	] as const)("pinta %i estrellas con su aria-label", async (n, etiqueta) => {
		const { container } = await montar(resumen(n));
		const estrellas = screen.getByRole("img", { name: etiqueta });
		expect(estrellas.textContent).toBe("★".repeat(n));
		expect(container.querySelectorAll("[data-reward]")).toHaveLength(0);
	});

	it("suena celebrate:session y, sin logros nuevos, nada más", async () => {
		const { claves } = await montar(resumen(2));
		expect(claves()).toEqual(["celebrate:session"]);
	});

	it("E8: con un logro nuevo suenan celebrate:session y reward:new, en ese orden; el nombre solo va en aria-label; un toque vuelve al mapa", async () => {
		const logro = REWARDS[0];
		if (logro === undefined) throw new Error("no hay logros");
		const { store, claves, onDone, container } = await montar(
			resumen(3, [logro.id]),
		);
		expect(claves()).toEqual(["celebrate:session", "reward:new"]);
		const premio = screen.getByRole("img", { name: logro.name });
		expect(premio.textContent).not.toContain(logro.name);
		expect(container.textContent).not.toContain(logro.name);

		await userEvent.setup().click(screen.getByRole("button"));
		expect(onDone).toHaveBeenCalledTimes(1);
		expect(store.getState().summary).toBeNull();
	});

	it("un toque en cualquier sitio corta lo que suena", async () => {
		const { audio, container } = await montar(resumen(1));
		await userEvent
			.setup()
			.click(container.querySelector('[data-screen="end"]') as HTMLElement);
		expect(audio.stop).toHaveBeenCalled();
	});

	it("sin resumen no hay nada que celebrar: no suena y se vuelve al mapa", async () => {
		const { claves, onDone, container } = await montar(null);
		expect(claves()).toEqual([]);
		expect(container.textContent).toBe("");
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("F5: con reducedCelebrations y un logro nuevo, no suena reward:new, no hay props ni clases de animación y el toque cierra", async () => {
		const logro = REWARDS[0];
		if (logro === undefined) throw new Error("no hay logros");
		const { store, claves, onDone, container } = await montar(
			resumen(3, [logro.id]),
			{ reducedCelebrations: true },
		);
		expect(claves()).toEqual(["celebrate:session"]);

		const estrellas = screen.getByRole("img", { name: "3 estrellas" });
		const premio = container.querySelector("[data-reward]");
		if (premio === null) throw new Error("falta el logro");
		// Ni estrellas ni logro son `motion.span`: no llevan el estilo en línea que Motion añade
		// a los elementos que anima (ni `transform` ni `opacity` puestos por la librería).
		expect(estrellas.getAttribute("style")).toBeNull();
		expect(premio.getAttribute("style")).toBeNull();

		await userEvent.setup().click(screen.getByRole("button"));
		expect(onDone).toHaveBeenCalledTimes(1);
		expect(store.getState().summary).toBeNull();
	});

	it.each([[false], [true]])(
		"AR12: cada logro nuevo pinta la pieza que desbloquea a 96 px, con su aria-label (reducedCelebrations=%s)",
		async (reducida) => {
			const { container } = await montar(
				resumen(2, ["first-session", "stars:10"]),
				{ reducedCelebrations: reducida },
			);
			const premios = container.querySelectorAll<HTMLElement>("[data-reward]");
			expect(premios).toHaveLength(2);
			const [primero, segundo] = premios;
			expect(primero?.getAttribute("data-reward")).toBe("first-session");
			expect(primero?.getAttribute("aria-label")).toBe(
				REWARDS.find((r) => r.id === "first-session")?.name,
			);
			const img1 = primero?.querySelector("img");
			expect(img1?.getAttribute("src")).toMatch(/\/bg-pradera\.webp$/);
			expect(img1?.getAttribute("width")).toBe("96");
			expect(segundo?.getAttribute("aria-label")).toBe(
				REWARDS.find((r) => r.id === "stars:10")?.name,
			);
			const img2 = segundo?.querySelector("img");
			expect(img2?.getAttribute("src")).toMatch(/\/sticker-10\.webp$/);
			expect(img2?.getAttribute("width")).toBe("96");
			if (reducida) {
				expect(primero?.getAttribute("style")).toBeNull();
				expect(segundo?.getAttribute("style")).toBeNull();
			}
		},
	);

	it("el compañero del final se pinta a 160 px", async () => {
		const { container } = await montar(resumen(1));
		const img = container.querySelector("[data-companion] img");
		expect(img?.getAttribute("width")).toBe("160");
	});
});
