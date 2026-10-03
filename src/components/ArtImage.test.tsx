// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ArtImage } from "@/components/ArtImage";

afterEach(cleanup);

describe("ArtImage", () => {
	it("AR5: pinta una imagen decorativa y, si no carga, su emoji de respaldo", () => {
		const { container } = render(
			<ArtImage art={{ src: "/x.webp", emoji: "🐣" }} size={64} />,
		);
		const img = container.querySelector("img");
		if (img === null) throw new Error("falta la imagen");
		expect(img.getAttribute("src")).toBe("/x.webp");
		expect(img.getAttribute("alt")).toBe("");
		expect(img.getAttribute("aria-hidden")).toBe("true");
		expect(img.getAttribute("width")).toBe("64");
		expect(img.getAttribute("height")).toBe("64");
		expect(img.getAttribute("draggable")).toBe("false");
		expect(container.querySelector("[data-art-fallback]")).toBeNull();

		fireEvent.error(img);

		expect(container.querySelector("img")).toBeNull();
		const respaldo = container.querySelector("[data-art-fallback]");
		expect(respaldo?.textContent).toBe("🐣");
		expect(respaldo?.getAttribute("aria-hidden")).toBe("true");
	});

	it("AR5: con src vacío pinta directamente el respaldo", () => {
		const { container } = render(
			<ArtImage art={{ src: "", emoji: "🏅" }} size={64} />,
		);
		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector("[data-art-fallback]")?.textContent).toBe(
			"🏅",
		);
	});

	it("el respaldo mide lo mismo que la imagen, con el emoji a 0,75 × size", () => {
		const { container } = render(
			<ArtImage art={{ src: "", emoji: "🏅" }} size={64} />,
		);
		const respaldo = container.querySelector<HTMLElement>(
			"[data-art-fallback]",
		);
		expect(respaldo?.style.width).toBe("64px");
		expect(respaldo?.style.height).toBe("64px");
		expect(respaldo?.style.fontSize).toBe("48px");
	});

	it("un src distinto vuelve a intentar la imagen tras un fallo anterior", () => {
		const { container, rerender } = render(
			<ArtImage art={{ src: "/a.webp", emoji: "🐣" }} size={64} />,
		);
		const img = container.querySelector("img");
		if (img === null) throw new Error("falta la imagen");
		fireEvent.error(img);
		expect(container.querySelector("img")).toBeNull();
		rerender(<ArtImage art={{ src: "/b.webp", emoji: "🐣" }} size={64} />);
		expect(container.querySelector("img")?.getAttribute("src")).toBe("/b.webp");
	});
});
