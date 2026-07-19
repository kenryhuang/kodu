from __future__ import annotations

import unittest
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat

from scripts.road_texture_manifest import (
    LEGACY_SIZES,
    RIBBON_NAME,
    RIBBON_NORMAL_NAME,
    RIBBON_SIZE,
    SCALE,
)


ROOT = Path(__file__).resolve().parents[1]
ROAD_DIR = ROOT / "public/assets/terrain/atlas/road"
MATERIAL_DIR = ROOT / "scripts/assets/road-remaster"


class RoadTextureContractTest(unittest.TestCase):
    @staticmethod
    def screen_scale_detail(image: Image.Image, width: int = 256) -> float:
        resized = image.convert("RGB").resize(
            (width, round(image.height * width / image.width)),
            Image.Resampling.LANCZOS,
        ).convert("L")
        high_frequency = ImageChops.difference(resized, resized.filter(ImageFilter.GaussianBlur(1.0)))
        return ImageStat.Stat(high_frequency).mean[0]

    def test_all_outputs_are_rgba_and_four_times_legacy_size(self) -> None:
        for name, legacy_size in LEGACY_SIZES.items():
            with self.subTest(asset=name):
                with Image.open(ROAD_DIR / f"{name}.png") as image:
                    self.assertEqual(image.mode, "RGBA")
                    self.assertEqual(image.size, tuple(value * SCALE for value in legacy_size))

        with Image.open(ROAD_DIR / f"{RIBBON_NAME}.png") as ribbon:
            self.assertEqual(ribbon.mode, "RGBA")
            self.assertEqual(ribbon.size, RIBBON_SIZE)

    def test_every_output_keeps_transparent_and_visible_pixels(self) -> None:
        expected_names = {*LEGACY_SIZES, RIBBON_NAME}
        actual_names = {
            path.stem
            for path in ROAD_DIR.glob("*.png")
            if path.stem != RIBBON_NORMAL_NAME
        }
        self.assertEqual(actual_names, expected_names)

        for name in sorted(expected_names):
            with self.subTest(asset=name):
                with Image.open(ROAD_DIR / f"{name}.png") as image:
                    alpha = image.convert("RGBA").getchannel("A")
                self.assertEqual(alpha.getextrema(), (0, 255))

    def test_ribbon_top_and_bottom_rows_match(self) -> None:
        ribbon = Image.open(ROAD_DIR / f"{RIBBON_NAME}.png").convert("RGBA")
        top = list(ribbon.crop((0, 0, ribbon.width, 1)).getdata())
        bottom = list(ribbon.crop((0, ribbon.height - 1, ribbon.width, ribbon.height)).getdata())
        difference = sum(
            abs(top_pixel[channel] - bottom_pixel[channel])
            for top_pixel, bottom_pixel in zip(top, bottom)
            for channel in range(4)
        ) / (ribbon.width * 4)
        self.assertLessEqual(difference, 2.0)

    def test_ribbon_normal_map_contract(self) -> None:
        with Image.open(ROAD_DIR / f"{RIBBON_NORMAL_NAME}.png") as normal:
            self.assertEqual(normal.mode, "RGB")
            self.assertEqual(normal.size, RIBBON_SIZE)
            red, green, blue = normal.split()
            self.assertGreater(red.getextrema()[1] - red.getextrema()[0], 16)
            self.assertGreater(green.getextrema()[1] - green.getextrema()[0], 16)
            self.assertGreaterEqual(blue.getextrema()[0], 128)

    def test_ribbon_normal_map_is_vertically_seamless(self) -> None:
        normal = Image.open(ROAD_DIR / f"{RIBBON_NORMAL_NAME}.png").convert("RGB")
        self.assertEqual(
            list(normal.crop((0, 0, normal.width, 1)).getdata()),
            list(normal.crop((0, normal.height - 1, normal.width, normal.height)).getdata()),
        )

    def test_ribbon_has_native_resolution_detail(self) -> None:
        ribbon = Image.open(ROAD_DIR / f"{RIBBON_NAME}.png").convert("RGBA")
        luminance = ribbon.convert("L")
        opaque = ribbon.getchannel("A").point(lambda value: 255 if value >= 220 else 0)
        opaque = opaque.filter(ImageFilter.MinFilter(3))
        horizontal = ImageChops.difference(luminance, ImageChops.offset(luminance, 1, 0))
        vertical = ImageChops.difference(luminance, ImageChops.offset(luminance, 0, 1))
        detail = (ImageStat.Stat(horizontal, opaque).mean[0] + ImageStat.Stat(vertical, opaque).mean[0]) / 2
        self.assertGreaterEqual(detail, 1.5)

    def test_ribbon_preserves_screen_scale_source_detail(self) -> None:
        ribbon = Image.open(ROAD_DIR / f"{RIBBON_NAME}.png").convert("RGB")
        road_center = ribbon.crop((170, 0, ribbon.width - 170, ribbon.height))
        dirt_source = Image.open(MATERIAL_DIR / "dirt-material.png").convert("RGB")
        preserved_ratio = self.screen_scale_detail(road_center) / self.screen_scale_detail(dirt_source)
        self.assertGreaterEqual(preserved_ratio, 0.75)

    def test_outputs_have_no_enclosed_transparent_holes(self) -> None:
        for path in sorted(ROAD_DIR.glob("*.png")):
            with self.subTest(asset=path.name):
                alpha = Image.open(path).convert("RGBA").getchannel("A")
                width, height = alpha.size
                pixels = alpha.load()
                exterior: set[tuple[int, int]] = set()
                queue: deque[tuple[int, int]] = deque()
                for x in range(width):
                    for point in ((x, 0), (x, height - 1)):
                        if pixels[point] < 250 and point not in exterior:
                            exterior.add(point)
                            queue.append(point)
                for y in range(height):
                    for point in ((0, y), (width - 1, y)):
                        if pixels[point] < 250 and point not in exterior:
                            exterior.add(point)
                            queue.append(point)
                while queue:
                    x, y = queue.popleft()
                    for point in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        next_x, next_y = point
                        if not (0 <= next_x < width and 0 <= next_y < height):
                            continue
                        if pixels[point] < 250 and point not in exterior:
                            exterior.add(point)
                            queue.append(point)
                enclosed = sum(
                    pixels[x, y] < 16 and (x, y) not in exterior
                    for y in range(height)
                    for x in range(width)
                )
                self.assertEqual(enclosed, 0)

    def test_outputs_have_no_opaque_black_hole_pixels(self) -> None:
        for path in sorted(ROAD_DIR.glob("*.png")):
            with self.subTest(asset=path.name):
                image = Image.open(path).convert("RGBA")
                black_pixels = sum(
                    alpha >= 220 and max(red, green, blue) < 24
                    for red, green, blue, alpha in image.getdata()
                )
                self.assertEqual(black_pixels, 0)


if __name__ == "__main__":
    unittest.main()
