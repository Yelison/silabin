/** Sintetizador falso compartido por los tests de `audio/` y de `App`. Sin lógica de producción. */

export class FakeUtterance {
	text: string;
	lang = "";
	voice: SpeechSynthesisVoice | null = null;
	onstart: (() => void) | null = null;
	onend: (() => void) | null = null;
	onerror: (() => void) | null = null;
	constructor(text: string) {
		this.text = text;
	}
}

export class FakeSynth {
	spoken: FakeUtterance[] = [];
	cancelCalls = 0;
	log: string[] | undefined;
	/** Retraso antes de `onstart`; por omisión dispara en el mismo tick de `speak()`. */
	startDelayMs: number | undefined;
	/** Si es `true`, `onstart` nunca llega (para probar el respaldo). */
	suppressOnstart = false;
	private voices: SpeechSynthesisVoice[] = [];
	private listeners = new Set<() => void>();

	speak = (u: FakeUtterance) => {
		this.spoken.push(u);
		this.log?.push(`speak:${u.text}`);
		if (this.suppressOnstart) return;
		const fire = () => u.onstart?.();
		if (this.startDelayMs === undefined) fire();
		else setTimeout(fire, this.startDelayMs);
	};
	cancel = () => {
		this.cancelCalls++;
	};
	getVoices = () => this.voices;
	addEventListener = (type: string, listener: () => void) => {
		if (type === "voiceschanged") this.listeners.add(listener);
	};
	removeEventListener = (type: string, listener: () => void) => {
		if (type === "voiceschanged") this.listeners.delete(listener);
	};
	setVoices(voices: SpeechSynthesisVoice[]) {
		this.voices = voices;
	}
	fireVoicesChanged() {
		for (const l of this.listeners) l();
	}
	/** Textos dichos, sin la locución vacía de `unlock`. */
	texts() {
		return this.spoken.map((u) => u.text).filter((t) => t !== "");
	}
	/** Termina de sonar la última utterance. */
	endLast() {
		this.spoken[this.spoken.length - 1]?.onend?.();
	}
}

export function voice(lang: string, name = lang): SpeechSynthesisVoice {
	return { lang, name } as unknown as SpeechSynthesisVoice;
}

export function asSynth(fake: FakeSynth): SpeechSynthesis {
	return fake as unknown as SpeechSynthesis;
}
