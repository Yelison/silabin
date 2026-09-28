export type { Listener, ListenResult } from "@/speech/capture";
export { createMicListener, createScriptedListener } from "@/speech/capture";
export { createParentEvaluator, pickEvaluator } from "@/speech/evaluators";
export { speechTarget } from "@/speech/target";
export type {
	SpeechEvaluator,
	SpeechLang,
	SpeechTarget,
	SpeechVerdict,
} from "@/speech/types";
