from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/assets/textures/concept/grass.png"
OUTPUT = ROOT / "public/assets/terrain/atlas/grass/grass-seamless-blended.png"
SIZE = 512
SEED = 250711
GRASS_SOURCES = (
    ROOT / "public/assets/terrain/atlas/grass/grass-flat.png",
    ROOT / "public/assets/terrain/atlas/grass/grass-flat-yellow.png",
)
FLOWER_SOURCES = (
    ROOT / "public/assets/terrain/atlas/grass/grass-flowers-red.png",
    ROOT / "public/assets/terrain/atlas/grass/grass-flat-white-flowers.png",
    ROOT / "public/assets/terrain/atlas/grass/grass-flat-yellow-flowers.png",
)


def center_crop(image: Image.Image, fraction: float) -> Image.Image:
    width, height = image.size
    crop_width = round(width * fraction)
    crop_height = round(height * fraction)
    left = (width - crop_width) // 2
    top = (height - crop_height) // 2
    return image.crop((left, top, left + crop_width, top + crop_height))


def feather_mask(width: int, height: int, opacity: float) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    pixels = mask.load()
    for y in range(height):
        ny = (y + 0.5) / height * 2 - 1
        for x in range(width):
            nx = (x + 0.5) / width * 2 - 1
            distance = math.sqrt(nx * nx + ny * ny)
            edge = max(0.0, min(1.0, (1.0 - distance) / 0.42))
            smooth = edge * edge * (3.0 - 2.0 * edge)
            pixels[x, y] = round(255 * opacity * smooth)
    return mask


def make_periodic(image: Image.Image, band: int) -> Image.Image:
    result = image.convert("RGBA")
    pixels = result.load()
    width, height = result.size
    for offset in range(band):
        strength = 1.0 - offset / band
        left_x = offset
        right_x = width - 1 - offset
        for y in range(height):
            left = pixels[left_x, y]
            right = pixels[right_x, y]
            average = tuple((left[channel] + right[channel]) // 2 for channel in range(4))
            pixels[left_x, y] = tuple(
                round(left[channel] * (1 - strength) + average[channel] * strength)
                for channel in range(4)
            )
            pixels[right_x, y] = tuple(
                round(right[channel] * (1 - strength) + average[channel] * strength)
                for channel in range(4)
            )
    for offset in range(band):
        strength = 1.0 - offset / band
        top_y = offset
        bottom_y = height - 1 - offset
        for x in range(width):
            top = pixels[x, top_y]
            bottom = pixels[x, bottom_y]
            average = tuple((top[channel] + bottom[channel]) // 2 for channel in range(4))
            pixels[x, top_y] = tuple(
                round(top[channel] * (1 - strength) + average[channel] * strength)
                for channel in range(4)
            )
            pixels[x, bottom_y] = tuple(
                round(bottom[channel] * (1 - strength) + average[channel] * strength)
                for channel in range(4)
            )
    return result


def place_wrapped(canvas: Image.Image, patch: Image.Image, center_x: int, center_y: int) -> None:
    left = center_x - patch.width // 2
    top = center_y - patch.height // 2
    for offset_x in (-SIZE, 0, SIZE):
        for offset_y in (-SIZE, 0, SIZE):
            canvas.alpha_composite(patch, (left + offset_x, top + offset_y))


def prepare_patch(
    path: Path,
    scale: float,
    opacity: float,
    angle: int,
    crop_fraction: float,
    saturation: float,
    contrast: float,
) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    patch = center_crop(source, crop_fraction)
    patch = ImageEnhance.Color(patch).enhance(saturation)
    patch = ImageEnhance.Contrast(patch).enhance(contrast)
    scaled_width = max(32, round(patch.width * scale))
    scaled_height = max(32, round(patch.height * scale))
    patch = patch.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
    feather = feather_mask(scaled_width, scaled_height, opacity)
    transparent_alpha = Image.new("L", (scaled_width, scaled_height), 0)
    patch.putalpha(Image.composite(patch.getchannel("A"), transparent_alpha, feather))
    return patch.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)


def main() -> None:
    rng = random.Random(SEED)
    base = Image.open(BASE).convert("RGBA").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    blended = make_periodic(base, 18)

    for index in range(34):
        patch = prepare_patch(
            GRASS_SOURCES[index % len(GRASS_SOURCES)],
            scale=rng.uniform(0.78, 1.2),
            opacity=rng.uniform(0.17, 0.24),
            angle=rng.choice((0, 90, 180, 270)),
            crop_fraction=0.62,
            saturation=0.78,
            contrast=0.9,
        )
        place_wrapped(blended, patch, rng.randrange(SIZE), rng.randrange(SIZE))

    for index in range(7):
        patch = prepare_patch(
            FLOWER_SOURCES[index % len(FLOWER_SOURCES)],
            scale=rng.uniform(0.9, 1.15),
            opacity=rng.uniform(0.42, 0.56),
            angle=rng.choice((0, 90, 180, 270)),
            crop_fraction=0.7,
            saturation=1.3,
            contrast=1.02,
        )
        place_wrapped(blended, patch, rng.randrange(SIZE), rng.randrange(SIZE))

    blended = make_periodic(blended, 12)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    blended.save(OUTPUT)
    print(f"wrote {OUTPUT.relative_to(ROOT)} {blended.width}x{blended.height}")


if __name__ == "__main__":
    main()
