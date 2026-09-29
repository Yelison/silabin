// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ICON_NAMES, Icon } from "@/components/Icon";

afterEach(cleanup);

describe("Icon", () => {
	it("I9: es decorativo, 48 × 48 por defecto y con el PNG de su nombre", () => {
		const { container } = render(<Icon name="replay" />);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/icons/ui-replay.png");
		expect(img?.getAttribute("alt")).toBe("");
		expect(img?.getAttribute("aria-hidden")).toBe("true");
		expect(img?.getAttribute("width")).toBe("48");
		expect(img?.getAttribute("height")).toBe("48");
		expect(img?.getAttribute("draggable")).toBe("false");
	});

	it("I9: acepta un tamaño propio", () => {
		const { container } = render(<Icon name="hand" size={72} />);
		const img = container.querySelector("img");
		expect(img?.getAttribute("width")).toBe("72");
		expect(img?.getAttribute("height")).toBe("72");
	});

	it("I11: acepta clases propias sin perder las suyas", () => {
		const { container } = render(<Icon name="next" className="-scale-x-100" />);
		const clases = container.querySelector("img")?.classList;
		expect(clases?.contains("-scale-x-100")).toBe(true);
		expect(clases?.contains("pointer-events-none")).toBe(true);
	});

	it("I10: existe el PNG de cada nombre en public/icons", () => {
		expect(ICON_NAMES.length).toBe(10);
		for (const nombre of ICON_NAMES) {
			const ruta = join(process.cwd(), "public", "icons", `ui-${nombre}.png`);
			expect(existsSync(ruta), ruta).toBe(true);
		}
	});
});
