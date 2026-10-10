"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAudio } from "@/features/app-context";
import { applyWaitingUpdate } from "@/features/pwa/update";

const ESPERA_ACTUALIZACION_MS = 1000;
/** Si se pidió la actualización pero la recarga no llega, el toque no se queda muerto. */
const ESPERA_RECARGA_MS = 3000;

/** El contenedor real, o `undefined` si el navegador no tiene Service Workers. */
function contenedorReal():
	| Pick<ServiceWorkerContainer, "getRegistration" | "addEventListener">
	| undefined {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
		return undefined;
	return navigator.serviceWorker;
}

/** El `applyWaitingUpdate` real, con el `navigator` y `location` del navegador. */
function actualizacionReal(signal: AbortSignal): Promise<boolean> {
	return applyWaitingUpdate({
		container: contenedorReal(),
		reload: () => window.location.reload(),
		signal,
	});
}

type Comprobacion = "sin-hacer" | "pendiente" | "hecha";

/**
 * Devuelve `arrancar`, que va dentro del gesto (onClick) que inicia una sesión. Es también
 * el gesto que los navegadores exigen para dejar sonar el audio, así que `unlock` va
 * siempre dentro del toque, síncrono y sin esperar nada. Antes de este toque no suena nada.
 *
 * Solo la primera vez por montaje se comprueba si hay un Service Worker esperando (S11): si
 * lo hay, se le pide que tome el control y la página va a recargar sola, así que no se llama
 * a `onStart` (salvo que la recarga no llegue en 3 s: entonces se empieza sin actualizar).
 * Si no hay actualización, o tarda más de 1 s en resolverse, se sigue como siempre y la
 * actualización se descarta (`AbortSignal`): nunca se recarga con la app ya en marcha.
 * Mientras esa primera comprobación está pendiente, los toques nuevos se ignoran (salvo
 * `unlock`): un doble toque no arranca dos sesiones. Después, `onStart()` directamente.
 *
 * El gancho vive en `Screens`, nunca en la rama del mapa: esa rama se vuelve a montar tras
 * cada sesión y repetiría la comprobación (MC7).
 */
export function useArranque(
	onStart: () => void,
	/** Para pruebas: sustituye la comprobación real del Service Worker. */
	applyUpdate?: (signal: AbortSignal) => Promise<boolean>,
): () => void {
	const audio = useAudio();
	const comprobacion = useRef<Comprobacion>("sin-hacer");
	// Las últimas versiones, para que `arrancar` sea estable y no use cierres viejos.
	const ultimo = useRef({ audio, onStart, applyUpdate });
	useEffect(() => {
		ultimo.current = { audio, onStart, applyUpdate };
	});

	return useCallback(() => {
		const { audio, onStart, applyUpdate } = ultimo.current;
		// Sin await: la llamada empieza dentro del gesto.
		audio.unlock().catch(() => {});
		if (comprobacion.current === "pendiente") return;
		if (comprobacion.current === "hecha") {
			onStart();
			return;
		}
		comprobacion.current = "pendiente";
		let decidido = false;
		const cancelar = new AbortController();
		const empezar = () => {
			if (decidido) return;
			decidido = true;
			comprobacion.current = "hecha";
			// Desiste de la actualización: ni `SKIP_WAITING` ni recarga si llegan tarde.
			cancelar.abort();
			// El `onStart` de ahora, no el del toque: pasó hasta 1 s y la pantalla pudo cambiar.
			ultimo.current.onStart();
		};
		let espera = setTimeout(empezar, ESPERA_ACTUALIZACION_MS);
		(applyUpdate ?? actualizacionReal)(cancelar.signal).then(
			(vaARecargar) => {
				clearTimeout(espera);
				if (decidido) return;
				if (!vaARecargar) {
					empezar();
					return;
				}
				// La recarga debería llegar sola; si no llega, se empieza igualmente.
				espera = setTimeout(empezar, ESPERA_RECARGA_MS);
			},
			() => {
				clearTimeout(espera);
				empezar();
			},
		);
	}, []);
}
