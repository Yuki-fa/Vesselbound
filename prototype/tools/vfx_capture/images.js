'use strict';
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');

const FRAME_DIRECTORY = path.join(__dirname, '../vfx_preview/capture_frames');
const ASSET_DIRECTORY = path.join(__dirname, '../../assets/vfx');
const sources = new Map();

function frameSource(file, frameDirectory = FRAME_DIRECTORY, assetDirectory = ASSET_DIRECTORY) {
  const match = /^(K\d{3})_(\d{3})\.webp$/.exec(file);
  if (!match) throw new Error('静止コマのファイル名が不正です: ' + file);
  const cacheKey = path.resolve(frameDirectory) + '\n' + path.resolve(assetDirectory) + '\n' + file;
  if (sources.has(cacheKey)) return sources.get(cacheKey);
  let data, mime = 'image/webp';
  try { data = fs.readFileSync(path.join(frameDirectory, file)); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    // capture_frames/はGit管理外。旧コミットの配信フォルダにも、道具のコピーにも
    // 無いことがある（2026-10-08 第1回撮影の隕石で失敗）。元画像からメモリ上へ抽出する。
    const asset = path.join(assetDirectory, match[1] + '.webp');
    const extracted = spawnSync('python3', ['-c', [
      'from PIL import Image', 'import sys',
      'with Image.open(sys.argv[1]) as image:',
      '    image.seek(int(sys.argv[2]))',
      '    image.convert("RGBA").save(sys.stdout.buffer, format="PNG")'
    ].join('\n'), asset, String(Number(match[2]))], { timeout: 10000, maxBuffer: 16 * 1024 * 1024 });
    if (extracted.error || extracted.status !== 0) {
      throw new Error('静止コマを抽出できません: ' + file + ' / 元画像: ' + asset + '\n' +
        (extracted.error ? extracted.error.message : extracted.stderr.toString().trim()));
    }
    data = extracted.stdout; mime = 'image/png';
  }
  const source = 'data:' + mime + ';base64,' + data.toString('base64');
  sources.set(cacheKey, source); return source;
}

// この関数だけページ側へ文字列化して渡す。仮時計を進めず、ネイティブのloadを待つ。
async function decodeImage(image, label, source) {
  function loaded() {
    return new Promise(function (resolve, reject) {
      function clear() { image.removeEventListener('load', onLoad); image.removeEventListener('error', onError); }
      function onLoad() { clear(); resolve(); }
      function onError() { clear(); reject(new Error('画像を読み込めません: ' + label)); }
      image.addEventListener('load', onLoad); image.addEventListener('error', onError);
    });
  }
  if (source !== undefined && image.src !== source) {
    const waiting = loaded(); image.src = source; await waiting;
  } else if (!image.complete) await loaded();
  if (!image.naturalWidth) throw new Error('画像を読み込めません: ' + label);
  // srcの更新中にdecodeを呼ぶと、更新前のリクエストの中断でもEncodingErrorになる。
  // load後に呼ぶ。壊れた画像のデコード失敗は握り潰さず、コマ名を付けて返す。
  try { await image.decode(); }
  catch (e) { throw new Error('画像をデコードできません: ' + label + ' / ' + e.message); }
}

module.exports = { frameSource, decodeImage };
