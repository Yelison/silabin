// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapFooter, type PlayMode } from "@/features/map/MapFooter";
import { LLEGA_DESPUES } from "@/features/map/MapNode";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

async function montar(mode: PlayMode) {
	const store = crearStore();
	await store.getState().load();
	const onStart = vi.fn();
	const onOpenRewards = vi.fn();
	const { container } = render(
		conProveedores(
			store,
			fakeAudio(),
			<MapFooter mode={mode} onStart={onStart} onOpenRewards={onOpenRewards} />,
		),
	);
	return { onStart, onOpenRewards, container };
}

describe("MapFooter", () => {
	it("PI1: en «play» el botón grande dice «Jugar», se ve la palabra y un clic inicia", async () => {
		const { onStart } = await montar("play");
		const boton = screen.getByRole("button", { name: "Jugar" });
		expect(boton.textContent).toContain("Jugar");
		expect(boton.textContent).toContain("▶");
		await userEvent.click(boton);
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("PI2: en «review» el botón grande dice «Repasar» con 🔁 y un clic inicia", async () => {
		const { onStart } = await montar("review");
		const boton = screen.getByRole("button", { name: "Repasar" });
		expect(boton.textContent).toContain("Repasar");
		expect(boton.textContent).toContain("🔁");
		await userEvent.click(boton);
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("PI3: en «soon» el botón es aria-disabled, no lleva opacidad (su contenido sí) y no inicia nada", async () => {
		const { onStart } = await montar("soon");
		const boton = screen.getByRole("button", { name: LLEGA_DESPUES });
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		expect(boton.hasAttribute("disabled")).toBe(false);
		// LE1-LE5: el botón es una superficie opaca; lo atenuado es el contenido.
		expect(boton.className).not.toMatch(/opacity/);
		const atenuado = boton.querySelector(".opacity-50");
		expect(atenuado).not.toBeNull();
		expect(atenuado?.textContent).toContain("Jugar");
		expect(atenuado?.textContent).toContain("▶");
		await userEvent.click(boton);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("PI4: «Mis premios» lleva el icono de galería con la palabra, sin 🎁, y un clic abre los premios", async () => {
		const { onOpenRewards, container } = await montar("play");
		const premios = screen.getByRole("button", { name: "Mis premios" });
		expect(
			premios.querySelector('img[src="/icons/ui-gallery.png"]'),
		).not.toBeNull();
		expect(premios.textContent).toContain("Mis premios");
		expect(container.textContent).not.toContain("🎁");
		// Objetivo táctil del niño: ≥ 72 px.
		expect(premios.className).toContain("min-h-18");
		await userEvent.click(premios);
		expect(onOpenRewards).toHaveBeenCalledTimes(1);
	});

	it("PI5: el compañero está dentro del pie, a 72 px (56 en apaisado-bajo)", async () => {
		const { container } = await montar("play");
		const pie = container.firstElementChild as HTMLElement;
		const companero = screen.getByRole("img", { name: "Tu compañero" });
		expect(pie.contains(companero)).toBe(true);
		expect(companero.className).toContain("apaisado-bajo:");
	});

	it("el botón grande mide al menos 72 px en los tres modos", async () => {
		const nombres = {
			play: "Jugar",
			review: "Repasar",
			soon: LLEGA_DESPUES,
		} as const;
		for (const mode of ["play", "review", "soon"] as const) {
			await montar(mode);
			const boton = screen.getByRole("button", { name: nombres[mode] });
			expect(boton.className, mode).toContain("min-h-18");
			cleanup();
		}
	});
});
