#!/usr/bin/env python3
"""appearance.webp の本体フレームを横一列のスプライトシートへ変換する。"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/vfx/appearance.webp"
TARGET = ROOT / "assets/vfx/appearance_sheet.webp"
FRAME_START = 1  # 0 始まり。元素材の 2 コマ目（待機後の本体）
FRAME_COUNT = 34


def main():
    with Image.open(SOURCE) as source:
        width, height = source.size
        frames = []
        for index in range(FRAME_START, FRAME_START + FRAME_COUNT):
            source.seek(index)
            # seek 後の convert は WebP の部分フレームを合成済みの全体へ展開する。
            frames.append(source.convert("RGBA").copy())

    sheet = Image.new("RGBA", (width * FRAME_COUNT, height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        if frame.size != (width, height):
            raise ValueError(f"frame {index} has unexpected size: {frame.size}")
        sheet.alpha_composite(frame, (index * width, 0))

    sheet.save(TARGET, format="WEBP", quality=90, method=6)
    print(f"generated: {TARGET}")
    print(f"frames: {FRAME_COUNT}")
    print(f"frame_size: {width}x{height}")
    print(f"sheet_size: {sheet.width}x{sheet.height}")
    print(f"file_bytes: {TARGET.stat().st_size}")


if __name__ == "__main__":
    main()
