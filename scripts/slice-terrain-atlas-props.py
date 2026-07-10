from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


SOURCE = Path("public/assets/terrain/0eb25ff3-a845-49d2-a37c-fd90ef46a85b.png")
OUTPUT_DIR = Path("public/assets/vegetation/atlas")

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


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    background = estimate_background(source)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, box in SPRITES:
        sprite = make_transparent(source.crop(box), background)
        output = OUTPUT_DIR / f"{name}.png"
        sprite.save(output)
        print(f"wrote {output} {sprite.size[0]}x{sprite.size[1]}")


if __name__ == "__main__":
    main()
