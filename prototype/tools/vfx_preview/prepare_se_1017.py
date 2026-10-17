#!/usr/bin/env python3
"""2026-10-17：新規制作したVFX（竜の契約・逆上・嵐の指輪・巻物の使用）のSE候補（各3つ）を生成する。原音・既存のゲームSE（assets/sfx）は変更しない（仮の候補1を置いている1012分の差し替えを除く）。
切り出し：頭の無音を詰める。ピーク（20ms平均の包絡線の最大）が0.6秒より後なら、ピークの0.45秒前から始めて40msで立ち上げる。
1.95秒を超える音は末尾400msをcos²で消す（以前の30msフェードは途中で切れて聞こえた）。ピーク約-1dBFS、48kHz・16bit。"""
from pathlib import Path
import array, hashlib, json, math, os, re, shutil, subprocess, sys, tempfile, wave
import numpy as np
PROJECT=Path('/Users/yuki/マイドライブ/Argante/デジタル/Vesselbound/prototype')
OUT=PROJECT/'tools/vfx_preview/se'
SOURCE_ROOT=Path('/Users/yuki/マイドライブ/Argante/デジタル/素材/効果音')
INDEX=[l.strip()[2:] for l in open(sys.argv[2]) if l.strip()]
PICKS=json.loads(Path(sys.argv[1]).read_text())
BAD=re.compile(r'Human|Voice|Whisper|Speak|Chant|Scream|Howl|Growl|Creature|Animal|Monster|Vocal|Roar',re.I)
SR=48000
def load_catalog():
    s=(OUT.parent/'se_catalog.js').read_text();return json.loads(s[s.index('{'):s.rindex('}')+1])
def cut(src,dst):
    with tempfile.TemporaryDirectory() as tmp:
        conv=Path(tmp)/'c.wav'
        subprocess.run(['afconvert','-f','WAVE','-d','LEI16@48000',str(src),str(conv)],check=True,capture_output=True)
        w=wave.open(str(conv));ch=w.getnchannels();d=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,ch).astype(np.float64)
    original=len(d)/SR;a=np.abs(d).max(axis=1);thr=max(30,a.max()*.012)
    first=int(np.argmax(a>thr));start=max(0,first-int(.01*SR))
    k=int(.02*SR);env=np.convolve(a,np.ones(k)/k,'same');peak=int(env.argmax())
    fade_in=0
    if peak-start>int(.6*SR):start=peak-int(.45*SR);fade_in=int(.04*SR)
    end=min(len(d),start+int(1.95*SR));out=d[start:end].copy()
    if fade_in:out[:fade_in]*=np.linspace(0,1,fade_in)[:,None]
    long=end<len(d)
    tail=min(len(out),int((.4 if long else .03)*SR))
    if tail>1:out[-tail:]*=(np.cos(np.linspace(0,math.pi/2,tail))**2)[:,None]
    out*=32767*10**(-1/20)/max(1,np.abs(out).max());out=np.clip(np.round(out),-32767,32767).astype('<i2')
    w=wave.open(str(dst),'wb');w.setnchannels(ch);w.setsampwidth(2);w.setframerate(SR);w.writeframes(out.tobytes());w.close()
    e=np.convolve(np.abs(out.astype(np.float64)).max(axis=1),np.ones(k)/k,'same')
    return {'duration':round(len(out)/SR,6),'originalDuration':round(original,6),'start':round(start/SR,6),'trimmed':bool(start or long),'peak':round(int(e.argmax())/SR,6),'tailFadeMs':round(tail/SR*1000)}
def main():
    cat=load_catalog();rows=[];details=[]
    replaced={k for n,e in PICKS.items() if e.get('replace1012') for k in cat['effects'].get(n,[])}
    used={s['filename'] for k,s in cat['sounds'].items() if k not in replaced and not k.startswith(tuple(n+'-' for n in PICKS))}
    seen=set()
    for name,e in PICKS.items():
        keys=[]
        for i,q in enumerate(e['q'],1):
            m=sorted(l for l in INDEX if q in l and os.path.basename(l) not in used and os.path.basename(l) not in seen and not BAD.search(l))
            assert m,(name,q);src=SOURCE_ROOT/m[0];fn=os.path.basename(m[0]);seen.add(fn)
            key=f'{name}-{i}';dst=OUT/f'{key}.wav';meta=cut(src,dst);keys.append(key)
            cat['sounds'][key]={'id':key,'filename':fn,'source':str(src),'url':f'vfx_preview/se/{key}.wav',**meta,'peakDbfs':-1,
              'peakMode':'envelope20ms','adopted':False,'provisional':bool(e.get('replace1012') and i==1),'reason':e['why'],'sha256':hashlib.sha256(dst.read_bytes()).hexdigest()}
            details+= [f'<a id="{key}"></a>',f'### {key} / {fn}','',f'- 元素材: `{src}`',f'- 理由: {e["why"]}',
              f'- 原音 {meta["originalDuration"]:.3f}秒 / 開始 {meta["start"]:.3f}秒 / 出力 {meta["duration"]:.3f}秒 / peak {meta["peak"]:.3f}秒 / 末尾フェード {meta["tailFadeMs"]}ms','']
            if e.get('replace1012') and i==1:shutil.copyfile(dst,PROJECT/'assets/sfx'/f'{e["code"]}.wav')
        cat['effects'][name]=keys
        rows.append('| '+name+' | '+' | '.join(f'[{cat["sounds"][k]["filename"]}](#{k}) · {cat["sounds"][k]["duration"]:.3f}秒 / peak {cat["sounds"][k]["peak"]:.3f}' for k in keys)+' |')
        print(name,[ (cat['sounds'][k]['filename'][:40],cat['sounds'][k]['peak'],cat['sounds'][k]['duration']) for k in keys])
    (OUT.parent/'se_catalog.js').write_text('/* 2026-10-17: 新規VFX（竜の契約・逆上・嵐の指輪・巻物の使用）の3候補を追加（ボイス除外・重複なし）。2026-10-15: 作り直したVFXの3候補・スキュラの候補を作り直し。 */\nvar VbFxSeCatalog = '+json.dumps(cat,ensure_ascii=False,indent=2)+';\n')
    man=json.loads((OUT/'manifest.json').read_text())
    for name in PICKS:
        man['effects'][name]=cat['effects'][name]
        for k in cat['effects'][name]:man['sounds'][k]=cat['sounds'][k]
    (OUT/'manifest.json').write_text(json.dumps(man,ensure_ascii=False,indent=2)+'\n')
    p=OUT/'README.md';t=p.read_text();t=re.sub(r'\n<!-- SE1017_ROWS_BEGIN -->.*?<!-- SE1017_ROWS_END -->','',t,flags=re.S)
    t=t.split('\n## 2026-10-17追加の原音と加工')[0]
    at=t.index('<!-- SE1015_ROWS_END -->')+len('<!-- SE1015_ROWS_END -->')
    t=t[:at]+'\n<!-- SE1017_ROWS_BEGIN -->\n'+'\n'.join(rows)+'\n<!-- SE1017_ROWS_END -->'+t[at:]
    p.write_text(t+'\n## 2026-10-17追加の原音と加工\n\n2026-10-17に新規制作したVFX4種（竜の契約・逆上・嵐の指輪・巻物の使用）の候補。巻物の使用は5種（盾・幻視・巨大化・魔力・鼓舞の旗）で同じ3候補を共有する。ゲームの採用SE（assets/sfx）は変えていない（利用者が選ぶまで無音）。聴感未確認。\n\n'+'\n'.join(details))
main()
