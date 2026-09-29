#!/usr/bin/env python3
"""Genera los iconos provisionales de la PWA: una «S» en `action-ink` sobre `action` (S13).

Uso: python3 scripts/iconos-pwa.py

Escribe `public/icons/app-192.png`, `public/icons/app-512.png` (cuadrados, para el
manifiesto) y `public/icons/apple-touch-icon.png` (180x180, sin transparencia, como pide
iOS). Provisional: el Plan 7 los sustituye por la identidad visual final.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Mismos valores que `--color-action` y `--color-action-ink` en src/app/globals.css.
COLOR_FONDO = "#f5b83d"
COLOR_LETRA = "#3a2a00"
DESTINO = Path(__file__).resolve().parent.parent / "public" / "icons"

# Tamaños del manifiesto (192, 512) más el `apple-touch-icon` que pide iOS (180, sin alfa).
TAMANOS = {"app-192.png": 192, "app-512.png": 512, "apple-touch-icon.png": 180}


def _fuente(lado: int) -> ImageFont.FreeTypeFont:
    # Fuentes del sistema, con fallback razonable en distintos entornos (CI, WSL, macOS).
    candidatas = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for ruta in candidatas:
        if Path(ruta).exists():
            return ImageFont.truetype(ruta, int(lado * 0.62))
    return ImageFont.load_default(size=int(lado * 0.62))


def _icono(lado: int) -> Image.Image:
    imagen = Image.new("RGB", (lado, lado), COLOR_FONDO)
    dibujo = ImageDraw.Draw(imagen)
    fuente = _fuente(lado)
    caja = dibujo.textbbox((0, 0), "S", font=fuente)
    ancho, alto = caja[2] - caja[0], caja[3] - caja[1]
    posicion = ((lado - ancho) / 2 - caja[0], (lado - alto) / 2 - caja[1])
    dibujo.text(posicion, "S", font=fuente, fill=COLOR_LETRA)
    return imagen


def main() -> int:
    DESTINO.mkdir(parents=True, exist_ok=True)
    for nombre, lado in TAMANOS.items():
        _icono(lado).save(DESTINO / nombre, "PNG")
    print(f"{len(TAMANOS)} iconos escritos en {DESTINO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
