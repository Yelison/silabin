import type { ReactNode } from "react";
import { vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import type { AudioPlayer } from "@/audio";
import { curriculum } from "@/engine";
import { AppProviders } from "@/features/app-context";
import {
	type AppState,
	createAppStore,
	createMemoryAdapter,
	type StorageAdapter,
} from "@/store";

/** Un reproductor que solo anota lo que se le pide. Nada suena. */
export function fakeAudio() {
	let unlocked = false;
	const audio = {
		get unlocked() {
			return unlocked;
		},
		unlock: vi.fn(async () => {
			unlocked = true;
		}),
		play: vi.fn(async () => {}),
		stop: vi.fn(),
		beat: vi.fn(),
	} satisfies AudioPlayer;
	return audio;
}

/** Un adaptador en memoria que falla al escribir mientras `fallo.activo` sea true. */
export function adaptadorQueFalla(initial: unknown = null) {
	const base = createMemoryAdapter(initial);
	const fallo = { activo: false };
	const adapter: StorageAdapter = {
		read: () => base.read(),
		clear: () => base.clear(),
		write: (value) =>
			fallo.activo
				? Promise.reject(new Error("cuota agotada"))
				: base.write(value),
	};
	return { adapter, fallo };
}

export function crearStore(
	adapter: StorageAdapter = createMemoryAdapter(),
): StoreApi<AppState> {
	let reloj = 0;
	return createAppStore({
		adapter,
		content: curriculum,
		now: () => `2026-09-26T12:00:${String(reloj++ % 60).padStart(2, "0")}.000Z`,
		seed: () => 1,
	});
}

export function conProveedores(
	store: StoreApi<AppState>,
	audio: AudioPlayer,
	children: ReactNode,
) {
	return (
		<AppProviders store={store} audio={audio}>
			{children}
		</AppProviders>
	);
}
