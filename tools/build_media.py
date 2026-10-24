#!/usr/bin/env python3
"""Build web-ready media for the frontend from the crawled originals in media/.

    uv run --with pillow python tools/build_media.py

Writes to frontend/public/media/. Re-runnable; overwrites outputs.
Needs ffmpeg on PATH for the hero videos.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "media"
OUT = ROOT / "frontend" / "public" / "media"
U = SRC / "2024"

# name -> source. Service images are keyed by catalog.json "image".
PHOTOS = {
    # services
    "services/aromatherapy": U / "03/AdobeStock_373773981-scaled.jpeg",
    "services/castle": U / "03/AdobeStock_68840256-scaled.jpeg",
    "services/couples": U / "03/AdobeStock_59952403-scaled.jpeg",
    "services/deep-tissue": U / "03/AdobeStock_473751665-scaled.jpeg",
    "services/shiatsu": U / "03/close-up-patient-getting-massage-scaled.jpg",
    "services/pregnancy": U / "03/AdobeStock_641364486-scaled.jpeg",
    "services/slimming": U / "03/AdobeStock_747642596-scaled.jpeg",
    "services/sports-thai": U / "03/AdobeStock_126594351-scaled.jpeg",
    "services/swedish": U / "03/AdobeStock_633157647-scaled.jpeg",
    "services/cbd": U / "04/patient-getting-cbd-treatment-scaled.jpg",
    "services/detox": U / "03/AdobeStock_498179586-scaled.jpeg",
    "services/hot-spring": U / "03/AdobeStock_116233186-scaled.jpeg",
    "services/infrared-light": U / "03/AdobeStock_197122479-scaled.jpeg",
    "services/luxe-sand-foam": U / "03/Body-Treatment-1-scaled.jpg",
    "services/sand-foam": U / "03/AdobeStock_424955151-scaled.jpeg",
    # page heroes and features
    "hero/home": U / "03/AdobeStock_201170106-scaled.jpeg",
    "hero/massages": U / "03/AdobeStock_122243136-scaled.jpeg",
    "hero/body": U / "03/AdobeStock_445580485-scaled.jpeg",
    "hero/visit": U / "03/AdobeStock_393855516-scaled.jpeg",
    "hero/about": U / "03/AdobeStock_398526792-scaled.jpeg",
    "feature/couple": U / "03/AdobeStock_166174791-scaled.jpeg",
    "feature/oils": U / "03/AdobeStock_493753280-scaled.jpeg",
    # the spa itself (real interior photos, 500px originals)
    "space/tub": U / "03/15.png",
    "space/rooms": U / "03/16.png",
    "space/twin-tubs": U / "03/17.png",
    "space/lobby": U / "03/18.png",
    # gift card mockups
    "gift/card-stone": U / "03/14.png",
    "gift/card-teal": U / "03/15-1.png",
    "gift/card-desk": U / "03/16-1.png",
}

WIDTHS = (640, 1280, 1920)


def to_rgb(im: Image.Image, bg=(255, 255, 255)) -> Image.Image:
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        base = Image.new("RGB", im.size, bg)
        base.paste(im, mask=im.split()[-1])
        return base
    return im.convert("RGB")


def build_photos() -> None:
    for name, src in PHOTOS.items():
        im = to_rgb(Image.open(src))
        dest = OUT / f"{name}.webp"
        dest.parent.mkdir(parents=True, exist_ok=True)
        # never upscale: small originals only get the smallest variant
        widths = [w for w in WIDTHS if w <= im.width] or [WIDTHS[0]]
        for w in widths:
            copy = im.copy()
            if copy.width > w:
                copy.thumbnail((w, w * 4), Image.LANCZOS)
            copy.save(OUT / f"{name}-{w}.webp", "WEBP", quality=78, method=6)
        # unsuffixed default for plain <img src>: the 1280 variant, or the largest made
        shutil.copy(OUT / f"{name}-{max(w for w in widths if w <= 1280)}.webp", dest)
        print("photo", name, im.size, widths)


def trim(im: Image.Image) -> Image.Image:
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(bbox) if bbox else im


def build_brand() -> None:
    brand = OUT / "brand"
    brand.mkdir(parents=True, exist_ok=True)
    # highest-resolution copy of the wordmark on the site (816px of ink)
    black = trim(Image.open(U / "04/Med_spa__2_-removebg-preview_11zon.png").convert("RGBA"))
    white = Image.new("RGBA", black.size, (255, 255, 255, 255))
    white.putalpha(black.getchannel("A"))
    for im, n in ((black, "logo-dark"), (white, "logo-light")):
        im.save(brand / f"{n}.png", optimize=True)
        print("logo", n, im.size)

    # Favicon: the "c" of the wordmark on the brand sage, cut from the logo's
    # left edge (first column run of ink), so it matches the real lettering.
    alpha = black.getchannel("A")
    w, h = black.size
    # wordmark height = first fully transparent row below the ink, i.e. the gap
    # above the "SPA & MASSAGE" line
    rows = [any(alpha.getpixel((x, y)) > 40 for x in range(w)) for y in range(h)]
    top_h = next(y for y in range(int(h * 0.4), h) if not rows[y])
    cols = [any(alpha.getpixel((x, y)) > 40 for y in range(top_h)) for x in range(w)]
    start = cols.index(True)
    end = start
    while end < w and cols[end]:
        end += 1
    letter = trim(black.crop((start, 0, end, top_h)))
    sage = (157, 174, 160, 255)
    for size, n in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png"), (48, "favicon-48.png")):
        canvas = Image.new("RGBA", (size, size), sage)
        glyph = letter.copy()
        glyph.thumbnail((int(size * 0.58), int(size * 0.58)), Image.LANCZOS)
        # recolour glyph to white on sage
        white_glyph = Image.new("RGBA", glyph.size, (255, 255, 255, 255))
        white_glyph.putalpha(glyph.getchannel("A"))
        canvas.alpha_composite(white_glyph, ((size - glyph.width) // 2, (size - glyph.height) // 2))
        canvas.save(brand / n, optimize=True)
    Image.open(brand / "icon-512.png").save(OUT.parent / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("icons ok")


def build_video() -> None:
    vid = OUT / "video"
    vid.mkdir(parents=True, exist_ok=True)
    jobs = [
        (U / "03/Castle-Spa-Desktop.mp4", vid / "hero-desktop.mp4", "1280:-2"),
        (U / "03/Castle-spA-Mobile.mp4", vid / "hero-mobile.mp4", "720:-2"),
    ]
    for src, dest, scale in jobs:
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-vf", f"scale={scale}", "-c:v", "libx264",
             "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dest)],
            check=True,
        )
        print("video", dest.name, f"{dest.stat().st_size / 1e6:.1f} MB")
    poster = vid / "hero-poster.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1", "-i", str(jobs[0][1]), "-frames:v", "1", "-q:v", "4", str(poster)], check=True)
    to_rgb(Image.open(poster)).save(vid / "hero-poster.webp", "WEBP", quality=75)
    poster.unlink()


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_photos()
    build_brand()
    build_video()
