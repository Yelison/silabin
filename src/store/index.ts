/**
 * La única puerta de `store/` hacia la interfaz (`features/`, `components/`). El esquema de
 * disco y el puente de progreso son internos: la interfaz solo ve el estado de la aplicación y
 * lo necesario para conectarle un adaptador o restaurar una copia.
 */
export type { AppState, AppStoreDeps, ImportPreview } from "@/store/app-store";
export { createAppStore } from "@/store/app-store";
export type { ImportRejection, StorageAdapter } from "@/store/persist";
export {
	createIdbAdapter,
	createMemoryAdapter,
	importState,
} from "@/store/persist";
export { pinSupported } from "@/store/pin";
export type { Settings } from "@/store/schema";
