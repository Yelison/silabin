import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AppProviders,
	type SpeechDeps,
	useSpeech,
} from "@/features/app-context";
import { crearStore, fakeAudio } from "@/features/test-support";
import { createScriptedListener } from "@/speech";

afterEach(cleanup);

function Sonda(props: { onSpeech: (s: SpeechDeps) => void }) {
	props.onSpeech(useSpeech());
	return null;
}

describe("useSpeech", () => {
	it("S16: sin AppProviders lanza", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() => render(<Sonda onSpeech={() => {}} />)).toThrow();
		} finally {
			error.mockRestore();
		}
	});

	it("S16: sin la prop speech devuelve un micrófono y solo el evaluador parent, estables entre pintados", () => {
		const vistos: SpeechDeps[] = [];
		const arbol = (
			<AppProviders store={crearStore()} audio={fakeAudio()}>
				<Sonda onSpeech={(s) => vistos.push(s)} />
			</AppProviders>
		);
		const { rerender } = render(arbol);
		rerender(arbol);
		const primero = vistos[0];
		expect(typeof primero?.listener.listen).toBe("function");
		expect(primero?.evaluators.map((e) => e.id)).toEqual(["parent"]);
		expect(vistos.at(-1)).toBe(primero);
	});

	it("con la prop speech reparte exactamente esa", () => {
		const speech: SpeechDeps = {
			listener: createScriptedListener([{ kind: "heard" }]),
			evaluators: [],
		};
		let visto: SpeechDeps | null = null;
		render(
			<AppProviders store={crearStore()} audio={fakeAudio()} speech={speech}>
				<Sonda onSpeech={(s) => (visto = s)} />
			</AppProviders>,
		);
		expect(visto).toBe(speech);
	});
});
