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
		expect(boton.querySelector("img")?.getAttribute("src")).toBe(
			"/icons/ui-hand.png",
		);
		expect(boton.textContent).not.toContain("👆");
	});

	it("M6: la mano lleva ancho propio (sin él un absolute se encoge a media tarjeta), más pequeña en la compacta", () => {
		render(
			<>
				<OptionCard
					state="marked"
					disabled={false}
					aria-label="pequeña"
					compact
					onSelect={vi.fn()}
				>
					m
				</OptionCard>
				<OptionCard
					state="marked"
					disabled={false}
					aria-label="grande"
					onSelect={vi.fn()}
				>
					m
				</OptionCard>
			</>,
		);
		const mano = (n: string) => {
			const img = screen
				.getByRole("button", { name: n })
				.querySelector("img") as HTMLImageElement;
			return { img, envoltorio: img.parentElement as HTMLElement };
		};
		expect(mano("grande").img.getAttribute("width")).toBe("56");
		expect(mano("grande").envoltorio.className).toContain("w-14");
		expect(mano("pequeña").img.getAttribute("width")).toBe("40");
		expect(mano("pequeña").envoltorio.className).toContain("w-10");
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
