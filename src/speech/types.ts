/** Contrato del spec §6. El audio del micrófono nunca se guarda: `audio` es solo para evaluadores futuros. */
export type SpeechLang = "es-MX" | "es-ES" | "es-US";
export type SpeechTarget = {
	text: string;
	phonemes: string[];
	lang: SpeechLang;
};
export type SpeechVerdict = {
	verdict: "ok" | "retry" | "unsure";
	confidence: number;
	detail?: unknown;
};
export interface SpeechEvaluator {
	readonly id: "parent" | "browser" | "azure";
	available(): Promise<boolean>;
	evaluate(input: {
		audio?: Blob;
		target: SpeechTarget;
	}): Promise<SpeechVerdict>;
}
