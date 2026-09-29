"""Pruebas de scripts/optimizar-arte.py con PNG sintéticos.

El guion del nombre impide importar el script: se ejecuta como subproceso.
"""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SCRIPT = RAIZ / "scripts" / "optimizar-arte.py"

COMPANEROS = ["companion-1", "companion-1-gorra", "companion-2", "companion-2-gorra"]
FONDOS = ["bg-default", "bg-pradera", "bg-espacio", "bg-bosque"]
PEGATINAS = ["sticker-avion", "sticker-10", "sticker-25", "sticker-50", "sticker-100", "trophy"]
PARTICULAS = ["particle-estrellita", "particle-burbuja"]
BOCAS = ["mouth-open", "mouth-spread", "mouth-round", "mouth-closed", "mouth-teeth", "mouth-tongue"]
ICONOS = ["ui-erase", "ui-done", "ui-gallery", "ui-lock"]

# (salida relativa a public/, tamaño, ¿RGBA?)
SALIDAS: list[tuple[str, int | tuple[int, int], bool]] = []
for n in COMPANEROS:
    SALIDAS.append((f"images/arte/{n}.webp", (512, 512), True))
for n in FONDOS:
    SALIDAS.append((f"images/arte/{n}.webp", (960, 1280), False))
for n in PEGATINAS:
    SALIDAS.append((f"images/arte/{n}.webp", (384, 384), True))
for n in PARTICULAS:
    SALIDAS.append((f"images/arte/{n}.webp", (64, 64), True))
    SALIDAS.append((f"icons/cursor-{n.removeprefix('particle-')}.png", (32, 32), True))
for n in BOCAS:
    SALIDAS.append((f"images/arte/{n}.webp", (256, 256), True))
for n in ICONOS:
    SALIDAS.append((f"icons/{n}.png", (256, 256), True))
SALIDAS.append(("icons/app-512.png", (512, 512), False))
SALIDAS.append(("icons/app-192.png", (192, 192), False))
SALIDAS.append(("icons/apple-touch-icon.png", (180, 180), False))


def png_transparente(ruta: Path, tam=(1024, 1024)) -> None:
    img = Image.new("RGBA", tam, (30, 120, 200, 255))
    lado = min(tam) // 4  # un hueco que sobreviva al reescalado
    img.paste(Image.new("RGBA", (lado, lado), (0, 0, 0, 0)), (0, 0))
    img.save(ruta)


def png_opaco(ruta: Path, tam, color=(200, 180, 60)) -> None:
    Image.new("RGB", tam, color).save(ruta)


def juego(origen: Path) -> None:
    for n in COMPANEROS + PEGATINAS + PARTICULAS + BOCAS + ICONOS:
        png_transparente(origen / f"{n}.png")
    for n in FONDOS:
        png_opaco(origen / f"{n}.png", (1024, 1536))
    png_opaco(origen / "app-512.png", (1024, 1024))


def ejecutar(origen: Path, destino: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(origen), "--destino", str(destino)],
        capture_output=True,
        text=True,
    )


def ficheros(destino: Path) -> list[Path]:
    return [p for p in destino.rglob("*") if p.is_file()]


class OptimizarArte(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.origen = Path(self._tmp.name) / "origen"
        self.destino = Path(self._tmp.name) / "destino"
        self.origen.mkdir()
        self.destino.mkdir()
        juego(self.origen)

    def test_op1_juego_completo(self):
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(SALIDAS), 31)
        for ruta, tam, alfa in SALIDAS:
            with Image.open(self.destino / "public" / ruta) as img:
                img.load()
                self.assertEqual(img.size, tam, ruta)
                if alfa:
                    self.assertEqual(img.mode, "RGBA", ruta)
                else:
                    self.assertEqual(img.mode, "RGB", ruta)
        self.assertEqual(len(ficheros(self.destino)), 31)

    def test_op2_faltan_origenes(self):
        (self.origen / "mouth-teeth.png").unlink()
        (self.origen / "bg-bosque.png").unlink()
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 1)
        self.assertIn("mouth-teeth.png", r.stderr)
        self.assertIn("bg-bosque.png", r.stderr)
        self.assertEqual(ficheros(self.destino), [])

    def test_op3_png_truncado(self):
        ruta = self.origen / "trophy.png"
        datos = ruta.read_bytes()
        ruta.write_bytes(datos[: len(datos) // 2])
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 1)
        self.assertIn("trophy.png", r.stderr)
        self.assertEqual(ficheros(self.destino), [])

    def test_op4_transparente_sin_alfa(self):
        png_opaco(self.origen / "companion-1.png", (1024, 1024))
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 1)
        self.assertIn("companion-1.png", r.stderr)
        self.assertIn("transparencia", r.stderr)
        self.assertEqual(ficheros(self.destino), [])

    def test_op5_fondo_recorta_al_centro(self):
        img = Image.new("RGB", (1024, 1536), (10, 200, 10))
        for y in range(60):
            for x in range(1024):
                img.putpixel((x, y), (250, 0, 250))
        img.save(self.origen / "bg-pradera.png")
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 0, r.stderr)
        with Image.open(self.destino / "public/images/arte/bg-pradera.webp") as out:
            self.assertEqual(out.size, (960, 1280))
            r0, g0, b0 = out.convert("RGB").getpixel((0, 0))
            self.assertLess(abs(r0 - 10), 20)
            self.assertLess(abs(g0 - 200), 20)
            self.assertLess(abs(b0 - 10), 20)

    def test_op6_origen_demasiado_pequeno(self):
        png_transparente(self.origen / "sticker-10.png", (200, 200))
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 1)
        self.assertIn("sticker-10.png", r.stderr)
        self.assertIn("384", r.stderr)
        self.assertEqual(ficheros(self.destino), [])

    def test_op7_app_se_aplana(self):
        img = Image.new("RGBA", (1024, 1024), (20, 20, 200, 255))
        hueco = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
        for esquina in [(0, 0), (924, 0), (0, 924), (924, 924)]:
            img.paste(hueco, esquina)
        img.save(self.origen / "app-512.png")
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 0, r.stderr)
        with Image.open(self.destino / "public/icons/apple-touch-icon.png") as out:
            self.assertEqual(out.mode, "RGB")
            self.assertEqual(out.getpixel((0, 0)), (0xFF, 0xF8, 0xEC))

    def test_op8_recorte_cuadrado_con_aviso(self):
        png_transparente(self.origen / "companion-2.png", (1024, 1100))
        r = ejecutar(self.origen, self.destino)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("aviso:", r.stdout)
        self.assertIn("companion-2.png", r.stdout)
        with Image.open(self.destino / "public/images/arte/companion-2.webp") as out:
            self.assertEqual(out.size, (512, 512))


if __name__ == "__main__":
    unittest.main()
