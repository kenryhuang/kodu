from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/terrain/atlas/road/road-ribbon-seamless.png"
WIDTH, HEIGHT = 256, 512
SOURCES = tuple(ROOT / "public/assets/terrain/atlas/road" / name for name in (
    "road-straight-horizontal-wide.png", "road-rectangle-wide.png", "road-clearing-round-b.png",
))


def center_crop(image: Image.Image, fraction: float) -> Image.Image:
    w, h = image.size
    cw, ch = round(w * fraction), round(h * fraction)
    return image.crop(((w - cw) // 2, (h - ch) // 2, (w + cw) // 2, (h + ch) // 2))


def radial_mask(w: int, h: int, opacity: int) -> Image.Image:
    mask = Image.new("L", (w, h), 0)
    pixels = mask.load()
    for y in range(h):
        for x in range(w):
            d = math.hypot((x + .5) / w * 2 - 1, (y + .5) / h * 2 - 1)
            pixels[x, y] = round(opacity * max(0, min(1, (1 - d) / .48)))
    return mask.filter(ImageFilter.GaussianBlur(2))


def make_vertical_periodic(image: Image.Image, band: int) -> Image.Image:
    result = image.convert("RGBA")
    pixels = result.load()
    for offset in range(band):
        strength = 1 - offset / band
        top, bottom = offset, HEIGHT - 1 - offset
        for x in range(WIDTH):
            a, b = pixels[x, top], pixels[x, bottom]
            average = tuple((a[c] + b[c]) // 2 for c in range(4))
            pixels[x, top] = tuple(round(a[c] * (1 - strength) + average[c] * strength) for c in range(4))
            pixels[x, bottom] = tuple(round(b[c] * (1 - strength) + average[c] * strength) for c in range(4))
    return result


def main() -> None:
    rng = random.Random(260711)
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (178, 137, 79, 255))
    for index in range(72):
        patch = center_crop(Image.open(SOURCES[index % len(SOURCES)]).convert("RGBA"), .58)
        scale = rng.uniform(.8, 1.45)
        patch = patch.resize((round(patch.width * scale), round(patch.height * scale)), Image.Resampling.LANCZOS)
        patch = patch.rotate(rng.choice((0, 90, 180, 270)), resample=Image.Resampling.BICUBIC, expand=True)
        patch.putalpha(radial_mask(patch.width, patch.height, rng.randint(52, 88)))
        x, y = rng.randrange(-patch.width // 2, WIDTH), rng.randrange(HEIGHT)
        for offset_y in (-HEIGHT, 0, HEIGHT):
            canvas.alpha_composite(patch, (x, y - patch.height // 2 + offset_y))

    pixels = canvas.load()
    for y in range(HEIGHT):
        noise = math.sin(y * .071) * .012 + math.sin(y * .193 + 1.4) * .008
        for x in range(WIDTH):
            edge = min(x / (WIDTH - 1), 1 - x / (WIDTH - 1))
            t = max(0, min(1, (edge + noise) / .18))
            smooth = t * t * (3 - 2 * t)
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (r, g, b, round(a * smooth))

    canvas = make_vertical_periodic(canvas, 12)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT)
    print(f"wrote {OUTPUT.relative_to(ROOT)} {WIDTH}x{HEIGHT}")


if __name__ == "__main__":
    main()
