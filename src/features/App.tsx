"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import {
	type AudioPlayer,
	createSilentPlayer,
	createSpeechPlayer,
} from "@/audio";
import { BigButton } from "@/components/BigButton";
import { curriculum } from "@/engine";
import { downloadInBrowser } from "@/features/adult/ExportGesture";
import { SaveWarning } from "@/features/adult/SaveWarning";
import { AppProviders, useApp } from "@/features/app-context";
import { MapScreen } from "@/features/map/MapScreen";
import { StartScreen } from "@/features/start/StartScreen";
import { type AppState, createAppStore, createIdbAdapter } from "@/store";

type Screen = "start" | "map" | "session" | "end";

function createStore(): StoreApi<AppState> {
	return createAppStore({
		adapter: createIdbAdapter(),
		content: curriculum,
		now: () => new Date().toISOString(),
		seed: () => Math.floor(Math.random() * 0x7fffffff),
	});
}

/** Voz del navegador mientras no haya locuciones reales; silencio si ni eso existe. */
function createAudio(accent: "do" | "mx" | "neutro"): AudioPlayer {
	if (typeof globalThis.speechSynthesis === "undefined")
		return createSilentPlayer();
	return createSpeechPlayer({ synth: globalThis.speechSynthesis, accent });
}

function Screens() {
	const status = useApp((s) => s.status);
	const beginSession = useApp((s) => s.beginSession);
	const abandonSession = useApp((s) => s.abandonSession);
	const [screen, setScreen] = useState<Screen>("start");

	if (status !== "ready") return null;

	return (
		<>
			<SaveWarning />
			{screen === "start" && <StartScreen onStart={() => setScreen("map")} />}
			{screen === "map" && (
				<MapScreen
					download={downloadInBrowser}
					onStart={() => {
						beginSession();
						setScreen("session");
					}}
				/>
			)}
			{screen === "session" && (
				// Provisional: la Tarea 7 monta aquí el hilo de la sesión.
				<main
					data-screen="session"
					className="flex min-h-screen items-center justify-center"
				>
					<BigButton
						aria-label="Volver al mapa"
						onClick={() => {
							abandonSession();
							setScreen("map");
						}}
					>
						◀
					</BigButton>
				</main>
			)}
		</>
	);
}

/**
 * Raíz de la interfaz. Crea el store una sola vez, lo carga en un efecto (IndexedDB solo
 * existe en el cliente) y, cuando ya se conoce el acento guardado, crea el reproductor.
 * `store` y `audio` se pueden inyectar para los tests.
 */
export function App(props: {
	store?: StoreApi<AppState>;
	audio?: AudioPlayer;
}) {
	const [store] = useState(() => props.store ?? createStore());
	const [audio, setAudio] = useState<AudioPlayer | null>(props.audio ?? null);
	const started = useRef(false);

	useEffect(() => {
		// El modo estricto de React monta dos veces en desarrollo: se carga una sola.
		if (started.current) return;
		started.current = true;
		void store
			.getState()
			.load()
			.then(() => {
				setAudio(
					(actual) =>
						actual ?? createAudio(store.getState().doc.settings.accent),
				);
			});
	}, [store]);

	if (audio === null) return null;
	return (
		<AppProviders store={store} audio={audio}>
			<Screens />
		</AppProviders>
	);
}
