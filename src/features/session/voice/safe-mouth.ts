import { type Item, type MouthShape, mouthShapesFor } from "@/engine";

/**
 * Las formas de boca del ítem, o `null` si no se pueden dibujar. `mouthShapesFor` lanza ante un
 * fonema sin forma (un fallo de contenido, y una boca equivocada enseñaría el sonido mal); la
 * boca es decorativa (D21), así que la pantalla no cae: se sigue sin boca, con la instrucción
 * y el audio.
 */
export function safeMouthShapes(item: Item): MouthShape[] | null {
	try {
		return mouthShapesFor(item);
	} catch {
		return null;
	}
}
