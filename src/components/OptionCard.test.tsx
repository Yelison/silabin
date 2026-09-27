// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptionCard } from "@/components/OptionCard";

afterEach(cleanup);

describe("OptionCard", () => {
	it("V1: en idle, un toque llama a onSelect una vez", () => {
		const onSelect = vi.fn();
		render(
			<OptionCard
				state="idle"
				disabled={false}
				aria-label="gato"
				onSelect={onSelect}
			>
				A
			</OptionCard>,
		);
		const boton = screen.getByRole("button", { name: "gato" });
		expect(boton.dataset.state).toBe("idle");
		fireEvent.click(boton);
		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("V2: deshabilitada, un toque no llama a onSelect y aria-disabled es true", () => {
		const onSelect = vi.fn();
		render(
			<OptionCard
				state="idle"
				disabled={true}
				aria-label="gato"
				onSelect={onSelect}
			>
				A
			</OptionCard>,
		);
		const boton = screen.getByRole("button", { name: "gato" });
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		fireEvent.click(boton);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("V3: marked lleva data-state y un icono de mano, no solo un cambio de color", () => {
		render(
			<OptionCard
				state="marked"
				disabled={false}
				aria-label="gato"
				onSelect={vi.fn()}
			>
				A
			</OptionCard>,
		);
		const boton = screen.getByRole("button", { name: "gato" });
		expect(boton.dataset.state).toBe("marked");
		expect(boton.textContent).toContain("👆");
	});

	it("V4: dimmed queda marcada en data-state", () => {
		render(
			<OptionCard
				state="dimmed"
				disabled={true}
				aria-label="gato"
				onSelect={vi.fn()}
			>
				A
			</OptionCard>,
		);
		const boton = screen.getByRole("button", { name: "gato" });
		expect(boton.dataset.state).toBe("dimmed");
	});

	it("compact mide 72 px como mínimo y por defecto sigue midiendo 128 px", () => {
		render(
			<>
				<OptionCard
					state="idle"
					disabled={false}
					aria-label="pequeña"
					compact
					onSelect={vi.fn()}
				>
					m
				</OptionCard>
				<OptionCard
					state="idle"
					disabled={false}
					aria-label="grande"
					onSelect={vi.fn()}
				>
					m
				</OptionCard>
			</>,
		);
		const pequeña = screen.getByRole("button", { name: "pequeña" });
		const grande = screen.getByRole("button", { name: "grande" });
		expect(pequeña.className).toContain("min-h-18");
		expect(pequeña.className).not.toContain("min-h-target");
		expect(grande.className).toContain("min-h-target");
	});
});
