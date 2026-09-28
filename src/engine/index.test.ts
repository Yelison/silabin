import { describe, expect, expectTypeOf, it } from "vitest";
import type { CurriculumIndex as ContentIndex } from "@/content/index";
import type { HintStep as ContentHintStep } from "@/content/templates";
import type {
	Item as ContentItem,
	TemplateId as ContentTemplateId,
	Unit as ContentUnit,
} from "@/content/types";
import type {
	CurriculumIndex,
	HintStep,
	Item,
	TemplateId,
	Unit,
} from "@/engine";

const PODADOS = [
	"owningUnits",
	"similarity",
	"createRng",
	"promote",
	"demote",
	"MASTERY_TARGET",
	"REVIEW_SHARE",
	"unitMasteryRatio",
];

describe("barril @/engine", () => {
	it("T1.6: reexporta lo que la interfaz necesita y ya no exporta lo podado", async () => {
		const nombres = Object.keys(await import("@/engine"));
		expect(nombres).toContain("curriculum");
		expect(nombres).toContain("templates");
		for (const podado of PODADOS) {
			expect([podado, nombres.includes(podado)]).toEqual([podado, false]);
		}
	});

	it("reexporta los tipos que la interfaz necesita (se comprueba con typecheck)", () => {
		expectTypeOf<CurriculumIndex>().toEqualTypeOf<ContentIndex>();
		expectTypeOf<HintStep>().toEqualTypeOf<ContentHintStep>();
		expectTypeOf<Item>().toEqualTypeOf<ContentItem>();
		expectTypeOf<Unit>().toEqualTypeOf<ContentUnit>();
		expectTypeOf<TemplateId>().toEqualTypeOf<ContentTemplateId>();
	});

	it("K10: resolveEquipped y progressReport se exportan; unitMasteryRatio sigue fuera", async () => {
		const nombres = Object.keys(await import("@/engine"));
		expect(nombres).toContain("resolveEquipped");
		expect(nombres).toContain("progressReport");
		expect(nombres).not.toContain("unitMasteryRatio");
	});
});
