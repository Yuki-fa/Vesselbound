/* Vesselbound 共通VFXの公開窓口。LAB・PvE・オンラインとも同じ定義／レンダラー。
 * API、Promise、状態の付け替え、settingsは従来のまま。戦闘計算・HP変更・SEは行わない。
 * 読み込み順: vfx/schema → curves → textures → defs → renderer → このファイル。
 */
var VbFx = VbFxRenderer;
