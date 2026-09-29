/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Sigue la plantilla de la guía de Serwist para Turbopack
// (https://serwist.pages.dev/docs/next/turbo), con dos cambios para S11: sin `skipWaiting`
// automático (solo al recibir `{type: "SKIP_WAITING"}` desde `features/pwa/update.ts`), y
// con la navegación sin red sirviendo `/` precacheado en vez de una página de «sin conexión»
// aparte.
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Declara a TypeScript el valor de `injectionPoint`: la cadena que Serwist sustituye por el
// manifiesto real de precaché en el build. Por defecto es `self.__SW_MANIFEST`.
declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
	// Lo que genera el build (fragmentos, CSS, fuentes de `next/font`) más `/`, las
	// ilustraciones y los iconos: ver `additionalPrecacheEntries` en
	// `src/app/serwist/[path]/route.ts`.
	precacheEntries: self.__SW_MANIFEST ?? [],
	precacheOptions: {
		// La navegación sin red sirve `/` precacheado en vez de reventar.
		navigateFallback: "/",
	},
	// Sin skipWaiting automático (S11): un SW nuevo que tomase el control a mitad de una
	// sesión rompería la carga de fragmentos ya en curso. Solo se activa cuando
	// `features/pwa/update.ts` pide `SKIP_WAITING`, y eso solo pasa desde `StartScreen`.
	skipWaiting: false,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
