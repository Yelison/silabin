// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Picture } from "@/components/Picture";

afterEach(cleanup);

describe("Picture", () => {
	it("I6: pinta un img con alt, src del WebP y 160 × 160", () => {
		render(<Picture imageKey="img:gato" />);
		const img = screen.getByRole("img", { name: "gato" });
		expect(img.tagName).toBe("IMG");
		expect(img.getAttribute("src")).toMatch(/\/gato\.webp$/);
		expect(img.getAttribute("width")).toBe("160");
		expect(img.getAttribute("height")).toBe("160");
		expect(img.getAttribute("draggable")).toBe("false");
	});

	it("I6: el tamaño md es 96 × 96", () => {
		render(<Picture imageKey="img:gato" size="md" />);
		const img = screen.getByRole("img", { name: "gato" });
		expect(img.getAttribute("width")).toBe("96");
		expect(img.getAttribute("height")).toBe("96");
	});

	it("I7: si la imagen no carga, se ve el emoji con role img y aria-label", () => {
		render(<Picture imageKey="img:gato" />);
		expect(document.querySelector("img")).not.toBeNull();
		fireEvent.error(screen.getByRole("img", { name: "gato" }));
		const respaldo = screen.getByRole("img", { name: "gato" });
		expect(respaldo.tagName).not.toBe("IMG");
		expect(respaldo.textContent).toBe("🐱");
		expect(document.querySelector("img")).toBeNull();
	});

	it("I8: sin clave o con clave desconocida no pinta nada", () => {
		const { container, rerender } = render(<Picture imageKey={undefined} />);
		expect(container.innerHTML).toBe("");
		rerender(<Picture imageKey="img:nada" />);
		expect(container.innerHTML).toBe("");
	});
});
