import { describe, expect, it } from "vitest";
import { stretchKey } from "@/content/audio-keys";
import { audioManifest } from "@/content/audio-manifest";
import {
	createAttemptState,
	curriculum,
	emptyProgressState,
	glyphFor,
	type PlannedExercise,
	type SessionRun,
	submitSpeech,
	templates,
} from "@/engine";
import { firstSyllableAudioKey } from "@/engine/answers";

/**
 * Trampa 9 para trazo y voz: cada pareja (plantilla, ítem) que una unidad de las fases 0-2
 * puede planificar debe poder evaluarse hasta el final. Las de toque y arrastre ya las cubre
 * M11 de `src/content/invariants.test.ts`; no se duplican aquí.
 */
describe("trampa 9: trazo y voz siempre son evaluables", () => {
	function corridaDe(exercise: PlannedExercise): SessionRun {
		return {
			sessionIndex: 0,
			unitId: null,
			exercises: [exercise],
			cursor: 0,
			attempt: createAttemptState(),
			resolutions: [],
			progress: emptyProgressState(),
		};
	}

	it("M11: cada pareja de voz da mastery-credit con audio; cada pareja de trazo tiene glifo", () => {
		const visitadas = new Map<string, number>();
		for (const unit of curriculum.units.values()) {
			if (unit.phase > 2) continue;
			for (const { templateId } of unit.exercises) {
				const template = templates[templateId];
				if (template.evaluation !== "voice" && template.evaluation !== "trace")
					continue;
				for (const itemId of unit.introduces) {
					const item = curriculum.items.get(itemId);
					if (item === undefined) continue;
					if (!template.itemKinds.includes(item.kind)) continue;
					const clave = [unit.id, templateId, itemId];

					if (template.evaluation === "trace") {
						visitadas.set(templateId, (visitadas.get(templateId) ?? 0) + 1);
						expect(
							() => glyphFor(item, "upper"),
							clave.join(" "),
						).not.toThrow();
						continue;
					}

					visitadas.set(templateId, (visitadas.get(templateId) ?? 0) + 1);
					const { feedback } = submitSpeech({
						content: curriculum,
						run: corridaDe({
							id: "ex",
							kind: "evaluation",
							templateId,
							itemId,
							optionIds: [],
							correctOptionId: null,
							source: "active-unit",
						}),
						verdict: "ok",
						now: "2026-09-28T10:00:00.000Z",
					});
					expect([clave, feedback.resolution?.status]).toEqual([
						clave,
						"mastery-credit",
					]);
					const audios =
						templateId === "say-it"
							? [stretchKey(item.id), item.audioKey]
							: [firstSyllableAudioKey(curriculum, item), item.audioKey];
					for (const audio of audios)
						expect([clave, audio, Object.hasOwn(audioManifest, audio)]).toEqual(
							[clave, audio, true],
						);
				}
			}
		}
		// Metacomprobación por plantilla: un bucle que se salte una sola saldría en verde.
		for (const plantilla of ["say-it", "read-word", "trace"])
			expect([plantilla, visitadas.get(plantilla) ?? 0]).not.toEqual([
				plantilla,
				0,
			]);
	});
});
