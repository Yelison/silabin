import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	ACCENTS,
	audioManifest,
	audioPath,
	contentAudio,
	referencedAudioKeys,
	uiAudio,
} from "@/content/audio-manifest";
import { phase0Items, phase0Units } from "@/content/phase0";
import { phase1Items, phase1Units } from "@/content/phase1";
import { phase2Items, phase2Units } from "@/content/phase2";
import { pictures } from "@/content/pictures";
import { templateIds, templates } from "@/content/templates";

describe("manifiesto de audio", () => {
	it("declara los tres acentos", () => {
		expect(ACCENTS).toEqual(["do", "mx", "neutro"]);
	});

	it("cubre exactamente las claves que el contenido referencia, calculadas por separado", () => {
		// No se compara contra referencedAudioKeys(), porque contentAudio se construye a
		// partir de esa misma función y el test sería tautológico: no podría fallar nunca.
		// El conjunto esperado se recalcula aquí desde los datos crudos, así que este test
		// detectaría que referencedAudioKeys() olvidara, por ejemplo, los audios de unidad.
		const esperado = new Set([
			...[...pictures, ...phase0Items, ...phase1Items, ...phase2Items].map(
				(i) => i.audioKey,
			),
			...[...phase0Units, ...phase1Units, ...phase2Units].map(
				(u) => u.audioKey,
			),
		]);
		expect([...Object.keys(contentAudio)].sort()).toEqual([...esperado].sort());
		expect([...referencedAudioKeys()].sort()).toEqual([...esperado].sort());
	});

	it("los audios de unidad están en el manifiesto y dicen el título de su unidad", () => {
		for (const unit of [...phase0Units, ...phase1Units, ...phase2Units]) {
			expect([unit.id, contentAudio[unit.audioKey]]).toEqual([
				unit.id,
				unit.title,
			]);
		}
	});

	it("cada sílaba y cada palabra se locuta con su propio texto", () => {
		for (const item of [...phase2Items].filter(
			(i) => i.kind === "syllable" || i.kind === "word",
		)) {
			expect([item.id, contentAudio[item.audioKey]]).toEqual([
				item.id,
				item.text,
			]);
		}
	});

	it("ningún fonema se locuta con el nombre de la letra", () => {
		const NOMBRES = ["eme", "ele", "ese", "pe", "a", "e", "i", "o", "u"];
		for (const [key, text] of Object.entries(contentAudio)) {
			if (!key.startsWith("phoneme:")) continue;
			const letra = key.slice("phoneme:".length);
			expect([key, text.length >= 1]).toEqual([key, true]);
			if (letra !== "p") {
				// Las continuas se alargan; solo la oclusiva p se dice una vez.
				expect([key, text]).toEqual([key, letra.repeat(3)]);
			}
			expect([key, NOMBRES.slice(0, 4).includes(text)]).toEqual([key, false]);
		}
	});

	it("dos claves distintas nunca acaban en el mismo fichero", () => {
		for (const accent of ACCENTS) {
			const rutas = Object.keys(audioManifest).map((k) => audioPath(k, accent));
			expect(new Set(rutas).size).toBe(rutas.length);
		}
	});

	it("ninguna ruta conserva los dos puntos de la clave", () => {
		for (const key of Object.keys(audioManifest)) {
			expect([key, audioPath(key, "do").includes(":")]).toEqual([key, false]);
		}
	});

	it("ningún texto queda vacío", () => {
		for (const [key, text] of Object.entries(audioManifest)) {
			expect(text.trim().length, `clave vacía: ${key}`).toBeGreaterThan(0);
		}
	});

	it("el sonido de una consonante no es su nombre", () => {
		expect(contentAudio["phoneme:m"]).toBe("mmm");
		expect(contentAudio["phoneme:m"]).not.toBe("eme");
		expect(contentAudio["phoneme:s"]).toBe("sss");
	});

	it("declara una instrucción para cada plantilla", () => {
		for (const id of templateIds)
			expect(uiAudio[`instruction:${id}`]).toBeDefined();
	});

	it("declara audio para cada pista que lo necesita", () => {
		for (const id of templateIds) {
			for (const hint of templates[id].hints) {
				if (hint.action.includes("replay-instruction")) {
					expect(uiAudio[`instruction:${id}`]).toBeDefined();
				}
			}
		}
	});

	it("declara las locuciones de celebración y de reintento", () => {
		for (const key of [
			"celebrate:correct",
			"celebrate:session",
			"feedback:retry",
			"feedback:no-speech",
		]) {
			expect(uiAudio[key]).toBeDefined();
		}
	});

	it("audioPath construye la ruta esperada", () => {
		expect(audioPath("phoneme:a", "do")).toBe("/audio/do/phoneme_a.m4a");
	});

	it.runIf(process.env.SILABIN_CHECK_AUDIO_FILES === "1")(
		"todos los ficheros existen en los tres acentos",
		() => {
			for (const key of Object.keys(audioManifest)) {
				for (const accent of ACCENTS) {
					expect(
						existsSync(`public${audioPath(key, accent)}`),
						`falta ${key} en ${accent}`,
					).toBe(true);
				}
			}
		},
	);
});
