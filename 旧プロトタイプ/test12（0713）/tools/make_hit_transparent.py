#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "assets" / "temp" / "vfx" / "hit.gif"
FALLBACK_INPUT = ROOT / "assets" / "temp" / "vfx" / "hit.webp"
DEFAULT_OUTPUT = ROOT / "assets" / "temp" / "vfx" / "hit.webp"


def smoothstep(edge0: float, edge1: float, x: float) -> float:
    if edge0 == edge1:
        return 1.0 if x >= edge1 else 0.0
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def transparentize_frame(frame: Image.Image) -> Image.Image:
    src = frame.convert("RGBA")
    pixels = src.load()
    width, height = src.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue

            mx = max(r, g, b)
            mn = min(r, g, b)
            sat = (mx - mn) / mx if mx else 0.0

            # 黒背景を消しつつ、赤・橙・黄・白い爆発本体は残す。
            brightness_alpha = smoothstep(20.0, 145.0, float(mx))
            color_alpha = smoothstep(0.10, 0.34, sat) * smoothstep(28.0, 115.0, float(mx))
            alpha_ratio = max(brightness_alpha, color_alpha)

            if alpha_ratio <= 0.03:
                pixels[x, y] = (r, g, b, 0)
                continue

            new_a = int(round(a * alpha_ratio))
            if new_a < 10:
                pixels[x, y] = (r, g, b, 0)
                continue

            # 半透明の縁が黒く残らないよう、低アルファ部分は非乗算色へ軽く戻す。
            unmul = min(3.8, 255.0 / max(new_a, 1))
            if new_a < 210:
                nr = min(255, int(round(r * unmul)))
                ng = min(255, int(round(g * unmul)))
                nb = min(255, int(round(b * unmul)))
            else:
                nr, ng, nb = r, g, b
            pixels[x, y] = (nr, ng, nb, new_a)

    return src


def keep_animation_frames_distinct(frames: Iterable[Image.Image]) -> list[Image.Image]:
    kept: list[Image.Image] = []
    for idx, frame in enumerate(frames):
        out = frame.copy()
        # WebP encoders may merge visually identical frames. A near-invisible alpha
        # marker keeps frame count/durations stable without affecting the effect.
        out.putpixel((0, 0), (idx % 256, 0, 0, 1))
        kept.append(out)
    return kept


def source_frames(path: Path) -> tuple[list[Image.Image], list[int], int]:
    with Image.open(path) as im:
        loop = int(im.info.get("loop", 0))
        frames: list[Image.Image] = []
        durations: list[int] = []
        preserve_alpha = path.suffix.lower() == ".webp"
        for frame in ImageSequence.Iterator(im):
            frames.append(frame.copy().convert("RGBA") if preserve_alpha else transparentize_frame(frame.copy()))
            durations.append(int(frame.info.get("duration", im.info.get("duration", 60)) or 60))
    return keep_animation_frames_distinct(frames), durations, loop


def save_webp(frames: list[Image.Image], durations: list[int], loop: int, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=loop,
        lossless=True,
        exact=True,
        method=6,
    )


def verify_webp(path: Path, expected_frames: int, expected_size: tuple[int, int]) -> None:
    with Image.open(path) as im:
        actual_frames = getattr(im, "n_frames", 1)
        if actual_frames != expected_frames:
            raise RuntimeError(f"frame count mismatch: expected {expected_frames}, got {actual_frames}")
        if im.size != expected_size:
            raise RuntimeError(f"size mismatch: expected {expected_size}, got {im.size}")

        missing_alpha: list[int] = []
        alpha_ranges: list[tuple[int, int]] = []
        for idx, frame in enumerate(ImageSequence.Iterator(im)):
            rgba = frame.convert("RGBA")
            alpha = rgba.getchannel("A")
            amin, amax = alpha.getextrema()
            alpha_ranges.append((amin, amax))
            if amin == 255 and amax == 255:
                missing_alpha.append(idx)

        if missing_alpha:
            raise RuntimeError(f"frames without alpha variation: {missing_alpha}")

    print(f"verified: {path}")
    print(f"frames: {expected_frames}")
    print(f"size: {expected_size[0]}x{expected_size[1]}")
    print(f"alpha ranges: {alpha_ranges}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Make hit.gif background transparent and save animated WebP.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--speed", type=float, default=1.55, help="Duration multiplier. Larger values play slower.")
    args = parser.parse_args()

    input_path = args.input
    if not input_path.exists() and input_path == DEFAULT_INPUT and FALLBACK_INPUT.exists():
        input_path = FALLBACK_INPUT
    frames, durations, loop = source_frames(input_path)
    if not frames:
        raise RuntimeError(f"no frames found: {args.input}")
    size = frames[0].size
    durations = [max(20, int(round(duration * args.speed))) for duration in durations]
    loop = 1
    save_webp(frames, durations, loop, args.output)
    verify_webp(args.output, len(frames), size)
    print(f"durations: {durations}")
    print(f"loop: {loop}")


if __name__ == "__main__":
    main()
