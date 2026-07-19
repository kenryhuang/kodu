from __future__ import annotations

import math
import runpy
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps, ImageStat

from road_texture_manifest import (
    LEGACY_SIZES,
    RIBBON_NAME,
    RIBBON_NORMAL_NAME,
    RIBBON_SIZE,
    ROAD_TILES,
    SCALE,
)


ROOT = Path(__file__).resolve().parents[1]
ATLAS_CANDIDATES = (
    ROOT / "public/assets/terrain/terrain_samples.png",
    ROOT / "public/assets/terrain/0eb25ff3-a845-49d2-a37c-fd90ef46a85b.png",
)
ROAD_DIR = ROOT / "public/assets/terrain/atlas/road"
MATERIAL_DIR = ROOT / "scripts/assets/road-remaster"
OUTPUT_PREVIEW = ROOT / "output/road-remaster-contact-sheet.png"
RIBBON_CROP = (18, 79)
LEGACY_RIBBON_SIZE = tuple(value // SCALE for value in RIBBON_SIZE)


def atlas_source_path() -> Path:
    for candidate in ATLAS_CANDIDATES:
        if candidate.exists():
            return candidate
    candidates = ", ".join(str(path.relative_to(ROOT)) for path in ATLAS_CANDIDATES)
    raise FileNotFoundError(f"missing terrain atlas; expected one of: {candidates}")


def resize_rgba(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")


def tile_to_size(material: Image.Image, size: tuple[int, int], offset: tuple[int, int]) -> Image.Image:
    source = material.convert("RGB")
    tiled = Image.new("RGB", size)
    start_x = -(offset[0] % source.width)
    start_y = -(offset[1] % source.height)
    for y in range(start_y, size[1], source.height):
        for x in range(start_x, size[0], source.width):
            tiled.paste(source, (x, y))
    return tiled


def grass_mask(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    pixels = rgba.getdata()
    raw = Image.new("L", rgba.size)
    raw.putdata([
        255 if a > 0 and g > r * 0.92 and g > b * 1.08 else 0
        for r, g, b, a in pixels
    ])
    softened = raw.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(radius=3.2))
    return ImageChops.multiply(softened, alpha)


def fill_enclosed_alpha_holes(alpha: Image.Image, threshold: int = 250) -> Image.Image:
    width, height = alpha.size
    values = list(alpha.getdata())
    exterior = bytearray(width * height)
    queue: deque[int] = deque()

    def add(index: int) -> None:
        if values[index] < threshold and not exterior[index]:
            exterior[index] = 1
            queue.append(index)

    for x in range(width):
        add(x)
        add((height - 1) * width + x)
    for y in range(height):
        add(y * width)
        add(y * width + width - 1)

    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        if x > 0:
            add(index - 1)
        if x + 1 < width:
            add(index + 1)
        if y > 0:
            add(index - width)
        if y + 1 < height:
            add(index + width)

    repaired = Image.new("L", alpha.size)
    repaired.putdata([
        255 if value < threshold and not exterior[index] else value
        for index, value in enumerate(values)
    ])
    return repaired


def color_match(source: Image.Image, target: Image.Image, target_mask: Image.Image) -> Image.Image:
    source_rgb = source.convert("RGB")
    target_rgb = target.convert("RGB")
    source_stats = ImageStat.Stat(source_rgb)
    target_stats = ImageStat.Stat(target_rgb, target_mask)
    channels = []
    for channel, source_mean, source_std, target_mean, target_std in zip(
        source_rgb.split(),
        source_stats.mean,
        source_stats.stddev,
        target_stats.mean,
        target_stats.stddev,
    ):
        scale = min(1.35, max(0.55, target_std / max(source_std, 1.0)))
        lut = [max(0, min(255, round(target_mean + (value - source_mean) * scale))) for value in range(256)]
        channels.append(channel.point(lut))
    return Image.merge("RGB", tuple(channels))


def apply_material(
    base: Image.Image,
    material: Image.Image,
    mask: Image.Image,
    opacity: float,
) -> Image.Image:
    if mask.getbbox() is None:
        return base.convert("RGB")
    matched = color_match(material, base, mask)
    matched = ImageEnhance.Color(matched).enhance(0.78)
    mix_mask = mask.point(lambda value: round(value * opacity))
    return Image.composite(matched, base.convert("RGB"), mix_mask)


def remaster_tile(
    legacy: Image.Image,
    dirt_material: Image.Image,
    grass_material: Image.Image,
    seed: int,
) -> Image.Image:
    size = tuple(value * SCALE for value in legacy.size)
    scaled = resize_rgba(legacy, size)
    original_alpha = scaled.getchannel("A")
    alpha = fill_enclosed_alpha_holes(original_alpha)
    repair_mask = ImageChops.subtract(alpha, original_alpha).point(lambda value: 255 if value > 0 else 0)
    repair_mask = repair_mask.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(radius=4.0))
    dirt_tile = tile_to_size(dirt_material, size, (seed * 73, seed * 109))
    repair_color = color_match(dirt_tile, scaled, alpha)
    repaired_rgb = Image.composite(repair_color, scaled.convert("RGB"), repair_mask)
    scaled = Image.merge("RGBA", (*repaired_rgb.split(), alpha))
    scaled.putalpha(alpha)
    grass = grass_mask(scaled)
    dirt = ImageChops.multiply(alpha, ImageOps.invert(grass))
    grass_tile = tile_to_size(grass_material, size, (seed * 97, seed * 61))
    rgb = apply_material(scaled, dirt_tile, dirt, 0.72)
    rgb = apply_material(rgb, grass_tile, grass, 0.25)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.85, percent=118, threshold=3))
    return Image.merge("RGBA", (*rgb.split(), alpha))


def make_ribbon(
    straight: Image.Image,
    dirt_material: Image.Image,
    grass_material: Image.Image,
) -> Image.Image:
    top, bottom = RIBBON_CROP
    strip = straight.crop((0, top, straight.width, min(bottom, straight.height)))
    periodic = Image.new("RGBA", (strip.width, strip.height * 2))
    periodic.alpha_composite(strip, (0, 0))
    periodic.alpha_composite(strip.transpose(Image.Transpose.FLIP_TOP_BOTTOM), (0, strip.height))
    legacy_ribbon = resize_rgba(periodic, LEGACY_RIBBON_SIZE)
    ribbon = remaster_tile(legacy_ribbon, dirt_material, grass_material, len(ROAD_TILES) + 1)
    first_row = ribbon.crop((0, 0, ribbon.width, 1))
    ribbon.paste(first_row, (0, ribbon.height - 1))
    return ribbon


def make_normal_map(diffuse: Image.Image, strength: float = 2.4) -> Image.Image:
    rgba = diffuse.convert("RGBA")
    luminance = rgba.convert("L")
    low = luminance.filter(ImageFilter.GaussianBlur(radius=4.0))
    detail = ImageEnhance.Contrast(luminance).enhance(1.8)
    height = Image.blend(low, detail, 0.72)
    alpha = rgba.getchannel("A")
    width, image_height = rgba.size
    heights = list(height.getdata())
    alphas = list(alpha.getdata())
    pixels: list[tuple[int, int, int]] = []

    def sample(x: int, y: int) -> int:
        wrapped_y = y % image_height
        clamped_x = max(0, min(width - 1, x))
        return heights[wrapped_y * width + clamped_x]

    for y in range(image_height):
        for x in range(width):
            index = y * width + x
            if alphas[index] < 16:
                pixels.append((128, 128, 255))
                continue
            dx = (sample(x - 1, y) - sample(x + 1, y)) / 255 * strength
            dy = (sample(x, y - 1) - sample(x, y + 1)) / 255 * strength
            length = math.sqrt(dx * dx + dy * dy + 1)
            pixels.append((
                round((dx / length * 0.5 + 0.5) * 255),
                round((dy / length * 0.5 + 0.5) * 255),
                round((1 / length * 0.5 + 0.5) * 255),
            ))

    normal = Image.new("RGB", rgba.size)
    normal.putdata(pixels)
    normal.paste(normal.crop((0, 0, width, 1)), (0, image_height - 1))
    return normal


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    image = Image.new("RGBA", size, (245, 245, 242, 255))
    draw = ImageDraw.Draw(image)
    colors = ((230, 230, 226, 255), (250, 250, 247, 255))
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=colors[(x // cell + y // cell) % 2])
    return image


def make_contact_sheet(paths: list[Path]) -> None:
    columns, cell_width, cell_height = 5, 250, 230
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * cell_width, rows * cell_height), (250, 249, 245, 255))
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(paths):
        x = (index % columns) * cell_width
        y = (index // columns) * cell_height
        surface = checkerboard((230, 190))
        with Image.open(path) as source:
            asset = source.convert("RGBA")
        asset.thumbnail((216, 176), Image.Resampling.LANCZOS)
        surface.alpha_composite(asset, ((230 - asset.width) // 2, (190 - asset.height) // 2))
        sheet.alpha_composite(surface, (x + 10, y + 8))
        draw.text((x + 10, y + 202), path.stem, fill=(44, 49, 43, 255))
    OUTPUT_PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUTPUT_PREVIEW, quality=95)


def main() -> None:
    atlas_tools = runpy.run_path(str(ROOT / "scripts/slice-terrain-atlas-props.py"))
    estimate_background = atlas_tools["estimate_background"]
    make_transparent = atlas_tools["make_transparent"]
    with Image.open(atlas_source_path()) as source_image:
        source = source_image.convert("RGB")
    background = estimate_background(source)
    with Image.open(MATERIAL_DIR / "dirt-material.png") as image:
        dirt_material = image.convert("RGB")
    with Image.open(MATERIAL_DIR / "grass-material.png") as image:
        grass_material = image.convert("RGB")

    ROAD_DIR.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    straight: Image.Image | None = None
    for seed, (name, box) in enumerate(ROAD_TILES):
        legacy = make_transparent(source.crop(box), background)
        if legacy.size != LEGACY_SIZES[name]:
            raise ValueError(f"{name}: expected {LEGACY_SIZES[name]}, got {legacy.size}")
        remastered = remaster_tile(legacy, dirt_material, grass_material, seed)
        output = ROAD_DIR / f"{name}.png"
        remastered.save(output, optimize=True)
        outputs.append(output)
        if name == "road-straight-vertical-wide":
            straight = legacy
        print(f"wrote {output.relative_to(ROOT)} {remastered.width}x{remastered.height}")

    if straight is None:
        raise RuntimeError("road-straight-vertical-wide was not generated")
    ribbon = make_ribbon(straight, dirt_material, grass_material)
    ribbon_output = ROAD_DIR / f"{RIBBON_NAME}.png"
    ribbon.save(ribbon_output, optimize=True)
    outputs.insert(0, ribbon_output)
    print(f"wrote {ribbon_output.relative_to(ROOT)} {ribbon.width}x{ribbon.height}")
    normal_output = ROAD_DIR / f"{RIBBON_NORMAL_NAME}.png"
    make_normal_map(ribbon).save(normal_output, optimize=True)
    print(f"wrote {normal_output.relative_to(ROOT)} {ribbon.width}x{ribbon.height}")
    make_contact_sheet(outputs)
    print(f"wrote {OUTPUT_PREVIEW.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
