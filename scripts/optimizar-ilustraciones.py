#!/usr/bin/env python3
"""Reduce las ilustraciones de las palabras a WebP de 384 x 384 para la PWA.

Uso: python3 scripts/optimizar-ilustraciones.py <carpeta-origen>

Por cada `img-<slug>.png` de la carpeta escribe `public/images/palabras/<slug>.webp`
(calidad 80, con alfa, `method=6`). Falla si hay menos de 65 PNG o si alguno está
truncado. Con `method=6` sobre /mnt/c tarda más de 2 minutos: lánzalo en segundo plano.
"""
import sys
from pathlib import Path

from PIL import Image

ESPERADAS = 65
LADO = 384
CALIDAD = 80
DESTINO = Path(__file__).resolve().parent.parent / "public" / "images" / "palabras"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    origen = Path(sys.argv[1])
    ficheros = sorted(origen.glob("img-*.png"))
    if len(ficheros) != ESPERADAS:
        print(f"Se esperaban {ESPERADAS} PNG y hay {len(ficheros)} en {origen}", file=sys.stderr)
        return 1
    DESTINO.mkdir(parents=True, exist_ok=True)
    total = 0
    mayor = ("", 0)
    for fichero in ficheros:
        slug = fichero.stem.removeprefix("img-")
        try:
            with Image.open(fichero) as imagen:
                imagen.load()  # falla si el PNG está truncado
                imagen = imagen.convert("RGBA").resize((LADO, LADO), Image.LANCZOS)
        except Exception as error:  # noqa: BLE001
            print(f"PNG ilegible o truncado: {fichero.name}: {error}", file=sys.stderr)
            return 1
        salida = DESTINO / f"{slug}.webp"
        imagen.save(salida, "WEBP", quality=CALIDAD, method=6)
        peso = salida.stat().st_size
        total += peso
        if peso > mayor[1]:
            mayor = (slug, peso)
    print(f"{len(ficheros)} ilustraciones, {total / 1024:.0f} KB en total; la mayor: {mayor[0]} ({mayor[1] / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
