#!/usr/bin/env python3
"""選定済み候補を 48kHz/16bit WAV へ変換する（原本には書き込まない）。
macOS の afconvert を使用。再実行は prototype/ で行う。
"""
from pathlib import Path
import array
import csv
import hashlib
import io
import json
import math
import subprocess
import sys
import tempfile
import wave

PROJECT = Path(__file__).resolve().parents[2]
OUT = PROJECT / 'tools/vfx_preview/se'
SOUND_ROOT = Path('/Users/yuki/マイドライブ/Argante/デジタル/素材/効果音')

# 明示的に選んだファイル名。短尺の魔法音・火球・風切り・氷・打撃を中心にする。
PICKS = {
    'fireball': ('Fire Fireball Large 01.wav', '火球の低い破裂'),
    'fireball2': ('Fire Fireball Large 03.wav', '火球の別テイク'),
    'torch': ('Fire Torch Movement Flare Up 01.wav', '炎の立ち上がり'),
    'torch-pass': ('Fire Torch Movement Fast Pass By 04.wav', '短い炎の通過'),
    'fire-deflect': ('SORCERY - DESIGNED - MAGIC FIRE Deflect Spell-03.wav', '炎魔法の弾き'),
    'fire-deflect2': ('SORCERY - DESIGNED - MAGIC FIRE Deflect Spell-04.wav', '炎魔法の別テイク'),
    'ghost': ('Horror Scary Human Whisper Ghost 05.wav', '幽霊の囁き（短く切出し）'),
    'spell-whisper': ('Horror Scary Human Female Whispering Spell 05.wav', '短い呪文の囁き'),
    'spell-voice': ('Horror Scary Human Female Speaking Spell 11.wav', '声のある呪文'),
    'plasma': ('RPG3_PlasmaMagicBall_Cast01.wav', '魔力の弾'),
    'ice-break': ('RPG3_IceMagic2_IceBreakLonger01.wav', '氷の砕け'),
    'ice-deflect': ('SORCERY - DESIGNED - MAGIC ICE Deflect Spell-03.wav', '氷魔法の衝突'),
    'ice-deflect2': ('SORCERY - DESIGNED - MAGIC ICE Deflect Spell-01.wav', '氷魔法の別テイク'),
    'water': ('SORCERY - DESIGNED - MAGIC WATER Deflect Spell-04.wav', '水の膜を弾く'),
    'electric': ('SORCERY - DESIGNED - MAGIC ELECTRIC Deflect Spell-04.wav', '魔力の短い放電'),
    'white': ('SORCERY - DESIGNED - MAGIC WHITE Cast Medium 05-02.wav', '明るい魔法の発動'),
    'white2': ('SORCERY - DESIGNED - MAGIC WHITE Cast Medium 05-04.wav', '白魔法の別テイク'),
    'light-buff': ('RPG3_LightMagic_Buff03_P1v2.wav', '光のバフ（短く切出し）'),
    'chime': ('Production Element Title Transition Bell Chime 01.wav', '鐘のきらめき'),
    'chime2': ('Science Fiction Sci-Fi Electronic Chime 139.wav', '短い電子チャイム'),
    'wind': ('WINDDsgn_Wind, Rush, Whoosh, Long x5 01_344 Audio_Elemental Palette Designed Vol 1.wav', '風が通過する'),
    'whoosh': ('Production Element Title Transition Whoosh Fly By 01.wav', '短い風切り'),
    'arrow': ('Weapon Arrow Shot 01.wav', '細い矢の発射'),
    'crossbow': ('Weapon Crossbow Fire Arrow Release 01.wav', '鋭い弩の発射'),
    'bow': ('Weapon Bow And Arrow Thump 01.wav', '弦の短い打音'),
    'stone': ('Impact Rock Hit Concrete 01.wav', '石とコンクリートの接触'),
    'stone2': ('Weapon Sword Scrape On Stone 02.wav', '石の擦れ'),
    'bone': ('Impact Rocks Hit By Wood Stick 01.wav', '骨を連想する硬い打音'),
    'blood': ('MELEE - DESIGNED - BLOOD Squish 03-04.wav', '血の湿った破裂'),
    'squish': ('Horror Scary Squish Eyeballs Crush 03.wav', '湿った潰れ'),
    'impact': ('Far Heavy Impact.wav', '重い衝撃'),
    'impact2': ('Production Element Title Transition Hit Impact Short 14.wav', '短い衝撃'),
    'explosion': ('Explosion Dynamite Burst 01.wav', '爆発の一撃'),
    'howl': ('Animal Mammal Carnivore Dog Coyote Howl 01.wav', '自然な遠吠え'),
    'howl2': ('Howling.wav', '獣の遠吠え（短く切出し）'),
    'howl3': ('Animal Dog Hound Howl 01.wav', '犬の遠吠え（短く切出し）'),
    'roots': ('S008.wav', '既存の活性化'),
    'gold': ('S003.wav', '既存の金貨'),
    'shield': ('K018.wav', '既存の結界'),
    'revive': ('K020.wav', '既存の復活（短く切出し）'),
    'opening': ('appearance.wav', '既存の登場音'),
    'slash': ('sword1.wav', '既存の短い斬撃'),
    'weak-ref': ('K003.wav', '既存の状態付与（C053の音ではない）'),
    'old-all': ('K009.wav', '現在の全体攻撃'),
    'dark-ref': ('C090.wav', '既存の魔力の移動'),
}

# 各演出の3候補。順番はプレビューの初期選択順。
SOUNDS = {
    'dark-fire': ['fireball', 'torch', 'fire-deflect'],
    'banshee': ['ghost', 'plasma', 'spell-whisper'],
    'resentment': ['spell-whisper', 'ghost', 'spell-voice'],
    'lich': ['ghost', 'dark-ref', 'plasma'],
    'great-shield': ['shield', 'water', 'electric'],
    'cover-fire': ['arrow', 'crossbow', 'bow'],
    'shockwave': ['wind', 'impact2', 'whoosh'],
    'demon-soul': ['fire-deflect2', 'impact', 'fireball2'],
    'vrykolakas': ['spell-whisper', 'dark-ref', 'white'],
    'dullahan': ['blood', 'squish', 'fireball'],
    'bone-chariot': ['bone', 'stone2', 'spell-whisper'],
    'jackalope': ['roots', 'white2', 'chime'],
    'dragonnet': ['wind', 'water', 'roots'],
    'cockatrice': ['stone', 'stone2', 'bone'],
    'bandersnatch': ['weak-ref', 'spell-whisper', 'water'],
    'worm': ['wind', 'roots', 'water'],
    'wyvern': ['whoosh', 'wind', 'slash'],
    'frost-sprite': ['ice-deflect', 'ice-break', 'ice-deflect2'],
    'leprechaun': ['gold', 'chime', 'light-buff'],
    'melusine': ['wind', 'spell-whisper', 'water'],
    'carbuncle': ['ice-break', 'shield', 'electric'],
    'pixie': ['plasma', 'electric', 'white'],
    'elemental': ['fire-deflect', 'light-buff', 'white2'],
    'imp': ['dark-ref', 'plasma', 'spell-whisper'],
    'wendigo': ['wind', 'ice-break', 'ice-deflect2'],
    'nightmare': ['ghost', 'spell-whisper', 'dark-ref'],
    'abyss': ['dark-ref', 'ghost', 'impact'],
    'baron': ['spell-voice', 'fire-deflect2', 'ghost'],
    'pegasus': ['white', 'light-buff', 'chime'],
    'direwolf': ['howl', 'howl2', 'howl3'],
    'weaken': ['impact2', 'bone', 'stone'],
    'atk-down': ['ice-deflect', 'chime2', 'water'],
    'all-sweep': ['slash', 'whoosh', 'impact2'],
    'all-ring': ['impact2', 'impact', 'old-all'],
    'all-cross': ['slash', 'crossbow', 'impact2'],
    'meteor-scroll': ['explosion', 'fireball', 'old-all'],
}


def export_se():
    OUT.mkdir(parents=True, exist_ok=True)
    files = list(SOUND_ROOT.rglob('*.wav')) + list((PROJECT / 'assets/sfx').glob('*.wav'))
    meta = {}
    with tempfile.TemporaryDirectory(prefix='vb-fx-audio-') as tmp:
        for key, (filename, reason) in PICKS.items():
            matched = [p for p in files if p.name == filename]
            if len(matched) != 1:
                raise ValueError(f'{filename}: ファイルを一意に特定できません: {matched}')
            source = matched[0]
            intermediate = Path(tmp) / (key + '.wav')
            subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@48000', str(source), str(intermediate)], check=True, capture_output=True)
            with wave.open(str(intermediate), 'rb') as w:
                channels = w.getnchannels()
                samples = array.array('h', w.readframes(w.getnframes()))
                original_duration = w.getnframes() / 48000
            if sys.byteorder != 'little': samples.byteswap()
            # 無音がある場合は、最初の明確な立ち上がりの10ms前まで詰める。
            peak = max(abs(v) for v in samples)
            threshold = max(30, peak * .012)
            first = next((i for i, v in enumerate(samples) if abs(v) > threshold), 0) // channels
            start_frame = max(0, first - 480) if first > 2880 else 0
            end_frame = min(len(samples) // channels, start_frame + int(1.95 * 48000))
            cut_tail = end_frame < len(samples) // channels
            output = samples[start_frame * channels:end_frame * channels]
            if cut_tail:
                fade_frames = min(1440, len(output) // channels)
                for frame in range(fade_frames):
                    at = len(output) - fade_frames * channels + frame * channels
                    factor = 1 - frame / max(1, fade_frames - 1)
                    for ch in range(channels): output[at + ch] = round(output[at + ch] * factor)
            gain = (32767 * math.pow(10, -1 / 20)) / max(1, max(abs(v) for v in output))
            output = array.array('h', (max(-32767, min(32767, round(v * gain))) for v in output))
            if sys.byteorder != 'little': output.byteswap()
            destination = OUT / (key + '.wav')
            with wave.open(str(destination), 'wb') as w:
                w.setnchannels(channels); w.setsampwidth(2); w.setframerate(48000); w.writeframes(output.tobytes())
            meta[key] = {
                'id': key, 'filename': filename, 'source': str(source), 'url': 'vfx_preview/se/' + key + '.wav',
                'duration': round(len(output) / channels / 48000, 4), 'originalDuration': round(original_duration, 4),
                'start': round(start_frame / 48000, 4), 'trimmed': bool(start_frame or cut_tail),
                'peakDbfs': -1, 'reason': reason, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()
            }
    return meta


def main():
    meta = export_se()
    (OUT / 'manifest.json').write_text(json.dumps({'sounds': meta, 'effects': SOUNDS}, ensure_ascii=False, indent=2) + '\n')
    (OUT.parent / 'se_catalog.js').write_text('/* 自動生成。file:// 用の通常スクリプト。 */\nvar VbFxSeCatalog = '
        + json.dumps({'sounds': meta, 'effects': SOUNDS}, ensure_ascii=False, indent=2) + ';\n')
    lines = ['# VFXプレビューのSE候補', '',
        'ファイル名・フォルダ名と原音の尺による一次選定。聴感は未確認。各演出の最初の候補を初期選択にしている。', '',
        '全候補は48kHz・16bit PCM WAV、ピーク約-1dBFS。最長1.95秒。頭の無音を詰めたものと長音の末尾を切ったものは表に記録。切った末尾は30msフェード。原本は変更していない。', '',
        '根・霧・金色・虹には名前が完全一致する短音が少なく、活性化・風・白魔法・鐘を代替候補にした。', '',
        'C053専用の登録／ファイルは現状存在しないため、bandersnatchの3候補は比較用。C053のSEと称していない。', '',
        '## 演出ごとの候補', '', '| 演出キー | 候補1 | 候補2 | 候補3 |', '| --- | --- | --- | --- |']
    for key, ids in SOUNDS.items():
        lines.append('| ' + key + ' | ' + ' | '.join(f'[{meta[i]["filename"]}](#{i}) · {meta[i]["duration"]:.3f}秒' for i in ids) + ' |')
    lines += ['', 'ヴリコラカスは復活開始時に `revive.wav`、ダイアウルフはウルフ登場開始時に `opening.wav` を追加再生する。候補3つとは別の既存SE。', '', '## 原本と加工', '']
    for key, sound in meta.items():
        lines += [f'<a id="{key}"></a>', f'### {sound["filename"]}', '',
            f'- コピー: `{key}.wav`', f'- 元の場所: `{sound["source"]}`',
            f'- 原音: {sound["originalDuration"]:.3f}秒 / コピー: {sound["duration"]:.3f}秒 / 開始位置: {sound["start"]:.3f}秒',
            f'- 選定理由: {sound["reason"]}', f'- 加工: 48kHz PCM16、ピーク-1dBFS' + ('、尺を切出し' if sound['trimmed'] else '、全尺'), '']
    (OUT / 'README.md').write_text('\n'.join(lines))
    print(f'{len(SOUNDS)}演出 × 3候補 / 重複を共有した{len(meta)}ファイルを書き出しました')


if __name__ == '__main__': main()
