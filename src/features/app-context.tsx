"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type { AudioPlayer } from "@/audio";
import {
	createMicListener,
	createParentEvaluator,
	type Listener,
	type SpeechEvaluator,
} from "@/speech";
import type { AppState } from "@/store";

const StoreContext = createContext<StoreApi<AppState> | null>(null);
const AudioContext = createContext<AudioPlayer | null>(null);
const SpeechContext = createContext<SpeechDeps | null>(null);

/** Lo que necesita un turno de voz: cómo escuchar y quién puede evaluar. */
export type SpeechDeps = {
	listener: Listener;
	evaluators: readonly SpeechEvaluator[];
};

function defaultSpeech(): SpeechDeps {
	return {
		listener: createMicListener(),
		evaluators: [createParentEvaluator()],
	};
}

/**
 * Reparte el estado de la aplicación, el reproductor de audio y la voz a toda la interfaz.
 * Sin `speech`, se crean una vez el micrófono real y el evaluador `parent`.
 */
export function AppProviders(props: {
	store: StoreApi<AppState>;
	audio: AudioPlayer;
	speech?: SpeechDeps;
	children: ReactNode;
}) {
	const speech = useMemo(() => props.speech ?? defaultSpeech(), [props.speech]);
	return (
		<StoreContext.Provider value={props.store}>
			<AudioContext.Provider value={props.audio}>
				<SpeechContext.Provider value={speech}>
					{props.children}
				</SpeechContext.Provider>
			</AudioContext.Provider>
		</StoreContext.Provider>
	);
}

/** Se suscribe a una parte del estado. Sin `AppProviders` por encima, lanza. */
export function useApp<T>(selector: (s: AppState) => T): T {
	const store = useContext(StoreContext);
	if (store === null) throw new Error("useApp fuera de AppProviders");
	return useStore(store, selector);
}

export function useAudio(): AudioPlayer {
	const audio = useContext(AudioContext);
	if (audio === null) throw new Error("useAudio fuera de AppProviders");
	return audio;
}

export function useSpeech(): SpeechDeps {
	const speech = useContext(SpeechContext);
	if (speech === null) throw new Error("useSpeech fuera de AppProviders");
	return speech;
}
