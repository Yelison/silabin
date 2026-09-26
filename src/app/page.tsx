import { App } from "@/features/App";

// Server Component: solo monta la raíz de cliente. Todo lo que necesita el navegador
// (IndexedDB, audio) vive detrás de `App`.
export default function Home() {
	return <App />;
}
