import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { THEME_COLORS } from "@/app/theme-colors";

describe("manifest", () => {
	it("H1: devuelve los campos del contrato", () => {
		const m = manifest();
		expect(m.name).toBe("Silabín");
		expect(m.short_name).toBe("Silabín");
		expect(m.lang).toBe("es");
		expect(m.display).toBe("standalone");
		expect(m.orientation).toBe("any");
		expect(m.start_url).toBe("/");
		expect(m.background_color).toBe(THEME_COLORS.surface);
		expect(m.theme_color).toBe(THEME_COLORS.action);
		expect(m.icons?.map((i) => i.sizes)).toEqual(
			expect.arrayContaining(["192x192", "512x512"]),
		);
	});

	it("H1: los iconos del manifest existen en public/icons/", () => {
		const m = manifest();
		for (const icono of m.icons ?? []) {
			const ruta = join(process.cwd(), "public", icono.src.replace(/^\//, ""));
			expect(existsSync(ruta), `falta ${icono.src}`).toBe(true);
		}
	});

	it("FI4: app-512.png se declara también maskable, en una entrada aparte de la «any»", () => {
		const iconos = manifest().icons ?? [];
		const maskable = iconos.filter((i) => i.purpose === "maskable");
		expect(maskable.map((i) => i.src)).toEqual(["/icons/app-512.png"]);
		const cualquiera = iconos.filter(
			(i) => i.src === "/icons/app-512.png" && i.purpose !== "maskable",
		);
		expect(cualquiera).toHaveLength(1);
	});
});
