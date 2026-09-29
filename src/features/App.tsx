"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import {
	type AudioPlayer,
	createSilentPlayer,
	createSpeechPlayer,
} from "@/audio";
import { curriculum } from "@/engine";
import { downloadInBrowser } from "@/features/adult/download";
import { ParentGate } from "@/features/adult/ParentGate";
import { SaveWarning } from "@/features/adult/SaveWarning";
import { AppProviders, useApp } from "@/features/app-context";
import { MapScreen } from "@/features/map/MapScreen";
import { EndScreen } from "@/features/session/EndScreen";
import { SessionScreen } from "@/features/session/SessionScreen";
import { StartScreen } from "@/features/start/StartScreen";
import {
	type AppState,
	createAppStore,
	createIdbAdapter,
	type Settings,
} from "@/store";

type Screen = "start" | "map" | "session" | "end" | "panel" | "rewards";

function createStore(): StoreApi<AppState> {
	return createAppStore({
		adapter: createIdbAdapter(),
		content: curriculum,
		now: () => new Date().toISOString(),
		seed: () => Math.floor(Math.random() * 0x7fffffff),
	});
}

/** Voz del navegador mientras no haya locuciones reales; silencio si ni eso existe. */
function createAudio(accent: Settings["accent"]): AudioPlayer {
	if (typeof globalThis.speechSynthesis === "undefined")
		return createSilentPlayer();
	return createSpeechPlayer({ synth: globalThis.speechSynthesis, accent });
}

function Screens() {
	const status = useApp((s) => s.status);
	const beginSession = useApp((s) => s.beginSession);
	const [screen, setScreen] = useState<Screen>("start");

	if (status !== "ready") return null;

	return (
		<>
			<SaveWarning />
			{screen === "start" && <StartScreen onStart={() => setScreen("map")} />}
			{screen === "map" && (
				<MapScreen
					onOpenPanel={() => setScreen("panel")}
					onStart={() => {
						beginSession();
						setScreen("session");
					}}
				/>
			)}
			{screen === "panel" && (
				<ParentGate
					download={downloadInBrowser}
					onClose={() => setScreen("map")}
				/>
			)}
			{screen === "session" && (
				<SessionScreen
					onEnd={() => setScreen("end")}
					onExit={() => setScreen("map")}
				/>
			)}
			{screen === "end" && <EndScreen onDone={() => setScreen("map")} />}
		</>
	);
}

/**
 * Raíz de la interfaz. Crea el store una sola vez, lo carga en un efecto (IndexedDB solo
 * existe en el cliente) y, cuando ya se conoce el acento guardado, crea el reproductor.
 * `store` y `audio` se pueden inyectar para los tests; con `audio` puesto, el acento no
 * recrea el reproductor (S3): el test tiene el control del que le dieron.
 * `audioFactory` reemplaza la fábrica real (voz del navegador) por una de test.
 */
export function App(props: {
	store?: StoreApi<AppState>;
	audio?: AudioPlayer;
	audioFactory?: (accent: Settings["accent"]) => AudioPlayer;
}) {
	const [store] = useState(() => props.store ?? createStore());
	const [audio, setAudio] = useState<AudioPlayer | null>(props.audio ?? null);
	const started = useRef(false);
	const factory = props.audioFactory ?? createAudio;
	const injectedAudio = props.audio !== undefined;

	useEffect(() => {
		// El modo estricto de React monta dos veces en desarrollo: se carga una sola.
		if (started.current) return;
		started.current = true;
		void store
			.getState()
			.load()
			.then(() => {
				setAudio(
					(actual) => actual ?? factory(store.getState().doc.settings.accent),
				);
			});
	}, [store, factory]);

	// S3: el acento cambia en vivo desde el panel de padres. Solo se activa una vez que ya hay
	// un reproductor (la carga terminó), para no competir con el efecto de arriba por quién
	// crea el primero; y solo si nadie inyectó ya un reproductor fijo para el test.
	const listo = audio !== null;
	useEffect(() => {
		if (injectedAudio || !listo) return;
		let accentActual = store.getState().doc.settings.accent;
		return store.subscribe((state) => {
			const accent = state.doc.settings.accent;
			if (accent === accentActual) return;
			accentActual = accent;
			setAudio((anterior) => {
				anterior?.stop();
				return factory(accent);
			});
		});
	}, [store, factory, injectedAudio, listo]);

	if (audio === null) return null;
	return (
		<AppProviders store={store} audio={audio}>
			<Screens />
		</AppProviders>
	);
}
