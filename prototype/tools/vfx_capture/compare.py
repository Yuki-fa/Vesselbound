#!/usr/bin/env python3
"""固定時刻のPNG連結、前後比較、効果別・コマ別の画素差。"""
import argparse
import csv
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, PngImagePlugin


# 0〜255のRGBで測定する。目視判定を自動的にVISUAL_OKへ変えない。
DEFAULT_MAE = 0.25
DEFAULT_LOCAL_MAE = 1.0
DEFAULT_SSIM = 0.9999
LOCAL_TILE = 32
SSIM_TILE = 8


def strip(output, times, files):
    if len(times) != len(files) or not files:
        raise ValueError("時刻と撮影コマの数が一致しません")
    images = [Image.open(f).convert("RGB") for f in files]
    if len({im.size for im in images}) != 1:
        raise ValueError("撮影コマの大きさが一致しません")
    w, h = images[0].size
    result = Image.new("RGB", (w * len(images), h + 24), "#101713")
    draw = ImageDraw.Draw(result)
    for i, (im, t) in enumerate(zip(images, times)):
        result.paste(im, (i * w, 24))
        draw.text((i * w + 8, 6), f"{t:.1f} ms", fill="white")
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("vfx_capture", json.dumps({"times": times, "frameWidth": w, "frameHeight": h, "headerHeight": 24}))
    result.save(output, pnginfo=metadata)


def capture(path):
    file = path / "capture.json"
    if not file.exists():
        return None
    data = json.loads(file.read_text())
    if data.get("status") != "captured":
        raise ValueError(f"{file}: 撮影が完了していません")
    effects = data.get("effects", [])
    if len({d["name"] for d in effects}) != len(effects):
        raise ValueError(f"{file}: 効果が重複しています")
    return data


def layout(image, report, name):
    if report is not None:
        match = [d for d in report["effects"] if d["file"] == name]
        if len(match) != 1:
            raise ValueError(f"{name}: capture.jsonに一意の撮影記録がありません")
        times = match[0]["times"]
        header = 24
    elif image.info.get("vfx_capture"):
        meta = json.loads(image.info["vfx_capture"])
        times, header = meta["times"], meta["headerHeight"]
    else:
        raise ValueError(f"{name}: コマ別指標にはcapture.jsonかPNG撮影情報が必要です")
    if not times or image.width % len(times) or image.height <= header:
        raise ValueError(f"{name}: コマ数・画像寸法が不正です")
    return times, header, image.width // len(times), image.height - header


def validate_reports(a, b):
    if (a is None) != (b is None):
        raise ValueError("前後でcapture.jsonの有無が一致しません")
    if a is None:
        return
    for key in ("seed", "speed", "value", "frames"):
        if a[key] != b[key]:
            raise ValueError(f"撮影条件が一致しません: {key}={a[key]} / {b[key]}")
    old = {d["name"]: d for d in a["effects"]}
    new = {d["name"]: d for d in b["effects"]}
    if old.keys() != new.keys():
        raise ValueError("撮影記録の効果一覧が一致しません")
    for name in old:
        for key in ("source", "targets", "durationMs", "impactMs", "times", "file"):
            if old[name][key] != new[name][key]:
                # 浮動小数の演算順による誤差だけは1ns未満を許す。
                x, y = old[name][key], new[name][key]
                if key in ("durationMs", "impactMs", "times") and np.shape(x) == np.shape(y) and np.allclose(x, y, rtol=0, atol=1e-6):
                    continue
                raise ValueError(f"{name}: 撮影記録が一致しません: {key}={x} / {y}")


def metrics(a, b):
    """同じ大きさのRGBコマ。ラベルの24pxは呼び出し側で除く。"""
    av, bv = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    diff = np.abs(av - bv)
    h, w, _ = diff.shape
    if not np.any(diff):
        return {"mae": 0.0, "rmse": 0.0, "max_channel_diff": 0, "max_local_mae": 0.0,
                "local_x": 0, "local_y": 0, "ssim": 1.0, "changed_pixels": 0, "changed_ratio": 0.0}
    def block_sum(values, tile):
        ny, nx = (h+tile-1)//tile, (w+tile-1)//tile
        padded = np.pad(values, ((0, ny*tile-h), (0, nx*tile-w)))
        return padded.reshape(ny, tile, nx, tile).sum(axis=(1, 3))
    local_counts = block_sum(np.ones((h, w)), LOCAL_TILE)
    local = block_sum(diff.mean(axis=2), LOCAL_TILE) / local_counts
    local_y, local_x = np.unravel_index(local.argmax(), local.shape)
    max_local = float(local[local_y, local_x])
    # 8×8の非重複窓で輝度SSIM（母分散）。端の小窓も画素数で重み付けする。
    weights = np.array([0.2126, 0.7152, 0.0722])
    al, bl = av @ weights, bv @ weights
    counts = block_sum(np.ones((h, w)), SSIM_TILE)
    ma, mb = block_sum(al, SSIM_TILE)/counts, block_sum(bl, SSIM_TILE)/counts
    va = np.maximum(0, block_sum(al*al, SSIM_TILE)/counts - ma*ma)
    vb = np.maximum(0, block_sum(bl*bl, SSIM_TILE)/counts - mb*mb)
    cov = block_sum(al*bl, SSIM_TILE)/counts - ma*mb
    score = ((2*ma*mb + 2.55**2) * (2*cov + 7.65**2)) / ((ma*ma+mb*mb+2.55**2) * (va+vb+7.65**2))
    changed = np.any(diff > 0, axis=2)
    return {"mae": float(diff.mean()), "rmse": float(np.sqrt(np.square(diff).mean())),
            "max_channel_diff": int(diff.max()), "max_local_mae": max_local,
            "local_x": int(local_x)*LOCAL_TILE, "local_y": int(local_y)*LOCAL_TILE, "ssim": float((score*counts).sum()/(h*w)),
            "changed_pixels": int(changed.sum()), "changed_ratio": float(changed.mean())}


def write_csv(file, rows):
    with file.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def compare(before, after, output, mae_limit=DEFAULT_MAE, local_limit=DEFAULT_LOCAL_MAE, ssim_limit=DEFAULT_SSIM):
    before, after, output = Path(before), Path(after), Path(output)
    old, new = {p.name for p in before.glob("*.png")}, {p.name for p in after.glob("*.png")}
    if old != new or not old:
        raise ValueError(f"比較対象が一致しません: 前だけ={sorted(old-new)} 後だけ={sorted(new-old)}")
    old_report, new_report = capture(before), capture(after)
    validate_reports(old_report, new_report)
    output.mkdir(parents=True, exist_ok=True)
    frames, summaries = [], []
    for name in sorted(old):
        with Image.open(before / name) as a_file, Image.open(after / name) as b_file:
            old_layout = layout(a_file, old_report, name)
            new_layout = layout(b_file, new_report, name)
            a, b = a_file.convert("RGB"), b_file.convert("RGB")
        if a.size != b.size:
            raise ValueError(f"{name}: 画像の大きさが一致しません {a.size} / {b.size}")
        times, header, fw, fh = old_layout
        if new_layout[1:] != old_layout[1:] or not np.allclose(times, new_layout[0], rtol=0, atol=1e-6):
            raise ValueError(f"{name}: コマの配置・時刻が一致しません")
        rows = []
        for i, time_ms in enumerate(times):
            crop = (i*fw, header, (i+1)*fw, header+fh)
            row = {"effect": Path(name).stem, "frame": i, "time_ms": time_ms, **metrics(a.crop(crop), b.crop(crop))}
            row["numeric_status"] = "NUMERIC_OK" if row["mae"] <= mae_limit and row["max_local_mae"] <= local_limit and row["ssim"] >= ssim_limit else "DIFF"
            row["pixel_status"] = "RGB_EXACT" if row["changed_pixels"] == 0 else "PIXEL_DIFF"
            rows.append(row)
        frames.extend(rows)
        summaries.append({"effect": Path(name).stem, "frames": len(rows),
                          "max_mae": max(r["mae"] for r in rows), "max_local_mae": max(r["max_local_mae"] for r in rows),
                          "min_ssim": min(r["ssim"] for r in rows), "max_rmse": max(r["rmse"] for r in rows),
                          "max_channel_diff": max(r["max_channel_diff"] for r in rows),
                          "max_changed_ratio": max(r["changed_ratio"] for r in rows),
                          "numeric_status": "NUMERIC_OK" if all(r["numeric_status"] == "NUMERIC_OK" for r in rows) else "DIFF",
                          "visual_status": "UNREVIEWED",
                          "pixel_status": "RGB_EXACT" if all(r["pixel_status"] == "RGB_EXACT" for r in rows) else "PIXEL_DIFF"})
        w, h = a.size
        result = Image.new("RGB", (w, (h + 24) * 2), "#101713")
        draw = ImageDraw.Draw(result)
        draw.text((8, 6), name + " / BEFORE", fill="white")
        draw.text((8, h + 30), name + " / AFTER", fill="white")
        result.paste(a, (0, 24))
        result.paste(b, (0, h + 48))
        result.save(output / name)
    write_csv(output / "frames.csv", frames)
    write_csv(output / "effects.csv", summaries)
    lines = ["# 固定時刻VFX比較", "", f"前: `{before}`  ", f"後: `{after}`", "",
             f"RGBは0〜255。全コマでMAE ≤ {mae_limit}、最大{LOCAL_TILE}×{LOCAL_TILE}局所MAE ≤ {local_limit}、輝度SSIM ≥ {ssim_limit}を数値の目安とする。",
             "SSIMは8×8非重複窓の画素数加重平均。ラベル行は除外。数値合格は目視合格を意味しない。",
             "RGB_EXACTは全コマの全RGBが一致した場合だけ。1チャンネルでも差があればPIXEL_DIFFとし、数値の目安とは別に報告する。", "",
             "| 効果 | コマ数 | 最大MAE | 最大局所MAE | 最小SSIM | 最大RMSE | 数値 | RGB一致 | 目視 |",
             "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |"]
    for row in summaries:
        lines.append(f'| {row["effect"]} | {row["frames"]} | {row["max_mae"]:.6f} | {row["max_local_mae"]:.6f} | {row["min_ssim"]:.8f} | {row["max_rmse"]:.6f} | {row["numeric_status"]} | {row["pixel_status"]} | 未判定 |')
    (output / "metrics.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    passed = sum(r["numeric_status"] == "NUMERIC_OK" for r in summaries)
    exact = sum(r["pixel_status"] == "RGB_EXACT" for r in summaries)
    print(f"{len(old)}効果・{len(frames)}コマの比較を保存: {output}（数値の目安 {passed}/{len(old)}、全RGB一致 {exact}/{len(old)}、目視は未判定）")


if __name__ == "__main__":
    if sys.argv[1:2] == ["--strip"]:
        strip(sys.argv[2], json.loads(sys.argv[3]), sys.argv[4:])
    else:
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("before")
        parser.add_argument("after")
        parser.add_argument("output")
        parser.add_argument("--mae-limit", type=float, default=DEFAULT_MAE)
        parser.add_argument("--local-limit", type=float, default=DEFAULT_LOCAL_MAE)
        parser.add_argument("--ssim-limit", type=float, default=DEFAULT_SSIM)
        opts = parser.parse_args()
        if not (0 <= opts.mae_limit <= 255 and 0 <= opts.local_limit <= 255 and 0 <= opts.ssim_limit <= 1):
            parser.error("指標の目安が範囲外です")
        compare(opts.before, opts.after, opts.output, opts.mae_limit, opts.local_limit, opts.ssim_limit)
