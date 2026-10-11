'use strict';
// 2026-10-10：同じcapture.js --names guts-stateを変更前・変更後へ実行する。
// 出力先：VB_CAPTURE_OUT（既定は一時フォルダ/vb-guts-1010）。作業中の定義は差し戻さない。
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const capture = require('../vfx_capture/capture');
const ROOT = path.resolve(__dirname, '../..');
function beforePreview(temp) {
  // file://で読める一時プレビュー。画像・道具・現在のレンダラーは元ファイルを読む。
  function links(dir, relative, except = []) {
    fs.mkdirSync(dir, { recursive: true });
    for(const name of fs.readdirSync(path.join(ROOT, relative)))
      if(!except.includes(name))fs.symlinkSync(path.join(ROOT, relative, name), path.join(dir, name));
  }
  fs.symlinkSync(path.join(ROOT, 'assets'), path.join(temp, 'assets'));
  links(path.join(temp, 'tools'), 'tools', ['vfx_preview.html']);
  fs.copyFileSync(path.join(ROOT, 'tools/vfx_preview.html'), path.join(temp, 'tools/vfx_preview.html'));
  links(path.join(temp, 'js'), 'js', ['vfx']);
  links(path.join(temp, 'js/vfx'), 'js/vfx', ['defs']);
  links(path.join(temp, 'js/vfx/defs'), 'js/vfx/defs', ['effects.js']);
  fs.writeFileSync(path.join(temp, 'js/vfx/defs/effects.js'),
    execFileSync('git', ['show', '44bf3d5:prototype/js/vfx/defs/effects.js'], { cwd: ROOT }));
  return pathToFileURL(path.join(temp, 'tools/vfx_preview.html')).href;
}
async function main() {
  require('../balance_sim/guts_state_1010_regression');
  const out = path.resolve(process.env.VB_CAPTURE_OUT || path.join(os.tmpdir(), 'vb-guts-1010'));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-guts-before-'));
  const errors = [];
  try {
    const urls = { before: beforePreview(temp), after: process.env.VB_VFX_URL || pathToFileURL(path.join(ROOT, 'tools/vfx_preview.html')).href };
    for(const [label, url] of Object.entries(urls)) {
      try {
        await capture.main(['--names', 'guts-state', '--url', url, '--out', path.join(out, label),
          '--seed', '53', '--speed', '1.5', '--frames', '8']);
      } catch(e) { errors.push(label + ': ' + e.message); }
    }
    if(errors.length) throw new Error(errors.join('\n'));
    console.log('根性状態1010 前後撮影: ' + out + '/{before,after}/guts-state.png（見た目は画像で確認）');
  } finally { fs.rmSync(temp, { recursive:true,force:true }); }
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={beforePreview};
