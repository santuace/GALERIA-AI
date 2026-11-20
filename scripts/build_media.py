#!/usr/bin/env python3
"""
Genera versiones livianas de la galería para que la web cargue rápido.

  imagenes/thumbs/<nombre>.webp    miniatura 640px de ancho para la grilla
  imagenes/posters/<nombre>.webp   primer frame de cada video (se ve al instante)
  imagenes/previews/<nombre>.mp4   loop liviano sin audio para la grilla
  media_manifest.js                ancho/alto de cada archivo (evita saltos de layout)

Los videos originales se remuxean con +faststart (sin recomprimir) para que
el modal empiece a reproducir sin descargar el archivo entero.

Uso:  python3 scripts/build_media.py          (solo procesa lo nuevo)
      python3 scripts/build_media.py --force  (rehace todo)

Necesita Pillow y ffmpeg (en el PATH o vía `pip install imageio-ffmpeg`).
"""
import json, os, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "imagenes")
THUMBS, POSTERS, PREVIEWS = (os.path.join(SRC, d) for d in ("thumbs", "posters", "previews"))
FORCE = "--force" in sys.argv
THUMB_W, PREVIEW_W = 640, 540


def ffmpeg_bin():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("Falta ffmpeg: instalalo o corré `pip install imageio-ffmpeg`.")


FF = None


def run(*args):
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def avg_color(path):
    """Color promedio, se usa de fondo mientras la pieza carga."""
    with Image.open(path) as im:
        r, g, b = im.convert("RGB").resize((1, 1), Image.BOX).getpixel((0, 0))
    return f"#{r:02x}{g:02x}{b:02x}"


def stale(src, dst):
    return FORCE or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)


def main():
    global FF
    for d in (THUMBS, POSTERS, PREVIEWS):
        os.makedirs(d, exist_ok=True)
    manifest = {}
    files = sorted(f for f in os.listdir(SRC) if os.path.isfile(os.path.join(SRC, f)) and not f.startswith("."))

    for f in files:
        path = os.path.join(SRC, f)
        base, ext = os.path.splitext(f)
        ext = ext.lower()

        if ext in (".webp", ".jpg", ".jpeg", ".png"):
            with Image.open(path) as im:
                w, h = im.size
                thumb = os.path.join(THUMBS, base + ".webp")
                if stale(path, thumb):
                    t = im.convert("RGB")
                    t.thumbnail((THUMB_W, THUMB_W * 4), Image.LANCZOS)
                    t.save(thumb, "WEBP", quality=78, method=6)
            manifest[f] = {"w": w, "h": h, "c": avg_color(thumb)}

        elif ext in (".mp4", ".mov", ".webm"):
            FF = FF or ffmpeg_bin()
            poster = os.path.join(POSTERS, base + ".webp")
            preview = os.path.join(PREVIEWS, base + ".mp4")
            if stale(path, poster):
                tmp = poster + ".png"
                run("-ss", "0.1", "-i", path, "-frames:v", "1", tmp)
                with Image.open(tmp) as im:
                    im = im.convert("RGB")
                    im.thumbnail((THUMB_W, THUMB_W * 4), Image.LANCZOS)
                    im.save(poster, "WEBP", quality=78, method=6)
                os.remove(tmp)
            if stale(path, preview):
                run("-i", path, "-an", "-t", "10",
                    "-vf", f"scale={PREVIEW_W}:-2,fps=24",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "30",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", preview)
                # remux del original con faststart (sin pérdida)
                tmp = path + ".faststart.mp4"
                run("-i", path, "-c", "copy", "-movflags", "+faststart", tmp)
                os.replace(tmp, path)
                os.utime(preview)  # que el preview quede más nuevo que el original
                os.utime(poster)
            with Image.open(poster) as im:
                w, h = im.size
            manifest[f] = {"w": w, "h": h, "c": avg_color(poster)}

    out = os.path.join(ROOT, "media_manifest.js")
    with open(out, "w") as fh:
        fh.write("// Generado por scripts/build_media.py — no editar a mano\n")
        fh.write("const mediaManifest = " + json.dumps(manifest, indent=0) + ";\n")
    print(f"{len(manifest)} archivos procesados → media_manifest.js")


if __name__ == "__main__":
    main()
