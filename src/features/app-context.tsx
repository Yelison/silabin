"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type { AudioPlayer } from "@/audio";
import type { AppState } from "@/store";

const StoreContext = createContext<StoreApi<AppState> | null>(null);
const AudioContext = createContext<AudioPlayer | null>(null);

/** Reparte el estado de la aplicación y el reproductor de audio a toda la interfaz. */
export function AppProviders(props: {
	store: StoreApi<AppState>;
	audio: AudioPlayer;
	children: ReactNode;
}) {
	return (
		<StoreContext.Provider value={props.store}>
			<AudioContext.Provider value={props.audio}>
				{props.children}
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
