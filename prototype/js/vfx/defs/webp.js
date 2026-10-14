/* 第2段：WebPは色・形・動きの参考だけ。描画は汎用部品の宣言データ。
 * SEは変更しない。実ゲームの尺・合図は共通入口の値をdurationMsへ渡す。
 * 着地の金輪は560msから薄れ始め、980msで消す。
 * 2026-10-12 ゲーム内の旧／新比較：新32種の描画面・濃さを調整（尺・命中・SEは入口のまま）。
 * 2026-10-12 第2回：範囲内17種を維持。15種の光の濃さ・層順・広がりを調整。
 * 2026-10-12 第3回：範囲内29種を維持。波の面を0.90倍、魔導板の緑/青の濃さを0.82/0.65倍へ。
 * 2026-10-12 最終拡大レビュー：指定19種は核・塊・太い環・魔法陣を主役に再構成。色かぶりで量を稼がない。
 * 2026-09-27 利用者指摘：表示のない対象を薙ぎ払いの向きへ含めない（共通入口で保持）。
 * 2026-09-29 利用者報告：薙ぎ払いの原点は踏み込んだ複製カードの先端（共通入口で保持）。
 */
// 2026-10-12: vfxcap_y/r1の18種を調整。核・塊・図形で存在感を出し、尺・命中・合図は維持。
// 着地のoffset/半径は244%の旧入れ物の幅が単位。左0.71カード幅の位置へ換算する。
// 2026-10-13: run 9再適用。vfxcap_y/r2の14種を調整。核と形を保ち、煙の起伏・光球4個・放射線・帯の投影を修正。
// 2026-10-13: r5/r1の拡大比較で9種を調整。核・煙塊・光条・魔法陣を整え、ゲームの尺・命中・SEは維持。
// 2026-10-13: r5/r2。毒・奪うの局所煙塊、ハートの下側配置、炎の暖色、魔法陣の線幅を調整。時計と共通描画は保持。
// 2026-10-13: r5/r3。炎は細い分岐する内側へ光量を移し、接触煙は小径3房で中央を埋める。原点・尺・命中・SEは保持。
// 2026-10-13: r5/r4。炎の明部と形を保持し、t=0.5の外側2層のalphaだけ0.90倍。光量ピーク130.73%を抑える。時計は保持。
// 2026-10-13: flame-sweepだけを修正。固定の縦帯を移動する橙〜赤の炎塊へ替え、通過跡に灰褐色の煙を残す。原点・尺・命中は保持。
// 2026-10-13: flame/r1拡大レビュー。炎の横移動・芯を保持し、薄い横刃の橙赤の面を厚くして上へ巻く房を追加。尺・命中・原点は保持。
// 2026-10-14 品質向上（Claude直接）：flame-sweep を作り直し
// 2026-10-14 処理落ち対策：ぼかしフィルター（softness）を外す（戦闘で頻繁に出るため。見た目はほぼ同じ）
// 2026-10-14 品質向上（Claude直接）：mana-gain を作り直し
// 2026-10-14 品質向上（Claude直接）：mana-cue を作り直し
// 2026-10-14 品質向上（Claude直接）：attack-recoil を作り直し
// 2026-10-14 品質向上（Claude直接）：injury-buff を作り直し
// 2026-10-14 品質向上（Claude直接）：attack-buff を作り直し
// 2026-10-14 品質向上（Claude直接）：siren-wave を作り直し
// 2026-10-14 品質向上（Claude直接）：medusa-gaze を作り直し
// 2026-10-14 品質向上（Claude直接）：steal-mark を作り直し
// 2026-10-14 品質向上（Claude直接）：fang-poison を作り直し
// 2026-10-14 品質向上（Claude直接）：poison-tick を作り直し
// 2026-10-14 品質向上（Claude直接）：centaur-missile を作り直し
// 2026-10-14 品質向上（Claude直接）：centaur-impact を作り直し
// 2026-10-14 品質向上（Claude直接）：death-buff を作り直し
// 2026-10-14 品質向上（Claude直接）：aura-buff を作り直し
// 2026-10-14 品質向上（Claude直接）：arachne-ring を作り直し
VbFxDefs.register({
  "schemaVersion": 2,
  "effects": [
    {
      "name": "hit-burst",
      "label": "被弾 · hit",
      "sourceCode": "hit",
      "ms": 1200,
      "color": "#c28a53",
      "light": "#ffe5b0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#7a513b",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0936
                ],
                [
                  0.125,
                  0.468
                ],
                [
                  0.25,
                  0.6006
                ],
                [
                  0.375,
                  0.702
                ],
                [
                  0.5,
                  0.6552
                ],
                [
                  0.625,
                  0.4368
                ],
                [
                  0.78,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.125,
                  0.39
                ],
                [
                  0.25,
                  0.45
                ],
                [
                  0.375,
                  0.5
                ],
                [
                  0.625,
                  0.54
                ],
                [
                  1,
                  0.56
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "cloud-bank",
          "radius": 0.5,
          "light": "#a77a54",
          "shadow": "#694634",
          "blend": "normal"
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#dca860",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.096
                ],
                [
                  0.125,
                  0.32
                ],
                [
                  0.25,
                  0.368
                ],
                [
                  0.375,
                  0.72
                ],
                [
                  0.5,
                  0.352
                ],
                [
                  0.625,
                  0.04
                ],
                [
                  0.75,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.18
                ],
                [
                  1,
                  0.27
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.069508
                ],
                [
                  0.125,
                  0.199836
                ],
                [
                  0.25,
                  0.260656
                ],
                [
                  0.375,
                  0.53
                ],
                [
                  0.5,
                  0.29541
                ],
                [
                  0.66,
                  0.052131
                ],
                [
                  1,
                  0.0001
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "flare",
          "radius": 0.53,
          "light": "#ffdf92",
          "shadow": "#987946",
          "blend": "normal"
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ebc47b",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.125,
                  0.3
                ],
                [
                  0.25,
                  0.34
                ],
                [
                  0.375,
                  0.85
                ],
                [
                  0.5,
                  0.27
                ],
                [
                  0.625,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.13,
          "blend": "normal",
          "stops": [
            [
              0,
              "#fff0bf",
              1
            ],
            [
              0.45,
              "#fff0bf",
              1
            ],
            [
              0.68,
              "#ebc47b",
              0.98
            ],
            [
              0.88,
              "#ebc47b",
              0.72
            ],
            [
              1,
              "#ebc47b",
              0
            ]
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#dda574",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.125,
                  0.8
                ],
                [
                  0.25,
                  1
                ],
                [
                  0.4,
                  0.9
                ],
                [
                  0.55,
                  0.48
                ],
                [
                  0.67,
                  0.06
                ],
                [
                  0.8,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "motion": "ballistic",
          "count": 7,
          "emission": "rim",
          "extent": [
            0.27,
            0.27
          ],
          "lifeMs": [
            250,
            450
          ],
          "delayMs": [
            100,
            180
          ],
          "speed": [
            0.12,
            0.32
          ],
          "gravity": [
            0,
            -0.025
          ],
          "sizeRange": [
            0.07,
            0.13
          ],
          "spin": [
            -0.8,
            0.8
          ],
          "shape": "halo-ray",
          "light": "#ffe6af",
          "blend": "normal",
          "aspect": [
            0.65,
            0.3
          ]
        }
      ]
    },
    {
      "name": "attack-recoil",
      "label": "反攻の輪 · C002",
      "sourceCode": "C002",
      "ms": 630,
      "color": "#ff5a2a",
      "light": "#ffd29a",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 265,
        "cueMs": 265
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#6a1410",
          "texture": "smoke",
          "radius": 0.95,
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2,
                  0.5
                ],
                [
                  0.7,
                  0.45
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff4a1c",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.35
                ],
                [
                  0.42,
                  0.75
                ],
                [
                  0.75,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 22,
          "countScale": "none",
          "orbit": 0.62,
          "orbitVelocity": 0.35,
          "angleSpeed": 0.25,
          "angularSpread": 0.3,
          "color": "#ff7a3a",
          "radialCurve": {
            "keys": [
              [
                0,
                2.1
              ],
              [
                0.75,
                0.55
              ],
              [
                1,
                0.25
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.6
          },
          "radialDelay": 0.35,
          "radialLife": 0.5,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  1
                ],
                [
                  0.42,
                  1
                ],
                [
                  0.55,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "glow",
              "radiusAbsolute": 0.16,
              "aspect": [
                1.7,
                0.32
              ],
              "rotationScale": 1,
              "color": "#ff6a2a",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.1,
              "aspect": [
                1.5,
                0.2
              ],
              "rotationScale": 1,
              "color": "#fff0d0",
              "blend": "add"
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.12,
              "radialOffset": 0.08,
              "alphaScale": 0.55,
              "color": "#ff7a3a",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#ff5a30",
          "width": 2.6,
          "widthSpace": "pixel",
          "noise": 0.025,
          "strokeProfile": "halo",
          "radius": 0.62,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.55
                ],
                [
                  0.42,
                  1
                ],
                [
                  0.8,
                  0.7
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  0.3,
                  0.64
                ],
                [
                  0.42,
                  0.54
                ],
                [
                  0.52,
                  0.66
                ],
                [
                  1,
                  0.63
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 9,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#ffb070",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.06,
          "strokeProfile": "halo",
          "radius": 0.7,
          "noiseClock": -1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0.4
                ],
                [
                  0.42,
                  0.8
                ],
                [
                  0.85,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.42,
                  0.6
                ],
                [
                  0.6,
                  0.74
                ],
                [
                  1,
                  0.72
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 4,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "size": 0.075,
          "orbit": 0.62,
          "angleSpeed": 1.6,
          "light": "#ffe2b8",
          "shadow": "#d0441c",
          "color": "#ff7a3a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2,
                  0.9
                ],
                [
                  0.8,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  0.3,
                  0.64
                ],
                [
                  0.42,
                  0.54
                ],
                [
                  0.52,
                  0.66
                ],
                [
                  1,
                  0.63
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "glow",
              "color": "#ff9a50",
              "radiusScale": 1.6,
              "blend": "add"
            },
            {
              "shape": "orb",
              "blend": "normal"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "fog",
          "mode": "cloud",
          "color": "#a8322a",
          "count": 10,
          "radius": 0.24,
          "extent": [
            0.66,
            0.7
          ],
          "texture": "smoke",
          "flow": [
            0,
            -0.04
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.42,
                  0.25
                ],
                [
                  0.6,
                  0.55
                ],
                [
                  0.85,
                  0.3
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "glow",
          "color": "#ff6a2a",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.95
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  0.75
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "glow",
          "color": "#fff0d8",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.6
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "ring",
          "color": "#ffc890",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.15,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.5
                ],
                [
                  1,
                  1.05
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4.5
                ],
                [
                  1,
                  1.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffb27a",
          "count": 36,
          "vortex": 0.4,
          "radius": 0.95,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.42,
            0.62
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.45
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shake",
          "time": [
            0.42,
            0.6
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "strength": [
            0.03,
            0.012
          ],
          "frequencyHz": [
            19,
            13
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "arachne-ring",
      "label": "アラクネの熱波 · C008",
      "sourceCode": "C008",
      "ms": 1200,
      "color": "#ff7a2a",
      "light": "#ffe2a0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 600,
        "cueMs": 360
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ff5a14",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "time": [
            0,
            0.55
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  0.7
                ],
                [
                  0.55,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 14,
          "countScale": "none",
          "orbit": 0.5,
          "orbitVelocity": 0.25,
          "angleSpeed": 2,
          "color": "#ffb050",
          "time": [
            0,
            0.32
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.6
              ],
              [
                1,
                0.1
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.3
          },
          "radialDelay": 0.4,
          "radialLife": 0.6,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  1
                ],
                [
                  0.9,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "plasma",
              "radiusAbsolute": 0.12,
              "color": "#ff7a2a",
              "blend": "add",
              "rotationScale": 2
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.08,
              "aspect": [
                1.6,
                0.3
              ],
              "rotationScale": 1,
              "color": "#ffe0a0",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ffa040",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0,
            0.4
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.7,
                  0.95
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.75,
                  0.4
                ],
                [
                  1,
                  0.55
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "radiusSpace": "width",
          "width": 9,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 5,
          "color": "#ff5a10",
          "strokeProfile": "halo",
          "core": 0,
          "time": [
            0.3,
            0.82
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  4.6
                ]
              ],
              "interpolation": "ease-out"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.5
                ],
                [
                  0.6,
                  0.3
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "radiusSpace": "width",
          "width": 2.4,
          "widthSpace": "pixel",
          "noise": 0.05,
          "noiseClock": 8,
          "color": "#ffd27a",
          "strokeProfile": "halo",
          "core": 0.4,
          "time": [
            0.3,
            0.82
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  4.6
                ]
              ],
              "interpolation": "ease-out"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  1
                ],
                [
                  0.6,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "radiusSpace": "width",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.12,
          "noiseClock": -6,
          "color": "#ff8a3a",
          "strokeProfile": "halo",
          "core": 0,
          "seedOffset": 7,
          "time": [
            0.33999999999999997,
            0.86
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  4.6
                ]
              ],
              "interpolation": "ease-out"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.7
                ],
                [
                  0.6,
                  0.4
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "radiusSpace": "width",
          "blend": "add",
          "stops": [
            [
              0,
              "#ff5a10",
              0
            ],
            [
              0.62,
              "#ff5a10",
              0
            ],
            [
              0.86,
              "#ff7a2a",
              0.38
            ],
            [
              0.95,
              "#ffc060",
              0.55
            ],
            [
              1,
              "#ff6a1a",
              0
            ]
          ],
          "time": [
            0.3,
            0.82
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.26
                ],
                [
                  1,
                  4.8
                ]
              ],
              "interpolation": "ease-out"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  1
                ],
                [
                  0.6,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "radiusSpace": "width",
          "blend": "add",
          "stops": [
            [
              0,
              "#ffb040",
              0
            ],
            [
              0.4,
              "#ff8a2a",
              0.12
            ],
            [
              0.8,
              "#ff6a1a",
              0.06
            ],
            [
              1,
              "#ff6a1a",
              0
            ]
          ],
          "time": [
            0.3,
            0.82
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  4.4
                ]
              ],
              "interpolation": "ease-out"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  1
                ],
                [
                  0.6,
                  0.5
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 40,
          "countScale": "none",
          "orbit": 1,
          "orbitSpace": "width",
          "orbitSize": 0.12,
          "angleSpeed": 0.15,
          "color": "#ff7a2a",
          "time": [
            0.3,
            0.82
          ],
          "curves": {
            "orbit": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  4.6
                ]
              ],
              "interpolation": "ease-out"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  1
                ],
                [
                  0.6,
                  0.7
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "plasma",
              "radiusAbsolute": 0.42,
              "color": "#ff6a1a",
              "blend": "add",
              "rotationScale": 1,
              "alphaScale": 0.85
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.2,
              "color": "#ffe0a0",
              "blend": "add",
              "alphaScale": 0.6,
              "variantOffset": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#fff0c8",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.3,
            0.6
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shake",
          "time": [
            0.3,
            0.42
          ],
          "holdEnd": true,
          "strength": [
            0.02,
            0.012
          ],
          "frequencyHz": [
            20,
            15
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.5,
            1
          ],
          "type": "particles",
          "motion": "rise",
          "count": 14,
          "phaseRate": [
            1.6,
            0.8
          ],
          "riseX": [
            0.05,
            0.95
          ],
          "riseY": [
            0.95,
            -0.2
          ],
          "sway": 0.02,
          "swayFrequency": 8,
          "size": 0.09,
          "sizeSize": 0.06,
          "sizePhase": -0.05,
          "color": "#ffc040",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  1
                ],
                [
                  0.6,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "plasma",
              "color": "#ffa020",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff0b0",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.5,
            1
          ],
          "type": "ring",
          "geometry": "superellipse",
          "pad": 0.04,
          "radius": 1,
          "width": 2.6,
          "widthSpace": "pixel",
          "noise": 0.04,
          "color": "#ffc860",
          "strokeProfile": "halo",
          "core": 0.5,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  1
                ],
                [
                  0.5,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.5,
            0.85
          ],
          "type": "glow",
          "color": "#ff4a10",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.95
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  1,
                  0.55
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.5,
            0.75
          ],
          "type": "glow",
          "color": "#fff4d8",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.95
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  1,
                  0.25
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.5,
            1
          ],
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 16,
          "sizeRange": [
            0.01,
            0.022
          ],
          "speed": [
            0.6,
            1.2
          ],
          "drag": 2.5,
          "gravity": [
            0,
            -0.4
          ],
          "lifeMs": [
            300,
            550
          ],
          "delayMs": [
            0,
            40
          ],
          "texture": "glow",
          "color": "#ffb060",
          "emissionArc": [
            0,
            6.283
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.5,
            0.8
          ],
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.55
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "shake",
          "time": [
            0.5,
            0.64
          ],
          "holdEnd": true,
          "strength": [
            0.018,
            0.008
          ],
          "frequencyHz": [
            22,
            16
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "siren-wave",
      "label": "サイレンの波 · C011",
      "sourceCode": "C011",
      "ms": 1200,
      "color": "#8fe8f0",
      "light": "#f2fdff",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5fd2e8",
          "texture": "glow",
          "blend": "add",
          "radius": 0.3,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.6
                ],
                [
                  0.25,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 1,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#d8fbff",
          "width": 1.6,
          "widthSpace": "pixel",
          "noise": 0.03,
          "noiseClock": 10,
          "strokeProfile": "halo",
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.95
                ],
                [
                  0.7,
                  0.76
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.423
                ],
                [
                  1,
                  0.47
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 2,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#a8f0ff",
          "width": 1.1,
          "widthSpace": "pixel",
          "noise": 0.03,
          "noiseClock": 10,
          "strokeProfile": "halo",
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.7
                ],
                [
                  0.7,
                  0.5599999999999999
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.387
                ],
                [
                  1,
                  0.43
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 3,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#d8fbff",
          "width": 1.4,
          "widthSpace": "pixel",
          "noise": 0.03,
          "noiseClock": 10,
          "strokeProfile": "halo",
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.55
                ],
                [
                  0.7,
                  0.44000000000000006
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.34650000000000003
                ],
                [
                  1,
                  0.385
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 4,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#a8f0ff",
          "width": 0.9,
          "widthSpace": "pixel",
          "noise": 0.03,
          "noiseClock": 10,
          "strokeProfile": "halo",
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.42
                ],
                [
                  0.7,
                  0.336
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.30600000000000005
                ],
                [
                  1,
                  0.34
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 5,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#d8fbff",
          "width": 1.1,
          "widthSpace": "pixel",
          "noise": 0.03,
          "noiseClock": 10,
          "strokeProfile": "halo",
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.32
                ],
                [
                  0.7,
                  0.256
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.261
                ],
                [
                  1,
                  0.29
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 6,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#a8f0ff",
          "width": 0.8,
          "widthSpace": "pixel",
          "noise": 0.03,
          "noiseClock": 10,
          "strokeProfile": "halo",
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.22
                ],
                [
                  0.7,
                  0.17600000000000002
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.216
                ],
                [
                  1,
                  0.24
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 9,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#7fe6f8",
          "width": 1.3,
          "widthSpace": "pixel",
          "noise": 0.09,
          "noiseClock": -7,
          "noiseProfile": "value",
          "count": 256,
          "strokeProfile": "halo",
          "core": 0,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.55
                ],
                [
                  0.7,
                  0.4
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 21,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#7fe6f8",
          "width": 1.1,
          "widthSpace": "pixel",
          "noise": 0.11,
          "noiseClock": 8,
          "noiseProfile": "value",
          "count": 256,
          "strokeProfile": "halo",
          "core": 0,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.4
                ],
                [
                  0.7,
                  0.3
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  0.35
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 14,
          "countScale": "none",
          "orbit": 0.2,
          "orbitSize": 0.22,
          "angleSpeed": 0.25,
          "angularSpread": 0.4,
          "sizeRange": [
            0.012,
            0.012
          ],
          "sizeSize": 0.014,
          "color": "#f4ecc8",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.6
                ],
                [
                  0.7,
                  0.45
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "plasma-soft",
              "color": "#e8f4e0",
              "blend": "add",
              "alphaScale": 0.7
            },
            {
              "texture": "glow",
              "radiusScale": 0.5,
              "color": "#ffffff",
              "blend": "add",
              "alphaScale": 0.6
            }
          ]
        }
      ]
    },
    {
      "name": "medusa-gaze",
      "label": "魔眼の放電 · C017",
      "sourceCode": "C017",
      "ms": 1200,
      "color": "#ff7ab8",
      "light": "#fff0f6",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#b03a88",
          "texture": "glow",
          "blend": "add",
          "radius": 0.85,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.05,
                  0.6
                ],
                [
                  0.16,
                  0.8
                ],
                [
                  0.45,
                  0.2
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffd6ec",
          "texture": "glow",
          "blend": "add",
          "radius": 0.75,
          "aspect": [
            1,
            0.3
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  1
                ],
                [
                  0.16,
                  1
                ],
                [
                  0.22,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#c8ff7a",
          "texture": "plasma",
          "blend": "add",
          "radius": 0.22,
          "aspect": [
            1,
            1
          ],
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  1
                ],
                [
                  0.16,
                  1
                ],
                [
                  0.22,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "ice-shard",
          "color": "#1a0614",
          "light": "#3a0e2a",
          "shadow": "#000000",
          "radius": 0.2,
          "scaleX": 0.22,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  1
                ],
                [
                  0.16,
                  1
                ],
                [
                  0.22,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "scaleY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.07,
                  1
                ],
                [
                  0.14,
                  1.05
                ],
                [
                  0.19,
                  0.15
                ],
                [
                  0.3,
                  0.02
                ],
                [
                  1,
                  0.02
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.16,
            0.5
          ],
          "clockSpace": "life",
          "batch": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff6ab0",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "time": [
            0.16,
            0.7
          ],
          "clockSpace": "life",
          "batch": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.5
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "crack-rays",
          "blend": "add",
          "time": [
            0.16,
            0.62
          ],
          "clockSpace": "life",
          "batch": 1,
          "color": "#ff5aa8",
          "stroke": 0.05,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.3,
                  0.7
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.45
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "crack-rays",
          "blend": "add",
          "time": [
            0.16,
            0.62
          ],
          "clockSpace": "life",
          "batch": 1,
          "color": "#fff4fa",
          "stroke": 0.014,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.45
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "crack-rays",
          "blend": "add",
          "time": [
            0.19,
            0.6
          ],
          "clockSpace": "life",
          "batch": 1,
          "color": "#ff8ac8",
          "stroke": 0.03,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.32
                ],
                [
                  1,
                  0.66
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  2.1
                ],
                [
                  1,
                  2.1
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "crack-rays",
          "blend": "add",
          "time": [
            0.19,
            0.6
          ],
          "clockSpace": "life",
          "batch": 1,
          "color": "#ffffff",
          "stroke": 0.01,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.32
                ],
                [
                  1,
                  0.66
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  2.1
                ],
                [
                  1,
                  2.1
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 10,
          "sizeRange": [
            0.12,
            0.2
          ],
          "speed": [
            0.15,
            0.45
          ],
          "drag": 2,
          "lifeMs": [
            500,
            800
          ],
          "delayMs": [
            0,
            80
          ],
          "texture": "smoke",
          "color": "#8a8090",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.16,
            1
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 22,
          "sizeRange": [
            0.04,
            0.07
          ],
          "speed": [
            0.5,
            1.2
          ],
          "drag": 2.5,
          "gravity": [
            0,
            1.4
          ],
          "lifeMs": [
            450,
            800
          ],
          "delayMs": [
            0,
            60
          ],
          "shape": "ice-shard",
          "color": "#ff8ac0",
          "light": "#ffe0f0",
          "shadow": "#a02a68",
          "spin": [
            -8,
            8
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.16,
            1
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.7,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffc0e0",
          "count": 30,
          "vortex": 0.4,
          "radius": 0.9,
          "time": [
            0.16,
            1
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.16,
            0.75
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "filterOrder": [
            "grayscale",
            "brightness"
          ],
          "curves": {
            "grayscale": {
              "keys": [
                [
                  0,
                  0.85
                ],
                [
                  0.4,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1.5
                ],
                [
                  0.2,
                  0.9
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shake",
          "time": [
            0.16,
            0.38
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "strength": [
            0.03,
            0.015
          ],
          "frequencyHz": [
            21,
            15
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "centaur-missile",
      "label": "ケンタウロスの弾 · C019_1",
      "sourceCode": "C019_1",
      "ms": 672,
      "color": "#5ab8ff",
      "light": "#eaf8ff",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 672,
        "cueMs": 408
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2a7cff",
          "texture": "plasma-soft",
          "blend": "add",
          "aspect": [
            0.3,
            1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  0.75
                ],
                [
                  1,
                  0.75
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.048
                ],
                [
                  0.15,
                  0.29400000000000004
                ],
                [
                  0.35,
                  0.6219999999999999
                ],
                [
                  0.6,
                  1.008
                ],
                [
                  1,
                  1.28
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.048
                ],
                [
                  0.15,
                  0.192
                ],
                [
                  0.35,
                  0.38399999999999995
                ],
                [
                  0.6,
                  0.6
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#6fc8ff",
          "texture": "glow",
          "blend": "add",
          "aspect": [
            0.11,
            1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  0.9
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.052000000000000005
                ],
                [
                  0.15,
                  0.31000000000000005
                ],
                [
                  0.35,
                  0.6539999999999999
                ],
                [
                  0.6,
                  1.058
                ],
                [
                  1,
                  1.33
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.052000000000000005
                ],
                [
                  0.15,
                  0.20800000000000002
                ],
                [
                  0.35,
                  0.4159999999999999
                ],
                [
                  0.6,
                  0.65
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "aspect": [
            0.05,
            1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  0.8
                ],
                [
                  1,
                  0.8
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.036000000000000004
                ],
                [
                  0.15,
                  0.24600000000000002
                ],
                [
                  0.35,
                  0.526
                ],
                [
                  0.6,
                  0.8580000000000001
                ],
                [
                  1,
                  1.1300000000000001
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.036000000000000004
                ],
                [
                  0.15,
                  0.14400000000000002
                ],
                [
                  0.35,
                  0.288
                ],
                [
                  0.6,
                  0.45
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#3f9cff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.38,
          "aspect": [
            0.55,
            1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  0.85
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.34
                ],
                [
                  1,
                  0.34
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "arrow",
          "color": "#9fdcff",
          "light": "#ffffff",
          "shadow": "#2a6ad0",
          "blend": "add",
          "radius": 0.34,
          "aspect": [
            1,
            2.4
          ],
          "rotation": -1.5708,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.34
                ],
                [
                  1,
                  0.34
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "arrow",
          "color": "#ffffff",
          "blend": "add",
          "radius": 0.28900000000000003,
          "aspect": [
            1,
            1
          ],
          "rotation": -1.5708,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  0.9
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.37
                ],
                [
                  1,
                  0.31000000000000005
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#e8f8ff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.28,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.68
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.36,
          "aspect": [
            1,
            0.06
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.04,
                  0.9
                ],
                [
                  0.3,
                  0.5
                ],
                [
                  0.55,
                  0.95
                ],
                [
                  0.8,
                  0.5
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.68
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        }
      ]
    },
    {
      "name": "centaur-impact",
      "label": "ケンタウロス着弾 · C019_2",
      "sourceCode": "C019_2",
      "ms": 1200,
      "color": "#5ab8ff",
      "light": "#eaf8ff",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2a86ff",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.472
                ],
                [
                  1,
                  0.945
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#7fd0ff",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.95
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.162
                ],
                [
                  1,
                  0.567
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0,
            0.45
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.567
                ],
                [
                  1,
                  0.243
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "flare",
          "color": "#9fdcff",
          "blend": "add",
          "time": [
            0,
            0.4
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.162
                ],
                [
                  1,
                  0.486
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#c8eeff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.12,
          "strokeProfile": "halo",
          "time": [
            0,
            0.6
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.108
                ],
                [
                  1,
                  0.621
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4
                ],
                [
                  1,
                  1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 7,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#5ab8ff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.2,
          "strokeProfile": "halo",
          "time": [
            0.05,
            0.75
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.7
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.081
                ],
                [
                  1,
                  0.459
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  3
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 14,
          "sizeRange": [
            0.02,
            0.04
          ],
          "speed": [
            0.5,
            1.1
          ],
          "drag": 3,
          "lifeMs": [
            300,
            600
          ],
          "delayMs": [
            0,
            40
          ],
          "shape": "ice-shard",
          "color": "#9fdcff",
          "light": "#ffffff",
          "shadow": "#2a6ad0",
          "spin": [
            -6,
            6
          ],
          "directionSpace": "radial",
          "emissionArc": [
            0,
            6.283
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8f2ff",
          "count": 26,
          "vortex": 0.4,
          "radius": 0.75,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0.7
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0,
            0.3
          ],
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.45
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "flame-sweep",
      "label": "炎の薙ぎ払い · C043",
      "sourceCode": "C043",
      "ms": 1050,
      "color": "#ff6a12",
      "light": "#fff3b0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 105,
        "cueMs": 105
      },
      "layers": [
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 3,
          "intrinsicAlpha": true,
          "motion": "fan-flow",
          "countScale": "round",
          "fanDirection": 0,
          "reachLength": 0.5,
          "reachSpace": "width",
          "angularExponent": 0.6,
          "flowPower": 0.85,
          "frontPad": 0.01,
          "noiseType": "fractal",
          "noisePhase": [
            4,
            0
          ],
          "noiseIndex": [
            0.37,
            0
          ],
          "noiseTime": [
            0,
            3
          ],
          "flickerBias": 0.75,
          "flickerNoise": 0.25,
          "flickerIndex": 1.7,
          "flickerRate": 11,
          "time": [
            0,
            1
          ],
          "batch": 0,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  1
                ],
                [
                  0.72,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth",
              "domain": "effect"
            },
            "frontProgress": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.22,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "smooth",
                "linear"
              ],
              "domain": "effect"
            }
          },
          "count": 26,
          "moteOffset": 400,
          "lifetime": [
            0.34,
            0.22
          ],
          "fanHalfArc": 0.11,
          "sway": 0.012,
          "swayPhase": 0.02,
          "size": 0.012,
          "sizePhase": 0.05,
          "radiusMultiplier": 1,
          "sizeMoteScale": 0.5,
          "materials": [
            {
              "texture": "smoke",
              "color": "#2b1a12",
              "radiusScale": 1.3,
              "alphaCurve": {
                "keys": [
                  [
                    0,
                    0
                  ],
                  [
                    0.35,
                    0.42
                  ],
                  [
                    1,
                    0
                  ]
                ],
                "interpolation": "linear"
              },
              "alphaDomain": "phase",
              "aspect": [
                1,
                1.1
              ]
            }
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "fan-flow",
          "countScale": "round",
          "fanDirection": 0,
          "reachLength": 0.5,
          "reachSpace": "width",
          "angularExponent": 0.6,
          "flowPower": 0.85,
          "frontPad": 0.01,
          "noiseType": "fractal",
          "noisePhase": [
            4,
            0
          ],
          "noiseIndex": [
            0.37,
            0
          ],
          "noiseTime": [
            0,
            3
          ],
          "flickerBias": 0.75,
          "flickerNoise": 0.25,
          "flickerIndex": 1.7,
          "flickerRate": 11,
          "time": [
            0,
            1
          ],
          "batch": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  1
                ],
                [
                  0.72,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth",
              "domain": "effect"
            },
            "frontProgress": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.22,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "smooth",
                "linear"
              ],
              "domain": "effect"
            }
          },
          "count": 110,
          "lifetime": [
            0.22,
            0.14
          ],
          "fanHalfArc": 0.07,
          "sway": 0.006,
          "swayPhase": 0.02,
          "size": 0.016,
          "sizePhase": 0.048,
          "radiusMultiplier": 1,
          "sizeMoteScale": 0.6,
          "materials": [
            {
              "texture": "plasma",
              "palette": [
                [
                  0,
                  "#fff6c8"
                ],
                [
                  0.14,
                  "#ffd15a"
                ],
                [
                  0.38,
                  "#ff8a1e"
                ],
                [
                  0.7,
                  "#e0400c"
                ]
              ],
              "colorInterpolation": "step",
              "radiusCurve": {
                "keys": [
                  [
                    0,
                    0.8
                  ],
                  [
                    1,
                    1.15
                  ]
                ],
                "interpolation": "linear"
              },
              "alphaCurve": {
                "keys": [
                  [
                    0,
                    0.95
                  ],
                  [
                    0.6,
                    0.6
                  ],
                  [
                    1,
                    0
                  ]
                ],
                "interpolation": "power-out",
                "exponent": 1.2
              },
              "alphaDomain": "phase",
              "rotationScale": 1.4
            },
            {
              "texture": "plasma-soft",
              "color": "#fff8d0",
              "radiusScale": 0.5,
              "phaseRange": [
                0,
                0.4
              ],
              "alphaCurve": {
                "keys": [
                  [
                    0,
                    0.7
                  ],
                  [
                    0.4,
                    0
                  ],
                  [
                    1,
                    0
                  ]
                ],
                "interpolation": "linear"
              },
              "alphaDomain": "phase",
              "rotationScale": -1,
              "variantOffset": 1
            }
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 11,
          "intrinsicAlpha": true,
          "motion": "fan-flow",
          "countScale": "round",
          "fanDirection": 0,
          "reachLength": 0.5,
          "reachSpace": "width",
          "angularExponent": 0.3,
          "flowPower": 1,
          "frontPad": 0.01,
          "noiseType": "fractal",
          "noisePhase": [
            4,
            0
          ],
          "noiseIndex": [
            0.37,
            0
          ],
          "noiseTime": [
            0,
            3
          ],
          "flickerBias": 0.75,
          "flickerNoise": 0.25,
          "flickerIndex": 1.7,
          "flickerRate": 11,
          "time": [
            0,
            1
          ],
          "batch": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  1
                ],
                [
                  0.72,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth",
              "domain": "effect"
            },
            "frontProgress": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.22,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "smooth",
                "linear"
              ],
              "domain": "effect"
            }
          },
          "count": 36,
          "moteOffset": 1500,
          "lifetime": [
            0.16,
            0.08
          ],
          "fanHalfArc": 0.025,
          "sway": 0.003,
          "swayPhase": 0.006,
          "size": 0.01,
          "sizePhase": 0.016,
          "radiusMultiplier": 1,
          "sizeMoteScale": 0.4,
          "materials": [
            {
              "texture": "plasma-soft",
              "palette": [
                [
                  0,
                  "#ffffff"
                ],
                [
                  0.3,
                  "#fff2a8"
                ],
                [
                  0.7,
                  "#ffc04a"
                ]
              ],
              "colorInterpolation": "step",
              "alphaCurve": {
                "keys": [
                  [
                    0,
                    0.9
                  ],
                  [
                    0.7,
                    0.55
                  ],
                  [
                    1,
                    0
                  ]
                ],
                "interpolation": "linear"
              },
              "alphaDomain": "phase",
              "rotationScale": 0.8
            }
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 7,
          "intrinsicAlpha": true,
          "motion": "fan-flow",
          "countScale": "round",
          "fanDirection": 0,
          "reachLength": 0.5,
          "reachSpace": "width",
          "angularExponent": 0,
          "flowPower": 0.75,
          "frontPad": 0.01,
          "noiseType": "fractal",
          "noisePhase": [
            4,
            0
          ],
          "noiseIndex": [
            0.37,
            0
          ],
          "noiseTime": [
            0,
            3
          ],
          "flickerBias": 0.75,
          "flickerNoise": 0.25,
          "flickerIndex": 1.7,
          "flickerRate": 11,
          "time": [
            0,
            1
          ],
          "batch": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  1
                ],
                [
                  0.72,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth",
              "domain": "effect"
            },
            "frontProgress": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.22,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "smooth",
                "linear"
              ],
              "domain": "effect"
            }
          },
          "count": 24,
          "moteOffset": 900,
          "lifetime": [
            0.26,
            0.16
          ],
          "fanHalfArc": 0.16,
          "sway": 0.01,
          "swayPhase": 0.03,
          "size": 0.0022,
          "sizePhase": 0,
          "sizeSize": 0.002,
          "radiusMultiplier": 1,
          "sizeMoteScale": 0,
          "materials": [
            {
              "texture": "glow",
              "palette": [
                [
                  0,
                  "#fff1b0"
                ],
                [
                  0.5,
                  "#ff9a2a"
                ]
              ],
              "colorInterpolation": "step",
              "alphaCurve": {
                "keys": [
                  [
                    0,
                    0.95
                  ],
                  [
                    1,
                    0
                  ]
                ],
                "interpolation": "linear"
              },
              "alphaDomain": "phase",
              "rotationScale": 0,
              "variant": 0
            }
          ]
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#ffb23a",
          "texture": "plasma",
          "variant": 1,
          "blend": "add",
          "batch": 3,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.85
                ],
                [
                  0.7,
                  0.7
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.016
                ],
                [
                  0.1,
                  0.045
                ],
                [
                  1,
                  0.036
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#fff4c0",
          "texture": "glow",
          "blend": "add",
          "batch": 3,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.9
                ],
                [
                  0.7,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.01
                ],
                [
                  0.1,
                  0.026
                ],
                [
                  1,
                  0.02
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        }
      ]
    },
    {
      "name": "steal-mark",
      "label": "奪うの印 · C090",
      "sourceCode": "C090",
      "ms": 1200,
      "color": "#ff5c9e",
      "light": "#ffe0ee",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#d02a78",
          "texture": "glow",
          "blend": "add",
          "radius": 0.95,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.5
                ],
                [
                  0.55,
                  0.45
                ],
                [
                  0.8,
                  0.2
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 9,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.34,
          "orbitSize": 0.1,
          "angleSpeed": 1.1,
          "color": "#5a1a4a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.45
                ],
                [
                  0.55,
                  0.405
                ],
                [
                  0.8,
                  0.18000000000000002
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  0.3,
                  0.36
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.3,
              "blend": "normal",
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "moteOffset": 20,
          "orbit": 0.3,
          "orbitSize": 0.12,
          "angleSpeed": 1.5,
          "color": "#ff4f98",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.6
                ],
                [
                  0.55,
                  0.54
                ],
                [
                  0.8,
                  0.24
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.5
                ],
                [
                  0.3,
                  0.3
                ],
                [
                  1,
                  0.26
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.26,
              "blend": "add",
              "rotationScale": -1,
              "variantOffset": 1
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.12,
              "blend": "add",
              "color": "#ff9cc8",
              "alphaScale": 0.6
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff7ab4",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.42,
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.65
                ],
                [
                  0.55,
                  0.5850000000000001
                ],
                [
                  0.8,
                  0.26
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff5aa0",
          "texture": "glow",
          "blend": "add",
          "radius": 0.38,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.8
                ],
                [
                  0.55,
                  0.7200000000000001
                ],
                [
                  0.8,
                  0.32000000000000006
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.22799999999999998
                ],
                [
                  0.2,
                  0.38
                ],
                [
                  0.27,
                  0.323
                ],
                [
                  0.34,
                  0.42560000000000003
                ],
                [
                  0.44,
                  0.3496
                ],
                [
                  0.6,
                  0.38
                ],
                [
                  1,
                  0.399
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "heart",
          "color": "#ff6aa8",
          "light": "#ffe4f0",
          "shadow": "#c02868",
          "radius": 0.17,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0
                ],
                [
                  0.22,
                  1
                ],
                [
                  0.6,
                  0.95
                ],
                [
                  0.85,
                  0.4
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.10200000000000001
                ],
                [
                  0.2,
                  0.17
                ],
                [
                  0.27,
                  0.14450000000000002
                ],
                [
                  0.34,
                  0.19040000000000004
                ],
                [
                  0.44,
                  0.1564
                ],
                [
                  0.6,
                  0.17
                ],
                [
                  1,
                  0.17850000000000002
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "heart",
          "color": "#ffd0e4",
          "blend": "add",
          "radius": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2,
                  0
                ],
                [
                  0.24,
                  0.8
                ],
                [
                  0.34,
                  0.1
                ],
                [
                  0.36,
                  0.7
                ],
                [
                  0.5,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.17
                ],
                [
                  0.24,
                  0.2
                ],
                [
                  0.34,
                  0.26
                ],
                [
                  0.36,
                  0.2
                ],
                [
                  0.5,
                  0.3
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 6,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.5,
          "angleSpeed": 0.8,
          "color": "#ff8cbc",
          "light": "#ffe8f2",
          "shadow": "#c83a78",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.9
                ],
                [
                  0.35,
                  0.9
                ],
                [
                  0.45,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.65
                ],
                [
                  0.42,
                  0.2
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.5
            }
          },
          "materials": [
            {
              "shape": "heart",
              "radiusAbsolute": 0.06,
              "blend": "normal",
              "rotationScale": 0
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.1,
              "color": "#ff7ab4",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 12,
          "emission": "circle",
          "extent": [
            0.3,
            0.25
          ],
          "sizeRange": [
            0.035,
            0.07
          ],
          "speed": [
            0.12,
            0.3
          ],
          "direction": [
            -1.9,
            -1.25
          ],
          "gravity": [
            0,
            -0.25
          ],
          "lifeMs": [
            550,
            850
          ],
          "delayMs": [
            150,
            600
          ],
          "shape": "heart",
          "color": "#ff7ab0",
          "light": "#ffe6f0",
          "shadow": "#c03070",
          "particleRotation": [
            -0.3,
            0.3
          ],
          "spin": [
            -0.6,
            0.6
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  1
                ],
                [
                  0.7,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffd27a",
          "count": 18,
          "vortex": 0.6,
          "radius": 0.7,
          "afterglow": false,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.8
                ],
                [
                  0.55,
                  0.7200000000000001
                ],
                [
                  0.8,
                  0.32000000000000006
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.2,
            0.5
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.3
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "fire-arrow",
      "label": "炎の矢 · E058_1",
      "sourceCode": "E058_1",
      "ms": 672,
      "color": "#cf6945",
      "light": "#f2d596",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 672,
        "cueMs": 672
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d97841",
          "radius": 0.16,
          "blend": "add",
          "stops": [
            [
              0,
              "#f2cb87",
              1
            ],
            [
              0.35,
              "#d97841",
              0.95
            ],
            [
              0.7,
              "#d97841",
              0.55
            ],
            [
              1,
              "#d97841",
              0
            ]
          ],
          "aspect": [
            0.9,
            1.3
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.9
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d86c39",
          "texture": "plasma-soft",
          "radius": 0.19,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.8525
                ],
                [
                  1,
                  0.8525
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "aspect": [
            0.85,
            1.6
          ]
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#efd49e",
          "texture": "glow",
          "radius": 0.075,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.793
                ],
                [
                  1,
                  0.793
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#efac66",
          "points": [
            [
              0,
              0.02
            ],
            [
              -0.13,
              0.18
            ],
            [
              -0.18,
              0.66
            ]
          ],
          "width": 0.058,
          "noise": 0.025,
          "segments": 40,
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.897
                ],
                [
                  1,
                  0.897
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "taper": {
            "keys": [
              [
                0,
                0.7
              ],
              [
                0.12,
                1
              ],
              [
                0.6,
                0.55
              ],
              [
                1,
                0
              ]
            ],
            "interpolation": "smooth"
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d66a58",
          "points": [
            [
              0,
              0.01
            ],
            [
              0.12,
              0.26
            ],
            [
              0.09,
              0.78
            ]
          ],
          "width": 0.043,
          "noise": 0.025,
          "segments": 40,
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.78242
                ],
                [
                  1,
                  0.78242
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "taper": {
            "keys": [
              [
                0,
                0.7
              ],
              [
                0.12,
                1
              ],
              [
                0.6,
                0.55
              ],
              [
                1,
                0
              ]
            ],
            "interpolation": "smooth"
          }
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "line-motes",
          "points": [
            [
              0,
              0.04
            ],
            [
              0,
              0.6
            ]
          ],
          "count": 14,
          "color": "#d99460",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.38
                ],
                [
                  1,
                  0.38
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "spreadDistance": 0.025,
          "materials": [
            {
              "texture": "plasma-soft",
              "radius": 0.019,
              "radiusVelocity": 0.025,
              "aspect": [
                0.75,
                1.4
              ],
              "alphaScale": 0.7
            }
          ]
        }
      ]
    },
    {
      "name": "fire-arrow-impact",
      "label": "炎の矢着弾 · E058_2",
      "sourceCode": "E058_2",
      "ms": 1200,
      "color": "#c96745",
      "light": "#ffe1a0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#b76859",
          "radius": 0.92,
          "blend": "add",
          "stops": [
            [
              0,
              "#e6b574",
              0.8
            ],
            [
              0.28,
              "#b76859",
              0.7
            ],
            [
              0.65,
              "#b76859",
              0.35
            ],
            [
              1,
              "#b76859",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.7014
                ],
                [
                  0.125,
                  0.4509
                ],
                [
                  0.25,
                  0.0835
                ],
                [
                  0.5,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c96745",
          "texture": "plasma-soft",
          "radius": 0.85,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.84
                ],
                [
                  0.125,
                  0.532
                ],
                [
                  0.25,
                  0.126
                ],
                [
                  0.5,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ffe1a0",
          "texture": "glow",
          "radius": 0.28,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.84
                ],
                [
                  0.125,
                  0.532
                ],
                [
                  0.25,
                  0.126
                ],
                [
                  0.5,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c96745",
          "radius": 0.45,
          "width": 0.014,
          "strokeProfile": "halo",
          "core": 0.32,
          "noise": 0.025,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.35
                ],
                [
                  0.06,
                  0.5
                ],
                [
                  0.28,
                  0.2
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.08
                ],
                [
                  0.3,
                  0.55
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#c96745",
          "count": 24,
          "radius": 0.7,
          "afterglow": false,
          "glint": false,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.35
                ],
                [
                  0.06,
                  0.5
                ],
                [
                  0.28,
                  0.2
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "shape": "star",
          "color": "#e39763",
          "radius": 0.66,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.87
                ],
                [
                  0.125,
                  0.551
                ],
                [
                  0.25,
                  0.1305
                ],
                [
                  0.5,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.22
                ],
                [
                  1,
                  0.34
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "death-mark",
      "label": "即死の印 · K001",
      "sourceCode": "K001",
      "ms": 1200,
      "color": "#9456b2",
      "light": "#dfb2e2",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "fog",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "mode": "cloud",
          "color": "#693e88",
          "texture": "smoke",
          "count": 16,
          "radius": 0.62,
          "extent": [
            0.7,
            0.86
          ],
          "flow": [
            0.008,
            -0.04
          ],
          "noise": 0.13,
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  0.125,
                  0.85
                ],
                [
                  0.25,
                  0.64
                ],
                [
                  0.5,
                  0.3
                ],
                [
                  0.75,
                  0.04
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "rim": 0.4
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#9b43b9",
          "radius": 1.52,
          "blend": "add",
          "stops": [
            [
              0,
              "#bc74c5",
              0.8
            ],
            [
              0.28,
              "#9b43b9",
              0.82
            ],
            [
              0.65,
              "#9b43b9",
              0.42
            ],
            [
              1,
              "#9b43b9",
              0
            ]
          ],
          "aspect": [
            1.05,
            1.28
          ],
          "offset": [
            0,
            -0.38
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.136
                ],
                [
                  0.125,
                  0.646
                ],
                [
                  0.25,
                  0.476
                ],
                [
                  0.5,
                  0.119
                ],
                [
                  0.75,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "fog",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#b274cb",
          "mode": "cloud",
          "texture": "plasma-soft",
          "count": 8,
          "radius": 0.45,
          "extent": [
            0.69,
            0.86
          ],
          "rim": 0.48,
          "flow": [
            0.008,
            -0.04
          ],
          "noise": 0.13,
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.09
                ],
                [
                  0.125,
                  0.4
                ],
                [
                  0.25,
                  0.28
                ],
                [
                  0.5,
                  0.09
                ],
                [
                  0.75,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#b18abf",
          "count": 28,
          "radius": 0.43,
          "afterglow": false,
          "glint": false,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.5,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#a466c5",
          "texture": "plasma-soft",
          "radius": 1.18,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  0.125,
                  0.52
                ],
                [
                  0.25,
                  0.3
                ],
                [
                  0.5,
                  0.08
                ],
                [
                  0.75,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "aspect": [
            1,
            1.35
          ]
        }
      ]
    },
    {
      "name": "fang-poison",
      "label": "毒牙の付与 · K003",
      "sourceCode": "K003",
      "ms": 1200,
      "color": "#7ad02a",
      "light": "#e2ffb0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#3c9a14",
          "texture": "glow",
          "blend": "add",
          "radius": 0.95,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  1,
                  0.55
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2f6e12",
          "texture": "smoke",
          "radius": 0.85,
          "blend": "normal",
          "aspect": [
            1,
            1.1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.5,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2f6e12",
          "texture": "smoke",
          "radius": 0.85,
          "blend": "normal",
          "variant": 1,
          "aspect": [
            1,
            1.1
          ],
          "time": [
            0,
            0.5
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2f6e12",
          "texture": "smoke",
          "radius": 0.85,
          "blend": "normal",
          "variant": 1,
          "aspect": [
            1,
            1.1
          ],
          "time": [
            0.5,
            1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.25
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5aa81e",
          "texture": "smoke",
          "radius": 0.7,
          "blend": "add",
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.5,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5aa81e",
          "texture": "smoke",
          "radius": 0.7,
          "blend": "add",
          "variant": 3,
          "time": [
            0,
            0.5
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5aa81e",
          "texture": "smoke",
          "radius": 0.7,
          "blend": "add",
          "variant": 3,
          "time": [
            0.5,
            1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.8
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.25
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#9ae03a",
          "texture": "plasma-soft",
          "radius": 0.55,
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.5,
                  0.75
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#9ae03a",
          "texture": "plasma-soft",
          "radius": 0.55,
          "blend": "add",
          "variant": 2,
          "time": [
            0,
            0.5
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.75
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#9ae03a",
          "texture": "plasma-soft",
          "radius": 0.55,
          "blend": "add",
          "variant": 2,
          "time": [
            0.5,
            1
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.75
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.25
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "rise",
          "count": 11,
          "phaseRate": [
            1,
            0
          ],
          "riseX": [
            0.22,
            0.78
          ],
          "riseY": [
            0.78,
            0.18
          ],
          "sway": 0.03,
          "swayFrequency": 9,
          "size": 0.08,
          "sizeSize": 0.07,
          "sizePhase": 0.03,
          "color": "#b8f060",
          "light": "#f0ffd0",
          "shadow": "#4a8a1a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.85
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "linear"
            }
          },
          "materials": [
            {
              "texture": "glow",
              "color": "#6ab82a",
              "blend": "add",
              "alphaScale": 0.6
            },
            {
              "texture": "plasma-soft",
              "color": "#c8f878",
              "radiusScale": 0.7,
              "blend": "add",
              "alphaScale": 0.8
            },
            {
              "texture": "glow",
              "radiusScale": 0.45,
              "offset": [
                -0.25,
                -0.25
              ],
              "color": "#ffffff",
              "blend": "add",
              "alphaScale": 0.8
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "rise",
          "count": 18,
          "moteOffset": 30,
          "phaseRate": [
            2,
            0
          ],
          "riseX": [
            0.15,
            0.85
          ],
          "riseY": [
            0.85,
            0.25
          ],
          "sway": 0.02,
          "swayFrequency": 13,
          "size": 0.035,
          "sizeSize": 0.03,
          "sizePhase": 0,
          "color": "#d8ff7a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "linear"
            }
          },
          "materials": [
            {
              "texture": "glow",
              "blend": "add"
            }
          ]
        }
      ]
    },
    {
      "name": "piercing-streak",
      "label": "貫通の軌跡 · K007",
      "sourceCode": "K007",
      "ms": 630,
      "color": "#74b1c9",
      "light": "#d4edf2",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 315,
        "cueMs": 315
      },
      "layers": [
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#72b4d1",
          "points": [
            [
              0,
              -0.4
            ],
            [
              0,
              0.5
            ],
            [
              0,
              1.5
            ]
          ],
          "width": 0.072,
          "noise": 0.026,
          "segments": 40,
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.5
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "taper": {
            "keys": [
              [
                0,
                0.7
              ],
              [
                0.12,
                1
              ],
              [
                0.6,
                0.55
              ],
              [
                1,
                0
              ]
            ],
            "interpolation": "smooth"
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c1e6ee",
          "texture": "glow",
          "radius": 0.11,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.52
                ],
                [
                  1,
                  0.52
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "line-motes",
          "points": [
            [
              0,
              0.06
            ],
            [
              0,
              1.35
            ]
          ],
          "count": 18,
          "color": "#73a5bd",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.43
                ],
                [
                  1,
                  0.43
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "spreadDistance": 0.036,
          "materials": [
            {
              "texture": "glow",
              "radius": 0.026,
              "radiusVelocity": 0,
              "aspect": [
                0.75,
                1.4
              ],
              "alphaScale": 0.7
            }
          ]
        }
      ]
    },
    {
      "name": "tri-streak",
      "label": "三方向の一閃 · K008",
      "sourceCode": "K008",
      "ms": 1200,
      "color": "#81b9cd",
      "light": "#d7eced",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#489bce",
          "radius": 0.25,
          "blend": "add",
          "stops": [
            [
              0,
              "#8ed7ee",
              0.8
            ],
            [
              0.28,
              "#489bce",
              0.7
            ],
            [
              0.65,
              "#489bce",
              0.35
            ],
            [
              1,
              "#489bce",
              0
            ]
          ],
          "aspect": [
            1,
            0.038
          ],
          "offset": [
            0.18,
            0
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.4
                ],
                [
                  0.375,
                  0.8
                ],
                [
                  0.6,
                  0.68
                ],
                [
                  0.875,
                  0.05
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#4b9ccd",
          "points": [
            [
              -0.05,
              -0.003
            ],
            [
              0.42,
              0.002
            ]
          ],
          "width": 0.0205,
          "noise": 0.022,
          "segments": 40,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.68
                ],
                [
                  0.7,
                  0.68
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "geometry": "filament",
          "strokeProfile": "ribbon",
          "filamentClockRate": 3.5
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#76b8dc",
          "points": [
            [
              -0.035,
              0.006
            ],
            [
              0.4,
              -0.004
            ]
          ],
          "width": 0.0135,
          "noise": 0.019,
          "segments": 40,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.442
                ],
                [
                  0.7,
                  0.442
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "geometry": "filament",
          "strokeProfile": "ribbon",
          "filamentClockRate": 2.2
        },
        {
          "type": "fog",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#459dcc",
          "mode": "cloud",
          "texture": "plasma-soft",
          "count": 16,
          "radius": 0.04,
          "extent": [
            0.22,
            0.026
          ],
          "offset": [
            0.18,
            0
          ],
          "flow": [
            0.29,
            0
          ],
          "noise": 0.006,
          "aspect": [
            1.9,
            0.7
          ],
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.897
                ],
                [
                  0.7,
                  0.897
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "contact-burst",
      "label": "全体命中の衝撃 · K009",
      "sourceCode": "K009",
      "ms": 1200,
      "color": "#a6b1b3",
      "light": "#e5e2d4",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#72766e",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.738
                ],
                [
                  0.25,
                  0.82
                ],
                [
                  0.375,
                  0.82
                ],
                [
                  0.5,
                  0.8036
                ],
                [
                  0.625,
                  0.6724
                ],
                [
                  0.75,
                  0.1312
                ],
                [
                  0.875,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.0226
                ],
                [
                  0.125,
                  0.5311
                ],
                [
                  0.25,
                  1.3334
                ],
                [
                  0.375,
                  1.5481
                ],
                [
                  0.625,
                  1.6385
                ],
                [
                  0.8,
                  1.695
                ],
                [
                  1,
                  1.7515
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.2
                ],
                [
                  1,
                  0.15
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "billow-cloud",
          "radius": 1.58,
          "light": "#a0a395",
          "shadow": "#424b43",
          "blend": "normal"
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#6b7068",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.34
                ],
                [
                  0.25,
                  0.59
                ],
                [
                  0.5,
                  0.56
                ],
                [
                  0.7,
                  0.08
                ],
                [
                  0.85,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.04
                ],
                [
                  0.25,
                  0.44
                ],
                [
                  0.5,
                  0.58
                ],
                [
                  0.75,
                  0.63
                ],
                [
                  1,
                  0.64
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "billow-cloud",
          "radius": 0.54,
          "light": "#969c8b",
          "shadow": "#475046",
          "blend": "normal",
          "offset": [
            -0.71,
            0.26
          ],
          "aspect": [
            1,
            0.8
          ]
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "radius": 0.632,
          "aspect": [
            1.03,
            1.02
          ],
          "blend": "normal",
          "copies": 3,
          "layout": "line",
          "spread": [
            0.24,
            0.16
          ],
          "offset": [
            -0.045,
            0.025
          ],
          "stops": [
            [
              0,
              "#92958a",
              1
            ],
            [
              0.28,
              "#82867b",
              0.98
            ],
            [
              0.64,
              "#626b60",
              0.78
            ],
            [
              1,
              "#4b554c",
              0
            ]
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.00904
                ],
                [
                  0.125,
                  0.21244
                ],
                [
                  0.25,
                  0.53336
                ],
                [
                  0.375,
                  0.61924
                ],
                [
                  0.625,
                  0.6554
                ],
                [
                  0.8,
                  0.678
                ],
                [
                  1,
                  0.7006
                ]
              ],
              "interpolation": "smooth"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.04
                ],
                [
                  0.25,
                  0.22
                ],
                [
                  0.375,
                  0.39
                ],
                [
                  0.5,
                  0.46
                ],
                [
                  0.625,
                  0.32
                ],
                [
                  0.75,
                  0.05
                ],
                [
                  0.875,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d5ddd6",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.252
                ],
                [
                  0.25,
                  0.672
                ],
                [
                  0.4,
                  0.672
                ],
                [
                  0.625,
                  0.42
                ],
                [
                  0.8,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.25,
                  1.18
                ],
                [
                  0.6,
                  1.56
                ],
                [
                  1,
                  1.65
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "motion": "orbit",
          "count": 6,
          "countScale": "none",
          "size": 0.12,
          "orbit": 1.2,
          "light": "#f8f7dd",
          "shadow": "#d5ddd6",
          "phaseDistribution": "mote",
          "materials": [
            {
              "shape": "flare",
              "blend": "normal"
            }
          ],
          "angleSpeed": 0.15,
          "aspect": [
            0.7,
            1.6
          ],
          "sizeSize": 0.08,
          "angularSpread": 0.06
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d0dad0",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  0.1,
                  0.85
                ],
                [
                  0.23,
                  0.4
                ],
                [
                  0.38,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.13,
          "blend": "normal",
          "stops": [
            [
              0,
              "#f2f1d5",
              1
            ],
            [
              0.45,
              "#f2f1d5",
              1
            ],
            [
              0.68,
              "#d0dad0",
              0.98
            ],
            [
              0.88,
              "#d0dad0",
              0.72
            ],
            [
              1,
              "#d0dad0",
              0
            ]
          ]
        }
      ]
    },
    {
      "name": "poison-tick",
      "label": "毒の被弾 · K017",
      "sourceCode": "K017",
      "ms": 1200,
      "color": "#7ad02a",
      "light": "#e2ffb0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#3c9a14",
          "texture": "glow",
          "blend": "add",
          "radius": 0.9,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.6
                ],
                [
                  0.5,
                  0.48
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2f6e12",
          "texture": "smoke",
          "radius": 0.8,
          "aspect": [
            1,
            1.15
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.95
                ],
                [
                  0.5,
                  0.76
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.32000000000000006
                ],
                [
                  0.25,
                  0.8
                ],
                [
                  1,
                  0.96
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5aa81e",
          "texture": "smoke",
          "blend": "add",
          "radius": 0.65,
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.75
                ],
                [
                  0.5,
                  0.6000000000000001
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.26
                ],
                [
                  0.25,
                  0.65
                ],
                [
                  1,
                  0.78
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  1,
                  -0.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#9ae03a",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.5,
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.8
                ],
                [
                  0.5,
                  0.6400000000000001
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  0.25,
                  0.5
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#e8ffb8",
          "texture": "glow",
          "blend": "add",
          "time": [
            0,
            0.45
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "rise",
          "count": 11,
          "phaseRate": [
            0.9,
            0.4
          ],
          "riseX": [
            0.22,
            0.78
          ],
          "riseY": [
            0.8,
            0.15
          ],
          "sway": 0.03,
          "swayFrequency": 9,
          "size": 0.08,
          "sizeSize": 0.07,
          "sizePhase": 0.03,
          "color": "#b8f060",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.9
                ],
                [
                  0.5,
                  0.7200000000000001
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "glow",
              "color": "#6ab82a",
              "blend": "add",
              "alphaScale": 0.6
            },
            {
              "texture": "plasma-soft",
              "color": "#c8f878",
              "radiusScale": 0.7,
              "blend": "add",
              "alphaScale": 0.8
            },
            {
              "texture": "glow",
              "radiusScale": 0.45,
              "offset": [
                -0.25,
                -0.25
              ],
              "color": "#ffffff",
              "blend": "add",
              "alphaScale": 0.8
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 16,
          "sizeRange": [
            0.025,
            0.05
          ],
          "speed": [
            0.5,
            1.1
          ],
          "drag": 2.5,
          "gravity": [
            0,
            1.2
          ],
          "lifeMs": [
            400,
            750
          ],
          "delayMs": [
            0,
            80
          ],
          "texture": "plasma-soft",
          "color": "#a8f048",
          "emissionArc": [
            0,
            6.283
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0,
            0.4
          ],
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.2,
                  1.25
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "shield-contact",
      "label": "結界の接触 · K018",
      "sourceCode": "K018",
      "ms": 1200,
      "color": "#78a2c4",
      "light": "#d3e8f0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42a9d4",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  0.125,
                  0.77
                ],
                [
                  0.25,
                  0.11
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.083,
          "blend": "normal",
          "stops": [
            [
              0,
              "#b0eafa",
              1
            ],
            [
              0.3,
              "#b0eafa",
              1
            ],
            [
              0.6,
              "#42a9d4",
              0.92
            ],
            [
              0.85,
              "#42a9d4",
              0.54
            ],
            [
              1,
              "#42a9d4",
              0
            ]
          ],
          "aspect": [
            1.25,
            0.62
          ],
          "offset": [
            0.095,
            -0.022
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#409ac8",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.04
                ],
                [
                  0.125,
                  0.27
                ],
                [
                  0.25,
                  0.05
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.125,
                  0.18
                ],
                [
                  0.25,
                  0.08
                ],
                [
                  1,
                  0.001
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "flare",
          "radius": 0.18,
          "light": "#81cbe2",
          "shadow": "#346987",
          "blend": "normal",
          "aspect": [
            1.2,
            0.9
          ],
          "offset": [
            0.095,
            -0.022
          ]
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              -0.8,
              -0.54
            ],
            [
              -0.415,
              -0.31
            ]
          ],
          "width": 0.036,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.036,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.007,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              0.35,
              -0.31
            ],
            [
              0.515,
              -0.45
            ]
          ],
          "width": 0.036,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.036,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.007,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              -0.72,
              0.345
            ],
            [
              -0.575,
              0.275
            ]
          ],
          "width": 0.036,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.036,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.007,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              0.5,
              0.175
            ],
            [
              0.635,
              0.225
            ]
          ],
          "width": 0.036,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.036,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.007,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              -0.278,
              0.635
            ],
            [
              -0.254,
              0.535
            ]
          ],
          "width": 0.027,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.027,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.005,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              -0.074,
              0.5
            ],
            [
              -0.061,
              0.407
            ]
          ],
          "width": 0.027,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.027,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.005,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              0.044,
              -0.49
            ],
            [
              0.044,
              -0.402
            ]
          ],
          "width": 0.027,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.027,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.005,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              -0.279,
              0.104
            ],
            [
              -0.205,
              0.061
            ]
          ],
          "width": 0.027,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.027,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.005,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#448db6",
          "geometry": "polyline",
          "pointSpace": "unit",
          "points": [
            [
              0.208,
              -0.142
            ],
            [
              0.272,
              -0.175
            ]
          ],
          "width": 0.027,
          "strokes": [
            {
              "color": "#448db6",
              "width": 0.027,
              "alpha": 0.44,
              "lineCap": "round"
            },
            {
              "color": "#9ddbed",
              "width": 0.005,
              "alpha": 0.66,
              "lineCap": "round"
            }
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.6
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.03
                ],
                [
                  0.4,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "seal-release",
      "label": "封印の解放 · K019",
      "sourceCode": "K019",
      "ms": 5250,
      "color": "#a46ac0",
      "light": "#e3bae4",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 2625,
        "cueMs": 2625
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#b31ace",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.075,
                  0.76
                ],
                [
                  0.125,
                  0.8
                ],
                [
                  0.43,
                  0.8
                ],
                [
                  0.5,
                  0.784
                ],
                [
                  0.875,
                  0.76
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.16
                ]
              ],
              "interpolation": "smooth"
            },
            "scaleX": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.375,
                  1
                ],
                [
                  0.49,
                  0.32
                ],
                [
                  0.9,
                  0.32
                ],
                [
                  1,
                  0.34
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "rune-wheel",
          "radius": 0.88,
          "light": "#d845de",
          "shadow": "#89218f",
          "blend": "normal",
          "scaleX": 1
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c00adc",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.11
                ],
                [
                  0.25,
                  0.94
                ],
                [
                  0.43,
                  0.9
                ],
                [
                  0.5,
                  0.8
                ],
                [
                  0.75,
                  0.78
                ],
                [
                  0.875,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  -0.45
                ],
                [
                  0.375,
                  -0.675
                ],
                [
                  0.48,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "scaleX": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.375,
                  1
                ],
                [
                  0.49,
                  0.32
                ],
                [
                  0.9,
                  0.32
                ],
                [
                  1,
                  0.34
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "fractured-ring",
          "radius": 0.78,
          "light": "#d228e4",
          "shadow": "#aa09c9",
          "blend": "normal",
          "scaleX": 1
        }
      ]
    },
    {
      "name": "revive-burst",
      "label": "復活の光 · K020",
      "sourceCode": "K020",
      "ms": 2250,
      "color": "#79b9d2",
      "light": "#cde8ef",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 1125,
        "cueMs": 1125
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#18b8d3",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.125,
                  0.12
                ],
                [
                  0.25,
                  0.7
                ],
                [
                  0.375,
                  0.8
                ],
                [
                  0.5,
                  0.95
                ],
                [
                  0.625,
                  0.32
                ],
                [
                  0.75,
                  0.08
                ],
                [
                  0.875,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.125,
                  0.06
                ],
                [
                  0.25,
                  0.15
                ],
                [
                  0.375,
                  0.19
                ],
                [
                  0.5,
                  0.19
                ],
                [
                  0.625,
                  0.11
                ],
                [
                  0.75,
                  0.02
                ],
                [
                  1,
                  0.005
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.11
                ],
                [
                  0.25,
                  0.11
                ],
                [
                  0.5,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.23,
          "blend": "normal",
          "stops": [
            [
              0,
              "#a1faff",
              1
            ],
            [
              0.45,
              "#a1faff",
              1
            ],
            [
              0.68,
              "#18b8d3",
              0.98
            ],
            [
              0.88,
              "#18b8d3",
              0.72
            ],
            [
              1,
              "#18b8d3",
              0
            ]
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#87daef",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.01
                ],
                [
                  0.25,
                  0.12
                ],
                [
                  0.375,
                  0.78
                ],
                [
                  0.5,
                  0.9
                ],
                [
                  0.625,
                  0.76
                ],
                [
                  0.75,
                  0.5
                ],
                [
                  0.875,
                  0.05
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.0336
                ],
                [
                  0.375,
                  0.4816
                ],
                [
                  0.5,
                  0.6048
                ],
                [
                  0.75,
                  0.4704
                ],
                [
                  1,
                  0.224
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.23
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "crack-rays",
          "radius": 0.59,
          "light": "#e4ffff",
          "shadow": "#367db6",
          "blend": "normal",
          "stroke": 0.014
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#62b6df",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0
                ],
                [
                  0.375,
                  0.8
                ],
                [
                  0.5,
                  0.9
                ],
                [
                  0.625,
                  0.5
                ],
                [
                  0.8,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.375,
                  0.315
                ],
                [
                  0.5,
                  0.45
                ],
                [
                  0.75,
                  0.49500000000000005
                ],
                [
                  1,
                  0.5175
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.45,
          "width": 0.02,
          "strokeProfile": "single",
          "blend": "normal",
          "core": 0
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#62b6df",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0
                ],
                [
                  0.375,
                  0.8
                ],
                [
                  0.5,
                  0.9
                ],
                [
                  0.625,
                  0.5
                ],
                [
                  0.8,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.375,
                  0.371
                ],
                [
                  0.5,
                  0.53
                ],
                [
                  0.75,
                  0.5830000000000001
                ],
                [
                  1,
                  0.6094999999999999
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.53,
          "width": 0.02,
          "strokeProfile": "single",
          "blend": "normal",
          "core": 0
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#62b6df",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0
                ],
                [
                  0.375,
                  0.8
                ],
                [
                  0.5,
                  0.9
                ],
                [
                  0.625,
                  0.5
                ],
                [
                  0.8,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.375,
                  0.40599999999999997
                ],
                [
                  0.5,
                  0.58
                ],
                [
                  0.75,
                  0.638
                ],
                [
                  1,
                  0.6669999999999999
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.58,
          "width": 0.02,
          "strokeProfile": "single",
          "blend": "normal",
          "core": 0
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#18b8d3",
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.083
                ],
                [
                  0.625,
                  0.066
                ],
                [
                  1,
                  0.06
                ]
              ],
              "interpolation": "smooth"
            },
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.625,
                  0.94
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.083,
          "blend": "normal",
          "stops": [
            [
              0,
              "#41f7fb",
              1
            ],
            [
              0.35,
              "#41f7fb",
              1
            ],
            [
              0.75,
              "#18b8d3",
              0.95
            ],
            [
              1,
              "#18b8d3",
              0
            ]
          ],
          "time": [
            0,
            0.2
          ],
          "endExclusive": true,
          "offset": [
            0.11,
            0
          ],
          "aspect": [
            0.43,
            1
          ]
        }
      ]
    },
    {
      "name": "mana-cue",
      "label": "マナ効果の合図 · K024",
      "sourceCode": "K024",
      "ms": 1350,
      "color": "#4fd8ff",
      "light": "#d8fbff",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 300,
        "cueMs": 300
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2fb8ff",
          "texture": "glow",
          "blend": "add",
          "radius": 1.1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.5
                ],
                [
                  0.62,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#7fe8ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.62,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.3
                ],
                [
                  0.62,
                  0.18
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5fe2ff",
          "texture": "magic-circle",
          "blend": "add",
          "directedRotation": true,
          "radius": 0.56,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  1
                ],
                [
                  0.62,
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.14
                ],
                [
                  0.22,
                  0.56
                ],
                [
                  1,
                  0.5936000000000001
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#8ff0ff",
          "light": "#e8ffff",
          "shadow": "#39b8d8",
          "blend": "add",
          "radius": 0.3,
          "stroke": 0.012,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.85
                ],
                [
                  0.62,
                  0.595
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.08
                ],
                [
                  0.24,
                  0.3
                ],
                [
                  1,
                  0.32
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -1.3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#b8f6ff",
          "width": 1.6,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "radius": 0.5712,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.8
                ],
                [
                  0.62,
                  0.5599999999999999
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1428
                ],
                [
                  0.22,
                  0.5712
                ],
                [
                  1,
                  0.6054720000000001
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 12,
          "countScale": "none",
          "orbit": 0.5040000000000001,
          "angleSpeed": 0.45,
          "sizeRange": [
            0.04,
            0.04
          ],
          "color": "#e8fdff",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.9
                ],
                [
                  0.62,
                  0.54
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#bff4ff",
          "count": 36,
          "radius": 0.75,
          "vortex": 0.8,
          "afterglow": false,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.85
                ],
                [
                  0.62,
                  0.425
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 600,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockSpace": "life",
          "batch": 1,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 600,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockSpace": "life",
          "batch": 1,
          "type": "glow",
          "color": "#9ff0ff",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.7
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 600,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockSpace": "life",
          "batch": 1,
          "type": "ring",
          "color": "#d8fbff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.12,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  0.95
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4
                ],
                [
                  1,
                  1.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 600,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#effdff",
          "count": 30,
          "vortex": 0.6,
          "radius": 0.9,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 160,
            "maxRatio": 1
          },
          "endAtEffectEnd": false,
          "clockSpace": "life",
          "batch": 1,
          "type": "card",
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.4
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "summon-sigil",
      "label": "緑の召喚陣 · S001",
      "sourceCode": "S001",
      "ms": 1500,
      "color": "#68a438",
      "light": "#c7de8c",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 750,
        "cueMs": 750
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#23c217",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.08
                ],
                [
                  0.25,
                  0.85
                ],
                [
                  0.375,
                  1
                ],
                [
                  0.5,
                  1
                ],
                [
                  0.625,
                  0.98
                ],
                [
                  0.75,
                  0.6
                ],
                [
                  0.875,
                  0.12
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.125,
                  0.1
                ],
                [
                  0.25,
                  0.29
                ],
                [
                  0.375,
                  0.37
                ],
                [
                  0.5,
                  0.38
                ],
                [
                  0.625,
                  0.35
                ],
                [
                  0.75,
                  0.23
                ],
                [
                  0.875,
                  0.06
                ],
                [
                  1,
                  0.005
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.38,
          "blend": "normal",
          "stops": [
            [
              0,
              "#61f13a",
              1
            ],
            [
              0.45,
              "#61f13a",
              1
            ],
            [
              0.68,
              "#23c217",
              0.98
            ],
            [
              0.88,
              "#23c217",
              0.72
            ],
            [
              1,
              "#23c217",
              0
            ]
          ],
          "aspect": [
            0.78,
            1.1
          ]
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#1f982c",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.08
                ],
                [
                  0.25,
                  0.85
                ],
                [
                  0.375,
                  1
                ],
                [
                  0.5,
                  1
                ],
                [
                  0.625,
                  0.98
                ],
                [
                  0.75,
                  0.6
                ],
                [
                  0.875,
                  0.12
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.03
                ],
                [
                  0.125,
                  0.1
                ],
                [
                  0.25,
                  0.29
                ],
                [
                  0.375,
                  0.37
                ],
                [
                  0.5,
                  0.38
                ],
                [
                  0.625,
                  0.35
                ],
                [
                  0.75,
                  0.23
                ],
                [
                  0.875,
                  0.06
                ],
                [
                  1,
                  0.005
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  2.2
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "texture": "plasma-soft",
          "radius": 0.36,
          "aspect": [
            0.8,
            1.1
          ],
          "blend": "normal"
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#34ce20",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.08
                ],
                [
                  0.25,
                  0.85
                ],
                [
                  0.375,
                  1
                ],
                [
                  0.5,
                  1
                ],
                [
                  0.625,
                  0.98
                ],
                [
                  0.75,
                  0.6
                ],
                [
                  0.875,
                  0.12
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.02
                ],
                [
                  0.25,
                  0.36
                ],
                [
                  0.4,
                  0.48
                ],
                [
                  0.65,
                  0.4
                ],
                [
                  0.875,
                  0.07
                ],
                [
                  1,
                  0.01
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -1
                ],
                [
                  1,
                  2
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4,
          "width": 0.026,
          "strokeProfile": "single",
          "blend": "normal",
          "core": 0,
          "aspect": [
            0.78,
            1.15
          ],
          "arc": [
            -0.4,
            4.7
          ],
          "noise": 0.08
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#2bdd25",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.08
                ],
                [
                  0.25,
                  0.85
                ],
                [
                  0.375,
                  1
                ],
                [
                  0.5,
                  1
                ],
                [
                  0.625,
                  0.98
                ],
                [
                  0.75,
                  0.6
                ],
                [
                  0.875,
                  0.12
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "motion": "orbit",
          "count": 6,
          "countScale": "none",
          "size": 0.047,
          "orbit": 0.3,
          "light": "#88fc50",
          "shadow": "#2bdd25",
          "phaseDistribution": "uniform",
          "materials": [
            {
              "shape": "orb",
              "blend": "normal"
            }
          ],
          "angleSpeed": 1.4
        }
      ]
    },
    {
      "name": "gold-gain",
      "label": "金貨の獲得 · S003",
      "sourceCode": "S003",
      "ms": 1050,
      "color": "#d4b056",
      "light": "#f6e7af",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "fog",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "mode": "cloud",
          "color": "#aba899",
          "texture": "smoke",
          "count": 8,
          "radius": 0.33,
          "extent": [
            0.4,
            0.38
          ],
          "flow": [
            0.008,
            -0.04
          ],
          "noise": 0.13,
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.18
                ],
                [
                  0.4,
                  0.62
                ],
                [
                  0.65,
                  0.5
                ],
                [
                  0.875,
                  0.04
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c8bfad",
          "radius": 0.62,
          "blend": "add",
          "stops": [
            [
              0,
              "#ddd5be",
              0.95
            ],
            [
              0.5,
              "#c8bfad",
              0.8
            ],
            [
              0.85,
              "#b7ae98",
              0.3
            ],
            [
              1,
              "#b7ae98",
              0
            ]
          ],
          "aspect": [
            1,
            0.86
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.12
                ],
                [
                  0.375,
                  0.68
                ],
                [
                  0.5,
                  0.96
                ],
                [
                  0.625,
                  0.84
                ],
                [
                  0.875,
                  0.02
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d4ac54",
          "texture": "glow",
          "radius": 0.28,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.2
                ],
                [
                  0.7,
                  0.2
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "ballistic",
          "count": 11,
          "emission": "circle",
          "radius": 0.22,
          "lifeMs": [
            420,
            730
          ],
          "delayMs": [
            30,
            135
          ],
          "speed": [
            0.5,
            1.4
          ],
          "gravity": [
            0,
            0.27
          ],
          "drag": 0.4,
          "sizeRange": [
            0.12,
            0.17
          ],
          "spin": [
            -1.6,
            1.6
          ],
          "shape": "coin",
          "color": "#d8b453",
          "light": "#f4e3a5",
          "shadow": "#8e6e30",
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.35
                ],
                [
                  0.375,
                  0.95
                ],
                [
                  0.65,
                  0.9
                ],
                [
                  0.9,
                  0.1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "mana-gain",
      "label": "マナの結晶 · S004",
      "sourceCode": "S004",
      "ms": 1005,
      "color": "#6fb8ff",
      "light": "#e8f8ff",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 105,
        "cueMs": 105
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#4aa6ff",
          "texture": "glow",
          "blend": "add",
          "radius": 1.3,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.9
                ],
                [
                  0.66,
                  0.675
                ],
                [
                  0.93,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#7cc8ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.36,
          "aspect": [
            0.8,
            1.15
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.85
                ],
                [
                  0.66,
                  0.51
                ],
                [
                  0.93,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5fb4ff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.75,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.8
                ],
                [
                  0.66,
                  0.6400000000000001
                ],
                [
                  0.93,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#9ad4ff",
          "texture": "plasma",
          "blend": "add",
          "radius": 0.6,
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.55
                ],
                [
                  0.66,
                  0.275
                ],
                [
                  0.93,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "orbit": 0.38,
          "angleSpeed": 0.35,
          "sizeRange": [
            0.05,
            0.05
          ],
          "color": "#eaf8ff",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.9
                ],
                [
                  0.66,
                  0.63
                ],
                [
                  0.93,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "crystal",
          "radius": 0.34,
          "color": "#1d4f9a",
          "light": "#6fb0f0",
          "shadow": "#0f2c66",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.95
                ],
                [
                  0.66,
                  0.95
                ],
                [
                  0.93,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            },
            "scaleX": {
              "keys": [
                [
                  0,
                  0.452
                ],
                [
                  0.14,
                  1.1800000000000002
                ],
                [
                  0.3,
                  0.3064
                ],
                [
                  0.46,
                  1.1800000000000002
                ],
                [
                  0.62,
                  0.3064
                ],
                [
                  0.78,
                  1.0680000000000003
                ],
                [
                  1,
                  0.28400000000000003
                ]
              ],
              "interpolation": "smooth"
            },
            "scaleY": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  0.12,
                  1.06
                ],
                [
                  0.8,
                  1.04
                ],
                [
                  1,
                  1.35
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "crystal",
          "radius": 0.32,
          "color": "#4f9ee8",
          "light": "#e6f7ff",
          "shadow": "#2a64b8",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  1
                ],
                [
                  0.66,
                  1
                ],
                [
                  0.93,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            },
            "scaleX": {
              "keys": [
                [
                  0,
                  0.35
                ],
                [
                  0.14,
                  1
                ],
                [
                  0.3,
                  0.22
                ],
                [
                  0.46,
                  1
                ],
                [
                  0.62,
                  0.22
                ],
                [
                  0.78,
                  0.9
                ],
                [
                  1,
                  0.2
                ]
              ],
              "interpolation": "smooth"
            },
            "scaleY": {
              "keys": [
                [
                  0,
                  0.8
                ],
                [
                  0.12,
                  1.06
                ],
                [
                  0.8,
                  1.04
                ],
                [
                  1,
                  1.35
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#bfe8ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.15,
          "aspect": [
            0.55,
            1.25
          ],
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.7
                ],
                [
                  0.3,
                  0.35
                ],
                [
                  0.46,
                  0.8
                ],
                [
                  0.62,
                  0.35
                ],
                [
                  0.78,
                  0.75
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.45,
          "aspect": [
            0.32,
            1.25
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.75
                ],
                [
                  0.24,
                  0.1
                ],
                [
                  0.46,
                  0.8
                ],
                [
                  0.56,
                  0.1
                ],
                [
                  0.78,
                  0.7
                ],
                [
                  0.9,
                  0.1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.6,
                  -0.03
                ],
                [
                  1,
                  -0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.5,
          "aspect": [
            1.6,
            0.04
          ],
          "shiftX": -0.05,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.42,
                  0
                ],
                [
                  0.47,
                  0.95
                ],
                [
                  0.6,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.08
                ],
                [
                  0.6,
                  -0.11
                ],
                [
                  1,
                  -0.47
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.5,
          "aspect": [
            0.04,
            1.6
          ],
          "shiftX": -0.05,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.42,
                  0
                ],
                [
                  0.47,
                  0.95
                ],
                [
                  0.6,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.08
                ],
                [
                  0.6,
                  -0.11
                ],
                [
                  1,
                  -0.47
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#e6f7ff",
          "count": 40,
          "radius": 0.62,
          "vortex": 0.6,
          "afterglow": false,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.9
                ],
                [
                  0.6,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#bfe6ff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.55,
          "aspect": [
            0.12,
            1.5
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.62,
                  0
                ],
                [
                  0.8,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.1
                ],
                [
                  0.62,
                  -0.12
                ],
                [
                  1,
                  -0.7
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#9fd8ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.7,
          "aspect": [
            0.16,
            1.4
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.6,
                  0
                ],
                [
                  0.8,
                  0.95
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  -0.1
                ],
                [
                  0.62,
                  -0.1
                ],
                [
                  1,
                  -0.62
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            }
          }
        }
      ]
    },
    {
      "name": "attack-buff",
      "label": "攻撃の強化 · S005",
      "sourceCode": "S005",
      "ms": 1050,
      "color": "#ffc23a",
      "light": "#fff2b8",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 315,
        "cueMs": 315
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffb020",
          "texture": "glow",
          "blend": "add",
          "radius": 1.05,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0.55
                ],
                [
                  0.7,
                  0.4675
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffd060",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.58,
          "directedRotation": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.38
                ],
                [
                  0.7,
                  0.323
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.08000000000000002
                ],
                [
                  0.24,
                  0.2
                ],
                [
                  0.36,
                  0.6496000000000001
                ],
                [
                  0.5,
                  0.58
                ],
                [
                  1,
                  0.5509999999999999
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "ruffled-ring",
          "color": "#ffc040",
          "light": "#fff0b0",
          "shadow": "#b07010",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.5
                ],
                [
                  0.7,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  0.3,
                  0.48
                ],
                [
                  1,
                  0.62
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  1.2
                ],
                [
                  1,
                  -0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 14,
          "countScale": "none",
          "orbit": 0.45,
          "orbitVelocity": 0.3,
          "angleSpeed": 0.5,
          "color": "#ffd060",
          "radialCurve": {
            "keys": [
              [
                0,
                2
              ],
              [
                1,
                0.1
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.5
          },
          "radialDelay": 0.25,
          "radialLife": 0.32,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.05,
                  1
                ],
                [
                  0.3,
                  0.9
                ],
                [
                  0.36,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "glow",
              "radiusAbsolute": 0.1,
              "aspect": [
                1.6,
                0.28
              ],
              "rotationScale": 1,
              "color": "#ffd060",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "halo-ray",
          "color": "#ffe08a",
          "blend": "add",
          "copies": 6,
          "layout": "center",
          "align": "tangent",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.26,
                  0
                ],
                [
                  0.33999999999999997,
                  0.85
                ],
                [
                  0.75,
                  0.5
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.06
                ],
                [
                  0.24,
                  0.15
                ],
                [
                  0.36,
                  0.6944
                ],
                [
                  0.5,
                  0.62
                ],
                [
                  1,
                  0.589
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.8
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "flare",
          "color": "#ffc83a",
          "light": "#fff4c0",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0.2
                ],
                [
                  0.32999999999999996,
                  0.8
                ],
                [
                  0.75,
                  0.55
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.036
                ],
                [
                  0.24,
                  0.09
                ],
                [
                  0.36,
                  0.3808000000000001
                ],
                [
                  0.5,
                  0.34
                ],
                [
                  1,
                  0.323
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.4
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "star",
          "color": "#ffe38a",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.27,
                  0
                ],
                [
                  0.32999999999999996,
                  0.85
                ],
                [
                  0.75,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.044000000000000004
                ],
                [
                  0.24,
                  0.11
                ],
                [
                  0.36,
                  0.49280000000000007
                ],
                [
                  0.5,
                  0.44
                ],
                [
                  1,
                  0.418
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  1,
                  -0.3
                ]
              ],
              "interpolation": "smooth"
            },
            "scaleX": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear"
            },
            "scaleY": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.36,
                  1.25
                ],
                [
                  1,
                  1.1
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffb428",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.4
                ],
                [
                  0.3,
                  0.9
                ],
                [
                  0.75,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  0.3,
                  0.3
                ],
                [
                  1,
                  0.26
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.8
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#fff4d0",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.4
                ],
                [
                  0.3,
                  0.9
                ],
                [
                  0.5,
                  0.5
                ],
                [
                  0.8,
                  0.4
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  0.3,
                  0.34
                ],
                [
                  1,
                  0.26
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#ffe6a0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.12,
          "strokeProfile": "halo",
          "time": [
            0.3,
            0.85
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.95
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4
                ],
                [
                  1,
                  1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffe9a8",
          "count": 34,
          "vortex": 0.5,
          "radius": 0.95,
          "time": [
            0.3,
            1
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0.7
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 7,
          "countScale": "none",
          "orbit": 0.55,
          "orbitSize": 0.35,
          "angleSpeed": 0.25,
          "size": 0.06,
          "sizeSize": 0.04,
          "color": "#ffd860",
          "light": "#fffbe0",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0
                ],
                [
                  0.38,
                  1
                ],
                [
                  0.6,
                  0.2
                ],
                [
                  0.7,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "shape": "star",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusScale": 0.6,
              "color": "#ffcf50",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 7,
          "countScale": "none",
          "moteOffset": 40,
          "orbit": 0.6,
          "orbitSize": 0.3,
          "angleSpeed": -0.2,
          "size": 0.05,
          "sizeSize": 0.04,
          "color": "#ffd860",
          "light": "#fffbe0",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.5,
                  0
                ],
                [
                  0.6,
                  1
                ],
                [
                  0.85,
                  0.3
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "shape": "star",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusScale": 0.6,
              "color": "#ffcf50",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.3,
            0.55
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.4
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "injury-buff",
      "label": "負傷の強化 · S006",
      "sourceCode": "S006",
      "ms": 1050,
      "color": "#ff6a1c",
      "light": "#ffe2a6",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 651,
        "cueMs": 651
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5a1606",
          "texture": "smoke",
          "radius": 0.9,
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.28
                ],
                [
                  0.78,
                  0.28
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.62,
                  0.62
                ],
                [
                  1,
                  0.6448
                ]
              ],
              "interpolation": "sine-in",
              "segments": [
                "sine-in",
                "smooth"
              ]
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff5a14",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.3
                ],
                [
                  0.62,
                  0.55
                ],
                [
                  0.85,
                  0.4
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.1
                ],
                [
                  0.62,
                  0.6
                ],
                [
                  1,
                  0.624
                ]
              ],
              "interpolation": "sine-in",
              "segments": [
                "sine-in",
                "smooth"
              ]
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "ruffled-ring",
          "color": "#ff7a24",
          "light": "#ffd080",
          "shadow": "#a8300c",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.42
                ],
                [
                  0.62,
                  0.55
                ],
                [
                  0.8,
                  0.2
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.72
                ],
                [
                  0.62,
                  0.3
                ],
                [
                  1,
                  0.312
                ]
              ],
              "interpolation": "sine-in",
              "segments": [
                "sine-in",
                "smooth"
              ]
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  1.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "ruffled-ring",
          "color": "#ffb050",
          "light": "#fff0c0",
          "shadow": "#d04a10",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.14,
                  0.25
                ],
                [
                  0.62,
                  0.4
                ],
                [
                  0.8,
                  0.15
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.62
                ],
                [
                  0.62,
                  0.25
                ],
                [
                  1,
                  0.26
                ]
              ],
              "interpolation": "sine-in",
              "segments": [
                "sine-in",
                "smooth"
              ]
            },
            "rotation": {
              "keys": [
                [
                  0,
                  2
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 16,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.6,
          "orbitSize": 0.06,
          "angleSpeed": 1.1,
          "color": "#ff7a24",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.85
                ],
                [
                  0.62,
                  0.9
                ],
                [
                  0.8,
                  0.3
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.66
                ],
                [
                  0.62,
                  0.27
                ],
                [
                  1,
                  0.28080000000000005
                ]
              ],
              "interpolation": "sine-in",
              "segments": [
                "sine-in",
                "smooth"
              ]
            }
          },
          "materials": [
            {
              "texture": "plasma",
              "radiusAbsolute": 0.13,
              "rotationScale": 1,
              "color": "#ff5a14",
              "blend": "add"
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.08,
              "rotationScale": -1,
              "color": "#ffd27a",
              "blend": "add",
              "variantOffset": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#ffc070",
          "width": 2.2,
          "widthSpace": "pixel",
          "noise": 0.03,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.7
                ],
                [
                  0.62,
                  0.95
                ],
                [
                  0.82,
                  0.4
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.66
                ],
                [
                  0.62,
                  0.27
                ],
                [
                  1,
                  0.28080000000000005
                ]
              ],
              "interpolation": "sine-in",
              "segments": [
                "sine-in",
                "smooth"
              ]
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 18,
          "countScale": "none",
          "orbit": 0.5,
          "orbitVelocity": 0.3,
          "angleSpeed": 0.6,
          "angularSpread": 0.5,
          "color": "#ff7a2a",
          "radialCurve": {
            "keys": [
              [
                0,
                1.9
              ],
              [
                1,
                0.15
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.4
          },
          "radialDelay": 0.55,
          "radialLife": 0.45,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  0.95
                ],
                [
                  0.66,
                  0.9
                ],
                [
                  0.78,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "plasma",
              "radiusAbsolute": 0.1,
              "rotationScale": 1,
              "color": "#ff6a1c",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.07,
              "aspect": [
                1.6,
                0.3
              ],
              "rotationScale": 1,
              "color": "#ffd090",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff8a2a",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.4
                ],
                [
                  0.62,
                  1
                ],
                [
                  0.85,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.62,
                  0.28
                ],
                [
                  1,
                  0.25
                ]
              ],
              "interpolation": "sine-in",
              "segments": [
                "sine-in",
                "smooth"
              ]
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  2.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#fff0c8",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.3
                ],
                [
                  0.62,
                  0.95
                ],
                [
                  0.8,
                  0.75
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.16
                ],
                [
                  0.62,
                  0.36
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "orbit": 0.16,
          "orbitVelocity": 0.08,
          "angleSpeed": 2.2,
          "sizeRange": [
            0.035,
            0.035
          ],
          "color": "#ffe0a0",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  0
                ],
                [
                  0.62,
                  0.9
                ],
                [
                  0.85,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.62,
            0.85
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.35
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shake",
          "time": [
            0.6,
            0.72
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "strength": [
            0.02,
            0.008
          ],
          "frequencyHz": [
            22,
            17
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "death-buff",
      "label": "死亡の強化 · S007",
      "sourceCode": "S007",
      "ms": 1050,
      "color": "#5fd8e8",
      "light": "#e0fbff",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 378,
        "cueMs": 378
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#1c8aa0",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.55
                ],
                [
                  0.7,
                  0.4675
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 8,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.42,
          "orbitSize": 0.1,
          "angleSpeed": 0.4,
          "color": "#1e5a6a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.6
                ],
                [
                  0.7,
                  0.51
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  0.36,
                  0.32
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.32,
              "blend": "add",
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 12,
          "countScale": "none",
          "orbit": 0.5,
          "orbitVelocity": 0.25,
          "angleSpeed": 2.2,
          "angularSpread": 0.4,
          "color": "#7fe8f8",
          "radialCurve": {
            "keys": [
              [
                0,
                1.5
              ],
              [
                1,
                0.05
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.3
          },
          "radialDelay": 0.35,
          "radialLife": 0.6,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.06,
                  1
                ],
                [
                  0.36,
                  0.9
                ],
                [
                  0.41,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.1,
              "color": "#5fd8e8",
              "blend": "add",
              "rotationScale": 2
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.07,
              "aspect": [
                0.6,
                1.4
              ],
              "color": "#c8f8ff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.06,
              "polarOffset": -0.25,
              "alphaScale": 0.5,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "shape",
          "shape": "ruffled-ring",
          "color": "#4fc8d8",
          "light": "#d8faff",
          "shadow": "#1a6a80",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.45
                ],
                [
                  0.36,
                  0.7
                ],
                [
                  0.75,
                  0.4
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  0.36,
                  0.4
                ],
                [
                  0.5,
                  0.52
                ],
                [
                  1,
                  0.56
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#bff4ff",
          "width": 1.6,
          "widthSpace": "pixel",
          "noise": 0.05,
          "noiseClock": 4,
          "strokeProfile": "halo",
          "core": 0.3,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.75
                ],
                [
                  0.7,
                  0.6375
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.6
                ],
                [
                  0.36,
                  0.42
                ],
                [
                  0.5,
                  0.55
                ],
                [
                  1,
                  0.58
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5fd8e8",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.35
                ],
                [
                  0.36,
                  1
                ],
                [
                  0.7,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  0.36,
                  0.32
                ],
                [
                  1,
                  0.26
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#f0feff",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.3
                ],
                [
                  0.36,
                  0.95
                ],
                [
                  0.55,
                  0.5
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  0.36,
                  0.38
                ],
                [
                  1,
                  0.28
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.36,
            0.85
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "ring",
          "color": "#d8faff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.15,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.95
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4
                ],
                [
                  1,
                  1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.36,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 16,
          "sizeRange": [
            0.035,
            0.06
          ],
          "speed": [
            0.7,
            1.4
          ],
          "drag": 2.5,
          "lifeMs": [
            400,
            700
          ],
          "delayMs": [
            0,
            60
          ],
          "shape": "ice-shard",
          "color": "#5fc8ff",
          "light": "#e8fbff",
          "shadow": "#1a5a9a",
          "directionSpace": "radial",
          "emissionArc": [
            0,
            6.283
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.7,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.36,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8f8ff",
          "count": 28,
          "vortex": 0.6,
          "radius": 0.9,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.36,
            0.6
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.4
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "mana-buff",
      "label": "マナの強化 · S008",
      "sourceCode": "S008",
      "ms": 1050,
      "color": "#74a634",
      "light": "#d8e8a5",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42c01a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.034
                ],
                [
                  0.25,
                  0.68
                ],
                [
                  0.375,
                  0.85
                ],
                [
                  0.55,
                  0.85
                ],
                [
                  0.68,
                  0.8075
                ],
                [
                  0.78,
                  0.153
                ],
                [
                  0.88,
                  0.0255
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "motion": "orbit",
          "count": 7,
          "countScale": "none",
          "size": 0.1218,
          "orbit": 0.322,
          "light": "#f0ffc4",
          "shadow": "#42c01a",
          "phaseDistribution": "uniform",
          "materials": [
            {
              "shape": "orb",
              "blend": "normal"
            }
          ],
          "angleSpeed": -0.5,
          "sizeSize": 0.04
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42c01a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.04
                ],
                [
                  0.25,
                  0.8
                ],
                [
                  0.375,
                  1
                ],
                [
                  0.55,
                  1
                ],
                [
                  0.68,
                  0.95
                ],
                [
                  0.78,
                  0.18
                ],
                [
                  0.88,
                  0.03
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.32,
          "blend": "normal",
          "stops": [
            [
              0,
              "#f0ffc4",
              1
            ],
            [
              0.45,
              "#f0ffc4",
              1
            ],
            [
              0.68,
              "#42c01a",
              0.98
            ],
            [
              0.88,
              "#42c01a",
              0.72
            ],
            [
              1,
              "#42c01a",
              0
            ]
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42c01a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0
                ],
                [
                  0.24,
                  0.156
                ],
                [
                  0.375,
                  0.7176
                ],
                [
                  0.55,
                  0.78
                ],
                [
                  0.68,
                  0.702
                ],
                [
                  0.78,
                  0.0936
                ],
                [
                  0.88,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.075
                ],
                [
                  0.125,
                  0.15
                ],
                [
                  0.25,
                  0.7
                ],
                [
                  0.375,
                  0.8375
                ],
                [
                  0.56,
                  0.7625
                ],
                [
                  0.69,
                  0.85
                ],
                [
                  0.82,
                  0.8625
                ],
                [
                  1,
                  0.875
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.3
                ],
                [
                  1,
                  1.7
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "ruffled-ring",
          "radius": 0.8125,
          "light": "#f0ffc4",
          "shadow": "#287527",
          "blend": "normal"
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42c01a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.24,
                  0
                ],
                [
                  0.43,
                  0.6396
                ],
                [
                  0.64,
                  0.702
                ],
                [
                  0.78,
                  0.039
                ],
                [
                  0.88,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  1.2
                ],
                [
                  1,
                  -1.1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "ruffled-ring",
          "radius": 0.5375,
          "light": "#f0ffc4",
          "shadow": "#287527",
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42c01a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.9
                ],
                [
                  0.7,
                  0.9
                ],
                [
                  0.88,
                  0.12
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "motion": "ballistic",
          "count": 8,
          "emission": "rim",
          "extent": [
            0.51,
            0.64
          ],
          "lifeMs": [
            320,
            650
          ],
          "delayMs": [
            130,
            230
          ],
          "speed": [
            0.16,
            0.3
          ],
          "gravity": [
            0,
            -0.025
          ],
          "sizeRange": [
            0.054,
            0.08775
          ],
          "spin": [
            -0.8,
            0.8
          ],
          "shape": "orb",
          "light": "#f0ffc4",
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42c01a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0
                ],
                [
                  0.24,
                  0.16
                ],
                [
                  0.375,
                  0.736
                ],
                [
                  0.55,
                  0.8
                ],
                [
                  0.68,
                  0.72
                ],
                [
                  0.78,
                  0.096
                ],
                [
                  0.88,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "motion": "orbit",
          "count": 6,
          "countScale": "none",
          "size": 0.055,
          "orbit": 0.6944,
          "light": "#f0ffc4",
          "shadow": "#42c01a",
          "phaseDistribution": "uniform",
          "materials": [
            {
              "shape": "orb",
              "blend": "normal"
            }
          ],
          "angleSpeed": 0.6,
          "sizeSize": 0.015
        }
      ]
    },
    {
      "name": "aura-buff",
      "label": "常時の強化 · S009",
      "sourceCode": "S009",
      "ms": 1050,
      "color": "#7fe8b8",
      "light": "#eafff4",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 420,
        "cueMs": 420
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#1fa070",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.5
                ],
                [
                  0.7,
                  0.425
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#9ff0d0",
          "texture": "magic-circle",
          "blend": "add",
          "directedRotation": true,
          "radius": 0.5,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.4
                ],
                [
                  0.7,
                  0.34
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.35
                ],
                [
                  0.4,
                  0.5
                ],
                [
                  1,
                  0.54
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.8
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#8cf0c8",
          "width": 1.9,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            3
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.85
                ],
                [
                  0.7,
                  0.7224999999999999
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.696
                ],
                [
                  0.4,
                  0.5336
                ],
                [
                  1,
                  0.58
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 1,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#c8ffe8",
          "width": 1.3,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            3.4
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.75
                ],
                [
                  0.7,
                  0.6375
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.576
                ],
                [
                  0.4,
                  0.4416
                ],
                [
                  1,
                  0.48
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  2
                ],
                [
                  1,
                  -4.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 2,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#8cf0c8",
          "width": 1.9,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            3.8
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.6499999999999999
                ],
                [
                  0.7,
                  0.5524999999999999
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.45599999999999996
                ],
                [
                  0.4,
                  0.3496
                ],
                [
                  1,
                  0.38
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  4
                ],
                [
                  1,
                  -4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "orbit": 0.45,
          "orbitSize": 0.15,
          "angleSpeed": 2.5,
          "angularSpread": 0.6,
          "size": 0.05,
          "sizeSize": 0.03,
          "particleSpin": 4,
          "color": "#7fe8b8",
          "light": "#eafff4",
          "shadow": "#1a7050",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.95
                ],
                [
                  0.7,
                  0.8075
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.6
                ],
                [
                  0.4,
                  0.4
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "materials": [
            {
              "shape": "feather",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "radiusScale": 0.7,
              "color": "#9ff0d0",
              "blend": "add",
              "alphaScale": 0.6
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5fe0a8",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.35
                ],
                [
                  0.4,
                  0.95
                ],
                [
                  0.7,
                  0.55
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  1,
                  0.26
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#f0fff8",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.3
                ],
                [
                  0.4,
                  0.9
                ],
                [
                  0.55,
                  0.5
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  0.4,
                  0.36
                ],
                [
                  1,
                  0.28
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.4,
            0.85
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "ring",
          "color": "#e0fff0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.12,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.95
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4
                ],
                [
                  1,
                  1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.4,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 12,
          "sizeRange": [
            0.04,
            0.065
          ],
          "speed": [
            0.5,
            1
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.4
          ],
          "lifeMs": [
            450,
            750
          ],
          "delayMs": [
            0,
            60
          ],
          "shape": "feather",
          "color": "#7fe8b8",
          "light": "#eafff4",
          "shadow": "#1a7050",
          "spin": [
            -6,
            6
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.7,
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.4,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8fff0",
          "count": 24,
          "vortex": 0.8,
          "radius": 0.85,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.4,
            0.62
          ],
          "clockSpace": "life",
          "batch": 1,
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.35
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            }
          }
        }
      ]
    },
    {
      "name": "opening-sigil",
      "label": "着地の金輪 · appearance",
      "sourceCode": "appearance_sheet",
      "ms": 1470,
      "color": "#c9b67a",
      "light": "#e3d4a2",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#8a7856",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.11,
                  0.41
                ],
                [
                  0.28,
                  0.328
                ],
                [
                  0.55,
                  0.0615
                ],
                [
                  0.8,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "cloud-bank",
          "radius": 0.172787,
          "light": "#b09c72",
          "shadow": "#625c47",
          "blend": "normal",
          "time": [
            0.40408163265306124,
            1
          ],
          "offset": [
            -0.290984,
            0.012295
          ],
          "aspect": [
            0.77,
            1.12
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#867652",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.13,
                  0.1968
                ],
                [
                  0.34,
                  0.123
                ],
                [
                  0.62,
                  0.0205
                ],
                [
                  0.8,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "cloud-bank",
          "radius": 0.121968,
          "light": "#b2a077",
          "shadow": "#625e47",
          "blend": "normal",
          "time": [
            0.40408163265306124,
            1
          ],
          "offset": [
            -0.372951,
            0.114754
          ],
          "aspect": [
            0.75,
            1.16
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#7d7651",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.11,
                  0.62
                ],
                [
                  0.36,
                  0.55
                ],
                [
                  0.62,
                  0
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "time": [
            0.40408163265306124,
            1
          ],
          "motion": "ballistic",
          "count": 3,
          "emission": "rect",
          "extent": [
            0.147541,
            0.090164
          ],
          "offset": [
            -0.090164,
            -0.22541
          ],
          "lifeMs": [
            120,
            220
          ],
          "delayMs": [
            40,
            90
          ],
          "speed": [
            0.07377,
            0.127049
          ],
          "direction": [
            -2.1,
            -1
          ],
          "gravity": [
            0,
            0.04918
          ],
          "sizeRange": [
            0.006147,
            0.012295
          ],
          "particleRotation": [
            0,
            6.28
          ],
          "shape": "orb",
          "light": "#99905f",
          "shadow": "#655d44",
          "blend": "normal"
        }
      ]
    },
    {
      "name": "board-summon",
      "label": "召喚マスへの変化 · board_change1",
      "sourceCode": "board_change1",
      "ms": 1800,
      "color": "#63974e",
      "light": "#bbd793",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 750,
        "cueMs": 750
      },
      "layers": [
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#63974e",
          "radius": 0.1426,
          "width": 0.006,
          "strokeProfile": "single",
          "core": 1,
          "noise": 0.05,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.164
                ],
                [
                  0.4166666666666667,
                  0.41
                ],
                [
                  0.68,
                  0.164
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal"
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#bbd793",
          "radius": 0.1357,
          "width": 0.0022,
          "strokeProfile": "single",
          "core": 1,
          "noise": 0.025,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.082
                ],
                [
                  0.4166666666666667,
                  0.205
                ],
                [
                  0.68,
                  0.082
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "orbit",
          "color": "#bbd793",
          "count": 18,
          "size": 0.00506,
          "texture": "glow",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.1476
                ],
                [
                  0.4166666666666667,
                  0.30504
                ],
                [
                  0.68,
                  0.1476
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "orbit": 0.1449,
          "angleSpeed": 1.1
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "ballistic",
          "count": 16,
          "emission": "circle",
          "radius": 0.1,
          "lifeMs": [
            240,
            620
          ],
          "delayMs": [
            150,
            450
          ],
          "speed": [
            0.015,
            0.05
          ],
          "sizeRange": [
            0.0025,
            0.004
          ],
          "spin": [
            -0.4,
            0.4
          ],
          "shape": "rough-polygon",
          "blend": "normal",
          "color": "#63974e",
          "light": "#bbd793",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.10496
                ],
                [
                  0.4166666666666667,
                  0.2624
                ],
                [
                  0.68,
                  0.10496
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#63974e",
          "texture": "plasma-soft",
          "radius": 0.1725,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.0615
                ],
                [
                  0.4166666666666667,
                  0.1271
                ],
                [
                  0.68,
                  0.0615
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "board-enchant",
      "label": "強化マスへの変化 · board_change2",
      "sourceCode": "board_change2",
      "ms": 1800,
      "color": "#5489aa",
      "light": "#b2d5de",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 750,
        "cueMs": 750
      },
      "layers": [
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#5489aa",
          "radius": 0.1426,
          "width": 0.006,
          "strokeProfile": "single",
          "core": 1,
          "noise": 0.05,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.0143
                ],
                [
                  0.4166666666666667,
                  0.03575
                ],
                [
                  0.68,
                  0.0143
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal"
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#b2d5de",
          "radius": 0.1357,
          "width": 0.0022,
          "strokeProfile": "single",
          "core": 1,
          "noise": 0.025,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.0091
                ],
                [
                  0.4166666666666667,
                  0.02145
                ],
                [
                  0.68,
                  0.0091
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "orbit",
          "color": "#b2d5de",
          "count": 18,
          "size": 0.00506,
          "texture": "glow",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.01287
                ],
                [
                  0.4166666666666667,
                  0.026598
                ],
                [
                  0.68,
                  0.01287
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "orbit": 0.1449,
          "angleSpeed": 1.1
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "ballistic",
          "count": 16,
          "emission": "circle",
          "radius": 0.1,
          "lifeMs": [
            240,
            620
          ],
          "delayMs": [
            150,
            450
          ],
          "speed": [
            0.015,
            0.05
          ],
          "sizeRange": [
            0.0025,
            0.004
          ],
          "spin": [
            -0.4,
            0.4
          ],
          "shape": "rough-polygon",
          "blend": "normal",
          "color": "#5489aa",
          "light": "#8ab4c8",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.0104
                ],
                [
                  0.4166666666666667,
                  0.026
                ],
                [
                  0.68,
                  0.0104
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#3b70b7",
          "radius": 0.105,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  0.026
                ],
                [
                  0.4166666666666667,
                  0.065
                ],
                [
                  0.68,
                  0.026
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal",
          "stops": [
            [
              0,
              "#3b70b7",
              0.72
            ],
            [
              0.5,
              "#3b70b7",
              0.58
            ],
            [
              1,
              "#3b70b7",
              0
            ]
          ]
        }
      ]
    }
  ]
});
