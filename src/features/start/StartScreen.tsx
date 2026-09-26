"use client";

import { BigButton } from "@/components/BigButton";
import { useAudio } from "@/features/app-context";

/**
 * Pantalla de inicio: un botón grande con ▶ y nada de texto. Es también el gesto que los
 * navegadores exigen para dejar sonar el audio, así que `unlock` va dentro del toque, sin
 * esperar nada. Antes de este toque no suena nada.
 */
export function StartScreen(props: { onStart: () => void }) {
	const audio = useAudio();
	return (
		<main className="flex min-h-screen items-center justify-center">
			<BigButton
				aria-label="Empezar"
				className="h-48 w-48 text-8xl"
				onClick={() => {
					// Sin await: la llamada empieza dentro del gesto.
					audio.unlock().catch(() => {});
					props.onStart();
				}}
			>
				▶
			</BigButton>
		</main>
	);
}
