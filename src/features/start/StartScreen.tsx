"use client";

import { BigButton } from "@/components/BigButton";
import { useAudio } from "@/features/app-context";
import { applyWaitingUpdate } from "@/features/pwa/update";

const ESPERA_ACTUALIZACION_MS = 1000;

/** El contenedor real, o `undefined` si el navegador no tiene Service Workers. */
function contenedorReal():
	| Pick<ServiceWorkerContainer, "getRegistration" | "addEventListener">
	| undefined {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
		return undefined;
	return navigator.serviceWorker;
}

/** El `applyWaitingUpdate` real, con el `navigator` y `location` del navegador. */
function actualizacionReal(): Promise<boolean> {
	return applyWaitingUpdate({
		container: contenedorReal(),
		reload: () => window.location.reload(),
	});
}

/**
 * Pantalla de inicio: un botón grande con ▶ y nada de texto. Es también el gesto que los
 * navegadores exigen para dejar sonar el audio, así que `unlock` va dentro del toque, sin
 * esperar nada. Antes de este toque no suena nada.
 *
 * Al tocar, primero se comprueba si hay un Service Worker esperando (S11): si lo hay, se le
 * pide que tome el control y la página va a recargar sola, así que no se llama a `onStart`.
 * Si no hay actualización, o tarda más de 1 s en resolverse, se sigue como siempre. Esto
 * solo pasa aquí, nunca durante una sesión abierta.
 */
export function StartScreen(props: {
	onStart: () => void;
	/** Para pruebas: sustituye la comprobación real del Service Worker. */
	applyUpdate?: () => Promise<boolean>;
}) {
	const audio = useAudio();
	return (
		<main className="flex min-h-screen items-center justify-center">
			<BigButton
				aria-label="Empezar"
				className="h-48 w-48 text-8xl"
				onClick={() => {
					// Sin await: la llamada empieza dentro del gesto.
					audio.unlock().catch(() => {});
					let decidido = false;
					const empezar = () => {
						if (decidido) return;
						decidido = true;
						props.onStart();
					};
					const espera = setTimeout(empezar, ESPERA_ACTUALIZACION_MS);
					(props.applyUpdate ?? actualizacionReal)().then(
						(vaARecargar) => {
							clearTimeout(espera);
							if (!vaARecargar) empezar();
						},
						() => {
							clearTimeout(espera);
							empezar();
						},
					);
				}}
			>
				▶
			</BigButton>
		</main>
	);
}
