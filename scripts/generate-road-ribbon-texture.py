from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/terrain/atlas/road/road-ribbon-seamless.png"
WIDTH, HEIGHT = 256, 512
SOURCE = ROOT / "public/assets/terrain/atlas/road/road-straight-vertical-wide.png"
CROP_TOP, CROP_BOTTOM = 18, 79


def make_vertical_periodic(source: Image.Image) -> Image.Image:
    strip = source.crop((0, CROP_TOP, source.width, CROP_BOTTOM))
    periodic = Image.new("RGBA", (strip.width, strip.height * 2))
    periodic.alpha_composite(strip, (0, 0))
    periodic.alpha_composite(strip.transpose(Image.Transpose.FLIP_TOP_BOTTOM), (0, strip.height))
    return periodic


def resize_preserving_alpha(image: Image.Image) -> Image.Image:
    scaled = image.convert("RGBa").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).convert("RGBA")
    alpha = scaled.getchannel("A")
    sharpened = scaled.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=155, threshold=2))
    return Image.merge("RGBA", (*sharpened.split(), alpha))


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    canvas = resize_preserving_alpha(make_vertical_periodic(source))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT)
    print(f"wrote {OUTPUT.relative_to(ROOT)} {WIDTH}x{HEIGHT}")


if __name__ == "__main__":
    main()
