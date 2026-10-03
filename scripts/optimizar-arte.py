#!/usr/bin/env python3
"""Convierte los 27 PNG del arte en las 31 salidas de `public/`.

Uso: python3 scripts/optimizar-arte.py <carpeta-origen> [--destino <raíz>]

`--destino` es la raíz del repo por defecto; las salidas van a `<raíz>/public/...`.
Valida todo antes de escribir: si algo falla, sale con 1, cuenta cada problema en
`stderr` y no escribe ni un fichero. Con `method=6` sobre /mnt/c es lento: lánzalo
en segundo plano.
"""
import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FONDO_APP = (0xFF, 0xF8, 0xEC)


@dataclass(frozen=True)
class Salida:
    ruta: str  # relativa a public/
    ancho: int
    alto: int
    formato: str  # "webp" | "png"
    calidad: int = 80
    plano: bool = False  # sin alfa (RGB)


@dataclass(frozen=True)
class Pieza:
    origen: str  # nombre sin .png
    clase: str
    transparente: bool
    salidas: tuple[Salida, ...]


def _arte(nombre: str, lado: int, calidad: int = 80) -> Salida:
    return Salida(f"images/arte/{nombre}.webp", lado, lado, "webp", calidad)


PIEZAS: tuple[Pieza, ...] = (
    *(
        Pieza(n, "compañero", True, (_arte(n, 512),))
        for n in ("companion-1", "companion-1-gorra", "companion-2", "companion-2-gorra")
    ),
    *(
        Pieza(
            n, "fondo", False,
            (Salida(f"images/arte/{n}.webp", 960, 1280, "webp", 75, plano=True),),
        )
        for n in ("bg-default", "bg-pradera", "bg-espacio", "bg-bosque")
    ),
    *(
        Pieza(n, "pegatina", True, (_arte(n, 384),))
        for n in ("sticker-avion", "sticker-10", "sticker-25", "sticker-50", "sticker-100", "trophy")
    ),
    *(
        Pieza(
            f"particle-{n}", "partícula", True,
            (
                _arte(f"particle-{n}", 64),
                Salida(f"icons/cursor-{n}.png", 32, 32, "png"),
            ),
        )
        for n in ("estrellita", "burbuja")
    ),
    *(
        Pieza(n, "boca", True, (_arte(n, 256),))
        for n in ("mouth-open", "mouth-spread", "mouth-round", "mouth-closed", "mouth-teeth", "mouth-tongue")
    ),
    *(
        Pieza(n, "icono", True, (Salida(f"icons/{n}.png", 256, 256, "png"),))
        for n in ("ui-erase", "ui-done", "ui-gallery", "ui-lock")
    ),
    Pieza(
        "app-512", "app", False,
        (
            Salida("icons/app-512.png", 512, 512, "png", plano=True),
            Salida("icons/app-192.png", 192, 192, "png", plano=True),
            Salida("icons/apple-touch-icon.png", 180, 180, "png", plano=True),
        ),
    ),
)


def recortar(imagen: Image.Image, ancho: int, alto: int) -> Image.Image:
    """Recorte central a la proporción ancho:alto."""
    w, h = imagen.size
    if w * alto > h * ancho:  # demasiado ancha
        nuevo_w = h * ancho // alto
        izq = (w - nuevo_w) // 2
        return imagen.crop((izq, 0, izq + nuevo_w, h))
    nuevo_h = w * alto // ancho
    arriba = (h - nuevo_h) // 2
    return imagen.crop((0, arriba, w, arriba + nuevo_h))


def tiene_transparencia(imagen: Image.Image) -> bool:
    if imagen.mode not in ("RGBA", "LA", "PA") and "transparency" not in imagen.info:
        return False
    alfa = imagen.convert("RGBA").getchannel("A")
    minimo, _ = alfa.getextrema()
    return minimo < 255


def preparar(imagen: Image.Image, salida: Salida) -> Image.Image:
    recortada = recortar(imagen, salida.ancho, salida.alto)
    redim = recortada.resize((salida.ancho, salida.alto), Image.LANCZOS)
    if salida.plano:
        base = Image.new("RGBA", redim.size, FONDO_APP + (255,))
        return Image.alpha_composite(base, redim).convert("RGB")
    return redim


def validar(origen: Path) -> tuple[list[str], dict[str, Image.Image], list[str]]:
    """Devuelve (problemas, imágenes cargadas, avisos). No escribe nada."""
    problemas: list[str] = []
    avisos: list[str] = []
    cargadas: dict[str, Image.Image] = {}
    for pieza in PIEZAS:
        ruta = origen / f"{pieza.origen}.png"
        if not ruta.is_file():
            problemas.append(f"falta el origen {ruta.name}")
            continue
        try:
            with Image.open(ruta) as abierta:
                abierta.load()  # falla si el PNG está truncado
                imagen = abierta.convert("RGBA")
                tenia_alfa = tiene_transparencia(abierta)
        except Exception as error:  # noqa: BLE001
            problemas.append(f"{ruta.name}: PNG ilegible o truncado ({error})")
            continue
        if pieza.transparente and not tenia_alfa:
            problemas.append(
                f"{ruta.name}: necesita transparencia (ningún píxel con alfa < 255); "
                "se vería como una caja cuadrada"
            )
        w, h = imagen.size
        for salida in pieza.salidas:
            recortada = recortar(imagen, salida.ancho, salida.alto)
            if recortada.size != (w, h) and salida.ancho == salida.alto:
                aviso = f"aviso: {ruta.name} no es cuadrado ({w} × {h}); se recorta al centro"
                if aviso not in avisos:
                    avisos.append(aviso)
            cw, ch = recortada.size
            if cw < salida.ancho or ch < salida.alto:
                problemas.append(
                    f"{ruta.name}: tras el recorte mide {cw} × {ch}, más pequeño que "
                    f"{salida.ancho} × {salida.alto} de {salida.ruta}; no se amplía"
                )
        cargadas[pieza.origen] = imagen
    return problemas, cargadas, avisos


def escribir(destino: Path, imagen: Image.Image, salida: Salida) -> int:
    ruta = destino / "public" / salida.ruta
    ruta.parent.mkdir(parents=True, exist_ok=True)
    final = preparar(imagen, salida)
    if salida.formato == "webp":
        final.save(ruta, "WEBP", quality=salida.calidad, method=6)
    else:
        final.save(ruta, "PNG", optimize=True)
    return ruta.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description="Optimiza las 27 piezas de arte.")
    parser.add_argument("origen", type=Path, help="carpeta con los PNG de origen")
    parser.add_argument("--destino", type=Path, default=RAIZ, help="raíz del repo (por defecto, esta)")
    args = parser.parse_args()

    problemas, cargadas, avisos = validar(args.origen)
    if problemas:
        for problema in problemas:
            print(f"error: {problema}", file=sys.stderr)
        print(f"{len(problemas)} problema(s); no se ha escrito nada", file=sys.stderr)
        return 1
    for aviso in avisos:
        print(aviso)

    total = 0
    cuenta = 0
    mayor_por_clase: dict[str, tuple[str, int]] = {}
    for pieza in PIEZAS:
        for salida in pieza.salidas:
            peso = escribir(args.destino, cargadas[pieza.origen], salida)
            total += peso
            cuenta += 1
            if peso > mayor_por_clase.get(pieza.clase, ("", -1))[1]:
                mayor_por_clase[pieza.clase] = (salida.ruta, peso)
    print(f"{cuenta} salidas, {total / 1024:.0f} KB en total")
    for clase, (ruta, peso) in mayor_por_clase.items():
        print(f"  {clase}: la más pesada es {ruta} ({peso / 1024:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
