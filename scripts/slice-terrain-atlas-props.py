from __future__ import annotations

from collections import deque
from math import ceil
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw


SOURCE = Path("public/assets/terrain/0eb25ff3-a845-49d2-a37c-fd90ef46a85b.png")
OUTPUT_DIR = Path("public/assets/vegetation/atlas")
TERRAIN_OUTPUT_DIR = Path("public/assets/terrain/atlas")
PREVIEW_OUTPUT = Path("output/terrain-atlas-tiles-preview.png")

SPRITES = [
    ("tree-round-small", (7, 957, 105, 1073)),
    ("tree-pine-small", (111, 941, 210, 1077)),
    ("tree-pine-tall", (211, 919, 329, 1085)),
    ("tree-canopy-small", (324, 920, 456, 1085)),
    ("tree-canopy-medium", (442, 913, 593, 1087)),
    ("tree-oak-large", (589, 896, 773, 1092)),
    ("tree-pine-large", (763, 908, 896, 1092)),
    ("tree-round-medium", (879, 917, 1011, 1087)),
    ("tree-fruit", (996, 927, 1131, 1086)),
    ("tree-yellow", (1104, 924, 1248, 1088)),
    ("wood-stump", (3, 1073, 110, 1170)),
    ("wood-hollow-stump", (107, 1074, 211, 1170)),
    ("wood-log", (210, 1075, 335, 1177)),
    ("bush-green", (327, 1074, 457, 1179)),
    ("bush-white-flowers", (453, 1077, 583, 1182)),
    ("bush-red-flowers", (580, 1086, 704, 1182)),
    ("plant-spiky", (700, 1084, 804, 1178)),
    ("plant-leafy", (800, 1084, 906, 1178)),
    ("flower-daisy-white", (10, 1171, 90, 1248)),
    ("flower-yellow", (90, 1171, 164, 1246)),
    ("flower-red", (159, 1175, 233, 1247)),
    ("flower-pink", (237, 1176, 310, 1247)),
    ("flower-lavender", (312, 1165, 382, 1247)),
    ("flower-blue", (381, 1174, 450, 1245)),
    ("flower-yellow-small", (452, 1169, 526, 1246)),
    ("flower-clover-a", (535, 1177, 606, 1240)),
    ("flower-clover-b", (610, 1181, 680, 1239)),
    ("flower-clover-c", (683, 1180, 756, 1241)),
    ("flower-lily-pad", (755, 1175, 912, 1248)),
    ("plant-reeds", (916, 1159, 999, 1249)),
    ("rock-cluster-large", (899, 1078, 1009, 1173)),
    ("rock-cluster-tall", (994, 1066, 1105, 1169)),
    ("rock-scatter", (1133, 1088, 1214, 1171)),
    ("rock-small-a", (1098, 1127, 1142, 1167)),
    ("rock-small-b", (1200, 1124, 1244, 1164)),
    ("rock-moss-flat", (1109, 1161, 1240, 1246)),
    ("rock-moss-low", (995, 1167, 1117, 1250)),
]

TERRAIN_TILES = [
    ("grass", "grass-flat", (18, 13, 146, 130)),
    ("grass", "grass-flat-yellow", (146, 13, 273, 130)),
    ("grass", "grass-flat-yellow-flowers", (273, 13, 390, 130)),
    ("grass", "grass-flat-white-flowers", (390, 13, 510, 130)),
    ("grass", "grass-cliff-block-wide", (510, 13, 626, 130)),
    ("grass", "grass-cliff-block-small", (626, 13, 733, 130)),
    ("grass", "grass-cliff-block-medium-a", (733, 13, 846, 130)),
    ("grass", "grass-cliff-block-medium-b", (846, 13, 960, 130)),
    ("grass", "grass-cliff-block-narrow-a", (960, 13, 1048, 130)),
    ("grass", "grass-cliff-block-narrow-b", (1048, 13, 1146, 130)),
    ("grass", "grass-cliff-corner-large", (1146, 13, 1250, 130)),
    ("grass", "grass-cliff-edge-narrow-a", (14, 126, 101, 237)),
    ("grass", "grass-cliff-edge-medium-a", (101, 126, 202, 237)),
    ("grass", "grass-cliff-corner-small-a", (202, 126, 291, 237)),
    ("grass", "grass-cliff-corner-small-b", (291, 126, 393, 237)),
    ("grass", "grass-cliff-edge-wide-a", (393, 126, 509, 237)),
    ("grass", "grass-cliff-corner-wide-a", (509, 126, 625, 237)),
    ("grass", "grass-cliff-edge-medium-b", (625, 126, 731, 237)),
    ("grass", "grass-cliff-corner-wide-b", (731, 126, 843, 237)),
    ("grass", "grass-cliff-edge-wide-b", (843, 126, 956, 237)),
    ("grass", "grass-cliff-edge-narrow-b", (956, 126, 1051, 237)),
    ("grass", "grass-cliff-edge-medium-c", (1051, 126, 1145, 237)),
    ("grass", "grass-cliff-block-medium-c", (1145, 126, 1250, 237)),
    ("grass", "grass-dirt-patch-a", (13, 236, 126, 343)),
    ("grass", "grass-dirt-patch-b", (126, 236, 233, 343)),
    ("grass", "grass-flowers-red", (233, 236, 340, 343)),
    ("grass", "grass-flowers-white-a", (340, 236, 452, 343)),
    ("grass", "grass-flowers-white-b", (452, 236, 560, 343)),
    ("grass", "grass-dirt-stones-a", (560, 236, 670, 343)),
    ("grass", "grass-dirt-circle", (670, 236, 778, 343)),
    ("grass", "grass-dirt-stones-b", (778, 236, 880, 343)),
    ("grass", "grass-rocks-small", (880, 236, 983, 343)),
    ("grass", "grass-rocks-large", (983, 236, 1087, 343)),
    ("grass", "grass-flowers-white-c", (1087, 236, 1168, 343)),
    ("grass", "grass-flowers-yellow", (1168, 236, 1250, 343)),
    ("road", "road-straight-vertical-wide", (12, 345, 104, 453)),
    ("road", "road-square-small", (104, 345, 192, 453)),
    ("road", "road-straight-horizontal-wide", (192, 345, 331, 453)),
    ("road", "road-vertical-a", (331, 345, 427, 453)),
    ("road", "road-vertical-b", (427, 345, 532, 453)),
    ("road", "road-rectangle-wide", (532, 345, 642, 453)),
    ("road", "road-vertical-narrow-a", (642, 345, 735, 453)),
    ("road", "road-corner-east", (735, 345, 856, 453)),
    ("road", "road-corner-west", (856, 345, 992, 453)),
    ("road", "road-vertical-narrow-b", (992, 345, 1074, 453)),
    ("road", "road-end-round", (1074, 345, 1175, 453)),
    ("road", "road-vertical-narrow-c", (1175, 345, 1250, 453)),
    ("road", "road-t-junction-a", (12, 453, 141, 565)),
    ("road", "road-t-junction-b", (141, 453, 274, 565)),
    ("road", "road-t-junction-wide-a", (274, 453, 440, 565)),
    ("road", "road-t-junction-c", (440, 453, 584, 565)),
    ("road", "road-t-junction-wide-b", (584, 453, 765, 565)),
    ("road", "road-clearing-round-a", (765, 453, 909, 565)),
    ("road", "road-clearing-round-b", (909, 453, 1054, 565)),
    ("road", "road-rectangle-small", (1054, 453, 1157, 565)),
    ("road", "road-corner-large", (1157, 453, 1250, 565)),
    ("water", "water-river-vertical-tall", (12, 562, 120, 802)),
    ("water", "water-river-straight-wide", (123, 562, 250, 685)),
    ("water", "water-river-inlets", (252, 562, 385, 685)),
    ("water", "water-river-corner-a", (388, 562, 512, 685)),
    ("water", "water-river-corner-wide", (514, 562, 660, 685)),
    ("water", "water-river-corner-small-a", (661, 562, 757, 685)),
    ("water", "water-river-corner-b", (760, 562, 872, 685)),
    ("water", "water-river-corner-small-b", (873, 562, 966, 685)),
    ("water", "waterfall-pool-small", (968, 562, 1064, 685)),
    ("water", "water-pond-large", (1065, 562, 1250, 773)),
    ("water", "water-river-junction-a", (124, 681, 250, 802)),
    ("water", "water-river-junction-b", (252, 681, 374, 802)),
    ("water", "water-river-u-bend-a", (385, 681, 509, 802)),
    ("water", "water-river-u-bend-b", (510, 681, 634, 802)),
    ("water", "water-river-t-waterfall", (635, 681, 774, 880)),
    ("water", "water-pond-small", (773, 681, 871, 773)),
    ("water", "waterfall-small", (872, 681, 966, 773)),
    ("water", "water-river-straight-narrow", (967, 681, 1064, 773)),
    ("water", "water-shoreline-a", (10, 801, 122, 917)),
    ("water", "water-shoreline-b", (123, 801, 249, 917)),
    ("water", "water-shoreline-c", (250, 801, 374, 917)),
    ("water", "water-shoreline-d", (375, 801, 505, 917)),
    ("water", "water-shoreline-e", (506, 801, 635, 917)),
    ("water", "water-bridge", (773, 770, 902, 917)),
    ("water", "water-river-pool-wide", (903, 770, 1064, 917)),
    ("water", "waterfall-wide", (1065, 770, 1158, 917)),
    ("water", "waterfall-narrow", (1159, 770, 1250, 917)),
]


def distance_squared(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return sum((a[index] - b[index]) ** 2 for index in range(3))


def estimate_background(image: Image.Image) -> tuple[int, int, int]:
    width, height = image.size
    samples: list[tuple[int, int, int]] = []
    pixels = image.load()
    for x in [*range(0, 40), *range(width - 40, width)]:
        for y in [*range(0, 40), *range(height - 40, height)]:
            samples.append(pixels[x, y])
    return tuple(sum(pixel[channel] for pixel in samples) // len(samples) for channel in range(3))


def make_transparent(crop: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    rgba = crop.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    threshold = 50 * 50
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _alpha = pixels[x, y]
        if red > 218 and green > 214 and blue > 196 and abs(red - green) < 22 and abs(green - blue) < 36:
            return True
        return distance_squared((red, green, blue), background) <= threshold

    for x in range(width):
        for y in (0, height - 1):
            if is_background(x, y):
                visited.add((x, y))
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if is_background(x, y):
                visited.add((x, y))
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        red, green, blue, _alpha = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        for next_x, next_y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if next_x < 0 or next_y < 0 or next_x >= width or next_y >= height:
                continue
            if (next_x, next_y) in visited or not is_background(next_x, next_y):
                continue
            visited.add((next_x, next_y))
            queue.append((next_x, next_y))

    soft_threshold = 18 * 18
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 0 and distance_squared((red, green, blue), background) <= soft_threshold:
                pixels[x, y] = (red, green, blue, 0)

    return remove_tiny_alpha_components(rgba)


def remove_tiny_alpha_components(image: Image.Image) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in visited or pixels[x, y][3] == 0:
                continue
            component: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited.add((x, y))
            while queue:
                current_x, current_y = queue.popleft()
                component.append((current_x, current_y))
                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if next_x < 0 or next_y < 0 or next_x >= width or next_y >= height:
                        continue
                    if (next_x, next_y) in visited or pixels[next_x, next_y][3] == 0:
                        continue
                    visited.add((next_x, next_y))
                    queue.append((next_x, next_y))
            components.append(component)

    for component in components:
        if len(component) >= 12:
            continue
        for x, y in component:
            red, green, blue, _alpha = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)

    crop_box = image.getbbox()
    if crop_box:
        return image.crop(crop_box)

    return image


def make_checkerboard(width: int, height: int, cell_size: int = 12) -> Image.Image:
    surface = Image.new("RGBA", (width, height), (245, 245, 242, 255))
    draw = ImageDraw.Draw(surface)
    colors = ((232, 232, 228, 255), (250, 250, 247, 255))
    for y in range(0, height, cell_size):
        for x in range(0, width, cell_size):
            color = colors[((x // cell_size) + (y // cell_size)) % 2]
            draw.rectangle((x, y, x + cell_size - 1, y + cell_size - 1), fill=color)
    return surface


def create_contact_sheet() -> None:
    columns = 6
    cell_width = 200
    cell_height = 190
    image_width = 180
    image_height = 145
    margin = 18
    heading_height = 38
    section_gap = 18
    categories = ("grass", "road", "water")
    grouped = {
        category: [(name, TERRAIN_OUTPUT_DIR / category / f"{name}.png")
                   for tile_category, name, _box in TERRAIN_TILES if tile_category == category]
        for category in categories
    }
    sheet_height = margin + sum(
        heading_height + ceil(len(grouped[category]) / columns) * cell_height + section_gap
        for category in categories
    )
    sheet_width = margin * 2 + columns * cell_width
    sheet = Image.new("RGBA", (sheet_width, sheet_height), (250, 249, 245, 255))
    draw = ImageDraw.Draw(sheet)
    cursor_y = margin

    for category in categories:
        draw.text((margin, cursor_y + 8), f"{category.upper()} ({len(grouped[category])})", fill=(44, 58, 48, 255))
        cursor_y += heading_height
        for index, (name, path) in enumerate(grouped[category]):
            column = index % columns
            row = index // columns
            cell_x = margin + column * cell_width
            cell_y = cursor_y + row * cell_height
            checkerboard = make_checkerboard(image_width, image_height)
            asset = Image.open(path).convert("RGBA")
            asset.thumbnail((image_width - 12, image_height - 12), Image.Resampling.LANCZOS)
            asset_x = (image_width - asset.width) // 2
            asset_y = (image_height - asset.height) // 2
            checkerboard.alpha_composite(asset, (asset_x, asset_y))
            sheet.alpha_composite(checkerboard, (cell_x, cell_y))
            label_lines = wrap(name, width=27)[:2]
            draw.multiline_text((cell_x, cell_y + image_height + 5), "\n".join(label_lines), fill=(38, 43, 39, 255), spacing=1)
        cursor_y += ceil(len(grouped[category]) / columns) * cell_height + section_gap

    PREVIEW_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(PREVIEW_OUTPUT)
    print(f"wrote {PREVIEW_OUTPUT} {sheet.width}x{sheet.height}")


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    background = estimate_background(source)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, box in SPRITES:
        sprite = make_transparent(source.crop(box), background)
        output = OUTPUT_DIR / f"{name}.png"
        sprite.save(output)
        print(f"wrote {output} {sprite.size[0]}x{sprite.size[1]}")

    for category, name, box in TERRAIN_TILES:
        sprite = make_transparent(source.crop(box), background)
        output_dir = TERRAIN_OUTPUT_DIR / category
        output_dir.mkdir(parents=True, exist_ok=True)
        output = output_dir / f"{name}.png"
        sprite.save(output)
        print(f"wrote {output} {sprite.size[0]}x{sprite.size[1]}")

    create_contact_sheet()


if __name__ == "__main__":
    main()
