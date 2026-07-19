from __future__ import annotations

import unittest
from pathlib import Path

from PIL import Image

from scripts.road_texture_manifest import LEGACY_SIZES, RIBBON_NAME, RIBBON_SIZE, SCALE


ROOT = Path(__file__).resolve().parents[1]
ROAD_DIR = ROOT / "public/assets/terrain/atlas/road"


class RoadTextureContractTest(unittest.TestCase):
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
        actual_names = {path.stem for path in ROAD_DIR.glob("*.png")}
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


if __name__ == "__main__":
    unittest.main()
