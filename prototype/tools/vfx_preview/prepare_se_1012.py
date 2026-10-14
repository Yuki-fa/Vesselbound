#!/usr/bin/env python3
"""2026-10-12指定の21キャラ×3候補だけを生成。原音・既存SEを変更しない。"""
from pathlib import Path
import array, hashlib, json, math, re, shutil, subprocess, sys, tempfile, wave
PROJECT=Path(__file__).resolve().parents[2]
OUT=PROJECT/'tools/vfx_preview/se'
SOURCE_ROOT=Path('/Users/yuki/マイドライブ/Argante/デジタル/素材/効果音')
def load_catalog():
    source=(OUT.parent/'se_catalog.js').read_text()
    return json.loads(source[source.index('{'):source.rindex('}')+1])
def main():
    picks=json.loads((OUT/'picks_1012.json').read_text());catalog=load_catalog()
    existing={s['filename'] for key,s in catalog['sounds'].items() if key not in {f'{name}-{i}' for name in picks for i in (1,2,3)}}
    new={};rows=[];details=[];adopted=[];seen=set()
    with tempfile.TemporaryDirectory(prefix='vb-vfx21-se-') as tmp:
        for name,entry in picks.items():
            keys=[]
            for i,pick in enumerate(entry['candidates'],1):
                key=f'{name}-{i}';keys.append(key);source=Path(pick['source'])
                assert source.is_relative_to(SOURCE_ROOT) and source.is_file()
                assert not re.search(r'Human|Voice|Whisper|Speak|Chant|Scream|Howl|Growl|Creature|Animal|Monster',source.name,re.I),source
                assert source.name not in existing and source.name not in seen,source
                seen.add(source.name)
                converted=Path(tmp)/f'{key}.wav'
                subprocess.run(['afconvert','-f','WAVE','-d','LEI16@48000',str(source),str(converted)],check=True,capture_output=True)
                with wave.open(str(converted),'rb') as wav:
                    channels=wav.getnchannels();samples=array.array('h',wav.readframes(wav.getnframes()));original=wav.getnframes()/48000
                if sys.byteorder!='little':samples.byteswap()
                peak=max(abs(x) for x in samples);threshold=max(30,peak*.012)
                first=next((n for n,x in enumerate(samples) if abs(x)>threshold),0)//channels
                start=max(0,first-480);maximum=max(range(len(samples)),key=lambda n:abs(samples[n]))//channels
                # 長音は主な立ち上がりとピークを同じ1.95秒へ収める。切り出し位置は全件記録。
                if maximum-start>int(1.75*48000):start=max(start,maximum-int(.48*48000))
                end=min(len(samples)//channels,start+int(1.95*48000))
                output=samples[start*channels:end*channels]
                fade=min(1440,len(output)//channels)
                for f in range(fade):
                    at=len(output)-fade*channels+f*channels;factor=1-f/max(1,fade-1)
                    for ch in range(channels):output[at+ch]=round(output[at+ch]*factor)
                gain=32767*10**(-1/20)/max(1,max(abs(x) for x in output))
                output=array.array('h',(max(-32767,min(32767,round(x*gain))) for x in output))
                peak_time=(max(range(len(output)),key=lambda n:abs(output[n]))//channels)/48000
                if sys.byteorder!='little':output.byteswap()
                destination=OUT/f'{key}.wav'
                with wave.open(str(destination),'wb') as wav:
                    wav.setnchannels(channels);wav.setsampwidth(2);wav.setframerate(48000);wav.writeframes(output.tobytes())
                meta={'id':key,'filename':source.name,'source':str(source),'url':f'vfx_preview/se/{key}.wav',
                      'duration':round(len(output)/channels/48000,6),'originalDuration':round(original,6),'start':round(start/48000,6),
                      'trimmed':bool(start or end<len(samples)//channels),'peakDbfs':-1,'peak':round(peak_time,6),
                      'adopted':False,'provisional':i==1,'reason':pick['reason'],'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
                catalog['sounds'][key]=meta;new[key]=meta
                details.extend([f'<a id="{key}"></a>',f'### {key} / {source.name}','',f'- 元素材: `{source}`',
                    f'- 理由: {pick["reason"]}',f'- 原音 {original:.6f}秒 / 開始 {meta["start"]:.6f}秒 / 出力 {meta["duration"]:.6f}秒 / peak {meta["peak"]:.6f}秒',
                    '- 48kHz・16bit PCM、頭の無音を詰め、末尾30msフェード、ピーク約-1dBFS。聴感未確認。',''])
                if i==1:
                    target=PROJECT/'assets/sfx'/f'{entry["code"]}.wav'
                    if target.exists():
                        previous=load_catalog()['sounds'].get(key)
                        assert previous and hashlib.sha256(target.read_bytes()).hexdigest()==previous['sha256'],'既存assetsは上書きしない: '+str(target)
                    shutil.copyfile(destination,target)
                    adopted.append(f'| {entry["code"]} | {name} | {source.relative_to(SOURCE_ROOT)} | {meta["duration"]:.6f}秒 | {meta["peak"]:.6f} |')
            catalog['effects'][name]=keys
            rows.append('| '+name+' | '+' | '.join(f'[{new[k]["filename"]}](#{k}) · {new[k]["duration"]:.3f}秒 / peak {new[k]["peak"]:.6f}' for k in keys)+' |')
    (OUT.parent/'se_catalog.js').write_text('/* 2026-10-12: 既存候補を保持し、21キャラ×3候補を追加（ボイス除外・仮は候補1）。 */\nvar VbFxSeCatalog = '+json.dumps(catalog,ensure_ascii=False,indent=2)+';\n')
    manifest=json.loads((OUT/'manifest.json').read_text())
    for name in picks:
        manifest['effects'][name]=catalog['effects'][name]
        for i in (1,2,3):manifest['sounds'][f'{name}-{i}']=catalog['sounds'][f'{name}-{i}']
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    p=OUT/'README.md';text=p.read_text();text=re.sub(r'\n<!-- VFX21_ROWS_BEGIN -->.*?<!-- VFX21_ROWS_END -->','',text,flags=re.S)
    start=text.index('## 演出ごとの候補');at=text.index('\n\n',text.index('| meteor-scroll',start))
    text=text[:at]+'\n<!-- VFX21_ROWS_BEGIN -->\n'+'\n'.join(rows)+'\n<!-- VFX21_ROWS_END -->'+text[at:]
    text=text.split('\n## 2026-10-12追加21種の原音と加工')[0]
    p.write_text(text+'\n## 2026-10-12追加21種の原音と加工\n\n63素材は相互・既存候補・採用音とファイル名が重複しない。全て候補1を仮採用（利用者未選択）。\n\n'+'\n'.join(details))
    p=OUT/'ADOPTED.md';text=p.read_text().split('\n## 2026-10-12追加')[0]
    p.write_text(text+'\n## 2026-10-12追加：仮（候補1・利用者未選択）\n\n以下の21行は正式採用ではなく、候補1をゲーム確認用に新規配置したもの。原音・既存assetsは変更していない。聴感未確認。\n\n| 番号 | 演出 | 元の素材 | 長さ | peak |\n|---|---|---|---|---|\n'+'\n'.join(adopted)+'\n')
    print('21キャラ / 63個の重複しない素材 / 候補1の新規ゲームSE21個を生成')
if __name__=='__main__':main()
