'use strict';
// 2026-10-10：不具合1/5の同じ再現スクリプトのうちNodeで実行できる検査を必須一覧へ。
require('../parity/attack_lifecycle_1010_check').nodeChecks().catch(e=>{console.error(e.stack);process.exitCode=1;});
