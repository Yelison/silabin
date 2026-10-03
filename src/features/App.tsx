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
import { CosmeticBackground } from "@/features/rewards/CosmeticBackground";
import { RewardsScreen } from "@/features/rewards/RewardsScreen";
import { TrailLayer } from "@/features/rewards/TrailLayer";
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
function createAudio(accent: () => Settings["accent"]): AudioPlayer {
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
			{/* Montada una sola vez, para toda la interfaz (S10): decide ella misma cuándo callarse. */}
			<TrailLayer />
			{screen === "start" && <StartScreen onStart={() => setScreen("map")} />}
			{screen === "map" && (
				<CosmeticBackground>
					<MapScreen
						onOpenPanel={() => setScreen("panel")}
						onOpenRewards={() => setScreen("rewards")}
						onStart={() => {
							beginSession();
							setScreen("session");
						}}
					/>
				</CosmeticBackground>
			)}
			{screen === "rewards" && (
				<CosmeticBackground>
					<RewardsScreen onClose={() => setScreen("map")} />
				</CosmeticBackground>
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
			{screen === "end" && (
				<CosmeticBackground>
					<EndScreen onDone={() => setScreen("map")} />
				</CosmeticBackground>
			)}
		</>
	);
}

/**
 * Raíz de la interfaz. Crea el store una sola vez, lo carga en un efecto (IndexedDB solo
 * existe en el cliente) y, ya cargado, crea un único reproductor. El acento le llega como
 * un getter sobre el store: el panel de padres lo cambia en vivo y el mismo reproductor,
 * ya desbloqueado, lo lee en cada locución. Recrearlo lo dejaría mudo (nace sin `unlock`,
 * y reanudar su `AudioContext` fuera de un gesto no funciona en iOS).
 * `store` y `audio` se pueden inyectar para los tests; `audioFactory` reemplaza la fábrica
 * real (voz del navegador) por una de test.
 */
export function App(props: {
	store?: StoreApi<AppState>;
	audio?: AudioPlayer;
	audioFactory?: (accent: () => Settings["accent"]) => AudioPlayer;
}) {
	const [store] = useState(() => props.store ?? createStore());
	const [audio, setAudio] = useState<AudioPlayer | null>(props.audio ?? null);
	const started = useRef(false);
	const factory = props.audioFactory ?? createAudio;

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
						actual ?? factory(() => store.getState().doc.settings.accent),
				);
			});
	}, [store, factory]);

	if (audio === null) return null;
	return (
		<AppProviders store={store} audio={audio}>
			<Screens />
		</AppProviders>
	);
}
