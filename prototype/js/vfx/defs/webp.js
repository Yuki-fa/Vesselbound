/* 第2段：WebPは色・形・動きの参考だけ。描画は汎用部品の宣言データ。
 * SEは変更しない。実ゲームの尺・合図は共通入口の値をdurationMsへ渡す。
 * 着地の砂煙は560msから薄れ始め、980msで消す（2026-10-19 砂煙主体・カード幅に作り直し）。
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#6a4a2c",
          "texture": "smoke",
          "variant": 1,
          "time": [
            0.02,
            0.75
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.42
                ],
                [
                  0.6,
                  0.252
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
                  0.22
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
          "type": "glow",
          "color": "#ffc870",
          "texture": "glow",
          "blend": "add",
          "time": [
            0,
            0.38
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
                  0.75
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
                  0.18
                ],
                [
                  1,
                  0.62
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
          "blend": "normal",
          "time": [
            0,
            0.6
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.18,
              "#fff0c0",
              0.95
            ],
            [
              0.45,
              "#f0b050",
              0.6
            ],
            [
              0.8,
              "#7a4a1a",
              0.15
            ],
            [
              1,
              "#7a4a1a",
              0
            ]
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
                  1
                ],
                [
                  0.35,
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
                  0.1
                ],
                [
                  1,
                  0.42
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 47,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffe2a0",
          "count": 22,
          "radius": 0.62,
          "afterglow": true,
          "glint": true,
          "time": [
            0,
            0.3
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.5,
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
          "seedOffset": 67,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffffff",
          "count": 12,
          "radius": 0.42,
          "afterglow": true,
          "glint": true,
          "time": [
            0.02,
            0.26
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.5,
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
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#ffd890",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.06,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0,
            0.34
          ],
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
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  1,
                  0.58
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  15
                ],
                [
                  1,
                  4
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 12,
          "sizeRange": [
            0.025,
            0.055
          ],
          "speed": [
            0.6,
            1.4
          ],
          "drag": 2.2,
          "gravity": [
            0,
            0.8
          ],
          "lifeMs": [
            260,
            560
          ],
          "delayMs": [
            0,
            40
          ],
          "texture": "plasma",
          "color": "#ffb24a",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0,
            0.75
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
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
          }
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
          "color": "#8a8090",
          "texture": "stone",
          "time": [
            0.16,
            0.8
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
                  0.76
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "aspect": [
            0.658,
            1
          ]
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
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ff5aa8",
          "count": 16,
          "radius": 0.75,
          "afterglow": true,
          "glint": true,
          "time": [
            0.16,
            0.62
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.55,
                  0.45
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
          "color": "#ff8ac8",
          "count": 16,
          "radius": 0.75,
          "afterglow": true,
          "glint": true,
          "time": [
            0.19,
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
                  0.15,
                  1
                ],
                [
                  0.55,
                  0.45
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
      "ms": 269,
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
        "atMs": 269,
        "cueMs": 163
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
          "radius": 0.513,
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
          "radius": 0.378,
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
          "radius": 0.486,
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
          "time": [
            0,
            0.5
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
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  0.9
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
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  0.65
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
          "type": "glow",
          "blend": "normal",
          "time": [
            0,
            0.45
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.2,
              "#e8f8ff",
              0.9
            ],
            [
              0.5,
              "#5ab8ff",
              0.5
            ],
            [
              1,
              "#0a2a5a",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  0.6
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.12
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
          "type": "ring",
          "color": "#c8eeff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.05,
          "strokeProfile": "halo",
          "core": 0.25,
          "time": [
            0,
            0.45
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
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  15
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
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8f2ff",
          "count": 20,
          "radius": 0.75,
          "afterglow": true,
          "glint": true,
          "time": [
            0,
            0.4
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.55,
                  0.45
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
          "motion": "ballistic",
          "emit": "burst",
          "count": 10,
          "sizeRange": [
            0.04,
            0.07
          ],
          "speed": [
            0.7,
            1.4
          ],
          "drag": 2.0,
          "gravity": [
            0,
            0.6
          ],
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
            -3,
            3
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0,
            0.8
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
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
                  1.5
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
          "radius": 0.232,
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
          "radius": 0.2755,
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
          "radius": 0.1087,
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
          "width": 0.0841,
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
          "width": 0.0623,
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
          "count": 22,
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#3a1a0c",
          "texture": "smoke",
          "variant": 2,
          "time": [
            0.05,
            0.85
          ],
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
                  0.6,
                  0.33
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
                  0.25
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
                  -0.9
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
          "color": "#ff6a1e",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
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
                  0.4,
                  0.7
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.2
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.25
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
          "type": "glow",
          "blend": "normal",
          "time": [
            0,
            0.45
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.18,
              "#fff0b0",
              0.95
            ],
            [
              0.45,
              "#ff8a2a",
              0.6
            ],
            [
              0.8,
              "#5a1004",
              0.15
            ],
            [
              1,
              "#5a1004",
              0
            ]
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
                  1
                ],
                [
                  0.35,
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
          "type": "ring",
          "color": "#ffb060",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.15,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0,
            0.36
          ],
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
                  0.75
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  21
                ],
                [
                  1,
                  4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 20,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffd080",
          "count": 20,
          "radius": 0.7,
          "afterglow": true,
          "glint": true,
          "time": [
            0,
            0.3
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.5,
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
          "seedOffset": 11,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 18,
          "sizeRange": [
            0.03,
            0.07
          ],
          "speed": [
            0.7,
            1.6
          ],
          "drag": 2.2,
          "gravity": [
            0,
            0.9
          ],
          "lifeMs": [
            260,
            560
          ],
          "delayMs": [
            0,
            40
          ],
          "texture": "plasma",
          "color": "#ff8a30",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0,
            0.85
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#0a0210",
          "texture": "smoke",
          "time": [
            0,
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
                  0.15,
                  0.95
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.1
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
                  2.0
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
          "color": "#6a1a9a",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "time": [
            0,
            0.75
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2,
                  0.7
                ],
                [
                  0.7,
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
                  0.9
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.5
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -3.2
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
          "orbit": 0.7,
          "orbitVelocity": 0.2,
          "angleSpeed": -2.2,
          "color": "#b070e0",
          "time": [
            0,
            0.55
          ],
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
            "exponent": 1.6
          },
          "radialDelay": 0.2,
          "radialLife": 0.8,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
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
              "texture": "smoke",
              "radiusAbsolute": 0.12,
              "rotationScale": 1,
              "color": "#2a0a3a"
            },
            {
              "texture": "plasma",
              "radiusAbsolute": 0.06,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#c080ff"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "texture": "skull",
          "color": "#e8c8ff",
          "blend": "add",
          "radius": 0.3,
          "time": [
            0.3,
            0.85
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  0.2,
                  0.34
                ],
                [
                  1,
                  0.3
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
          "blend": "normal",
          "time": [
            0.3,
            0.6
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.9
            ],
            [
              0.25,
              "#e8c8ff",
              0.7
            ],
            [
              0.6,
              "#6a1a9a",
              0.3
            ],
            [
              1,
              "#0a0210",
              0
            ]
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
                  1
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
                  0.2
                ],
                [
                  1,
                  0.8
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
          "count": 14,
          "phaseRate": [
            1.4,
            0.7
          ],
          "riseX": [
            0.05,
            0.95
          ],
          "riseY": [
            1.0,
            -0.5
          ],
          "sway": 0.04,
          "swayFrequency": 5,
          "size": 0.08,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#8a3ac8",
          "time": [
            0.35,
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
                  0.1,
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
              "color": "#7a2ab8",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "smoke",
              "color": "#1a0626",
              "radiusScale": 1.4
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
            1
          ],
          "holdEnd": true,
          "filterOrder": [
            "brightness",
            "saturation"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.08,
                  1.6
                ],
                [
                  0.3,
                  0.45
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "smooth"
            },
            "saturation": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  0.15
                ],
                [
                  1,
                  0.1
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
            0.3,
            0.5
          ],
          "holdEnd": true,
          "strength": [
            0.03,
            0.015
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
          "color": "#4b9ccd",
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
          "width": 0.428,
          "noise": 0.067,
          "segments": 40,
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
          "geometry": "filament",
          "strokeProfile": "ribbon",
          "filamentClockRate": 3.5,
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
          "color": "#76b8dc",
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
          "width": 0.2819,
          "noise": 0.0579,
          "segments": 40,
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
          "geometry": "filament",
          "strokeProfile": "ribbon",
          "filamentClockRate": 2.2,
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "beam",
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
          "width": 0.1044,
          "color": "#ffffff",
          "blend": "add",
          "core": 1,
          "noise": 0.0304,
          "segments": 24,
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
          "radius": 0.325,
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
            0.0836
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
          "width": 0.0492,
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
          "width": 0.0324,
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "beam",
          "points": [
            [
              -0.05,
              0
            ],
            [
              0.42,
              0
            ]
          ],
          "width": 0.012,
          "color": "#ffffff",
          "blend": "add",
          "core": 1,
          "noise": 0.01,
          "segments": 24,
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
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#c8f0ff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.5,
          "aspect": [
            1,
            0.08
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
                  0.08,
                  0.9
                ],
                [
                  0.5,
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5a5650",
          "texture": "smoke",
          "variant": 0,
          "time": [
            0,
            0.7
          ],
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
                  0.6,
                  0.36
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
                  0.25
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
          "color": "#8a857a",
          "texture": "smoke",
          "variant": 1,
          "time": [
            0.2,
            0.95
          ],
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
                  0.6,
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
                  0.9
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
                  -0.7
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
            0.14,
            0.24
          ],
          "speed": [
            0.25,
            0.6
          ],
          "drag": 1.6,
          "gravity": [
            0,
            -0.1
          ],
          "lifeMs": [
            500,
            850
          ],
          "delayMs": [
            0,
            220
          ],
          "texture": "smoke",
          "color": "#7a766c",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0,
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
                  0.2,
                  0.65
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
          "blend": "normal",
          "time": [
            0,
            0.4
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.18,
              "#fff0c8",
              0.95
            ],
            [
              0.45,
              "#e8b860",
              0.6
            ],
            [
              0.8,
              "#5a4020",
              0.15
            ],
            [
              1,
              "#5a4020",
              0
            ]
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
                  1
                ],
                [
                  0.35,
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
                  0.1
                ],
                [
                  1,
                  0.42
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
          "color": "#ffe0a0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.06,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0,
            0.32
          ],
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
                  0.7
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  18
                ],
                [
                  1,
                  4
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
          "color": "#e8d0a0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.2,
            0.5
          ],
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
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  12
                ],
                [
                  1,
                  4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 87,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#fff0c8",
          "count": 18,
          "radius": 0.65,
          "afterglow": true,
          "glint": true,
          "time": [
            0,
            0.28
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.5,
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
          "seedOffset": 9,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 10,
          "sizeRange": [
            0.025,
            0.055
          ],
          "speed": [
            0.5,
            1.2
          ],
          "drag": 2.2,
          "gravity": [
            0,
            0.6
          ],
          "lifeMs": [
            260,
            560
          ],
          "delayMs": [
            0,
            40
          ],
          "texture": "plasma",
          "color": "#ffd080",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0,
            0.7
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
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
          }
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
      "color": "#ffc75a",
      "light": "#fff1c4",
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
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ffc75a",
          "width": 4,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.6,
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
                  0.08,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.3
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.1,
          "color": "#fff1c4",
          "width": 2,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.8,
          "blend": "add",
          "time": [
            0.04,
            0.5
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
                  0.8
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.3
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "blend": "normal",
          "time": [
            0,
            0.36
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.18,
              "#fff6d8",
              0.95
            ],
            [
              0.45,
              "#ffc75a",
              0.6
            ],
            [
              0.8,
              "#6a4a10",
              0.15
            ],
            [
              1,
              "#6a4a10",
              0
            ]
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
                  1
                ],
                [
                  0.35,
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
                  0.1
                ],
                [
                  1,
                  0.4
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
          "color": "#ffe8a8",
          "texture": "glow",
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
                  0
                ],
                [
                  0.1,
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
                  0.2
                ],
                [
                  1,
                  0.75
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
          "color": "#fff1c4",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.06,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0,
            0.3
          ],
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
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  1,
                  0.55
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  15
                ],
                [
                  1,
                  4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 10,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#fff1c4",
          "count": 16,
          "radius": 0.5,
          "afterglow": true,
          "glint": true,
          "time": [
            0,
            0.24
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.5,
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
        }
      ]
    },
    {
      "name": "seal-release",
      "label": "封印の解放 · K019",
      "sourceCode": "K019",
      "ms": 5250,
      "color": "#a46ac0",
      "light": "#f4e8ff",
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#14061e",
          "texture": "smoke",
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
                  0.3,
                  0.85
                ],
                [
                  0.9,
                  0.9
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
          "shape": "rune-wheel",
          "color": "#a050d8",
          "light": "#f0d8ff",
          "shadow": "#2a0a40",
          "radius": 0.6,
          "time": [
            0,
            0.5
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
                  0.6
                ],
                [
                  0.9,
                  0.7
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
                  1.8
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.85
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.3
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#8a40c8",
          "texture": "plasma",
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
                  0
                ],
                [
                  0.4,
                  0.45
                ],
                [
                  0.95,
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
                  0.55
                ],
                [
                  1,
                  0.38
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.5
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -2.4
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
          "orbit": 0.55,
          "orbitVelocity": 0.1,
          "angleSpeed": -1.6,
          "color": "#c890ff",
          "time": [
            0.05,
            0.5
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.3
              ],
              [
                1,
                0.35
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.4
          },
          "radialDelay": 0.2,
          "radialLife": 0.8,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
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
              "radiusAbsolute": 0.07,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#b070ff"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "blend": "add",
              "color": "#f4e8ff"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#fff0ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.38,
            0.52
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.8,
                  0.9
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.5
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.5
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
            0.35,
            0.75
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
                  0.35,
                  1.5
                ],
                [
                  0.45,
                  2.0
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
            0.38,
            0.52
          ],
          "holdEnd": true,
          "strength": [
            0.012,
            0.012
          ],
          "frequencyHz": [
            24,
            20
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
              "interpolation": "power-in",
              "exponent": 2
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "blend": "normal",
          "time": [
            0.5,
            0.75
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.2,
              "#fff4ff",
              0.9
            ],
            [
              0.5,
              "#c080ff",
              0.5
            ],
            [
              1,
              "#2a0a40",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
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
              "exponent": 1.3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  1.1
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
          "color": "#e0c0ff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.06,
          "strokeProfile": "halo",
          "core": 0.25,
          "time": [
            0.5,
            0.7
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
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  1.3
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  18
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 16,
          "sizeRange": [
            0.05,
            0.1
          ],
          "speed": [
            0.9,
            1.8
          ],
          "drag": 2.0,
          "gravity": [
            0,
            0.8
          ],
          "lifeMs": [
            500,
            900
          ],
          "delayMs": [
            0,
            30
          ],
          "shape": "rough-polygon",
          "color": "#9a5ad8",
          "light": "#f0d8ff",
          "shadow": "#2a0a40",
          "spin": [
            -3,
            3
          ],
          "emissionArc": [
            0,
            6.283
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
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#fff0ff",
          "count": 18,
          "radius": 1.0,
          "afterglow": true,
          "glint": true,
          "time": [
            0.5,
            0.75
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.55,
                  0.45
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
          "motion": "rise",
          "count": 14,
          "phaseRate": [
            1.2,
            0.6
          ],
          "riseX": [
            0.08,
            0.92
          ],
          "riseY": [
            1.0,
            -0.4
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.07,
          "sizeSize": 0.04,
          "sizePhase": -0.05,
          "color": "#e0c0ff",
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
                  0.1,
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
          },
          "materials": [
            {
              "texture": "plasma",
              "color": "#c080ff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff4ff",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "blend": "normal",
          "aspect": [
            0.45,
            2.6
          ],
          "offset": [
            0,
            -0.6
          ],
          "time": [
            0.05,
            0.75
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.85
            ],
            [
              0.25,
              "#e8f8ff",
              0.65
            ],
            [
              0.6,
              "#7ad0f0",
              0.25
            ],
            [
              1,
              "#1a4a6a",
              0
            ]
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
                  0.75
                ],
                [
                  0.8,
                  1
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
                  1,
                  0.55
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
          "orbit": 0.6,
          "orbitVelocity": 0.15,
          "angleSpeed": 1.4,
          "color": "#d8f6ff",
          "time": [
            0.1,
            0.5
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.4
              ],
              [
                1,
                0.05
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.5
          },
          "radialDelay": 0.25,
          "radialLife": 0.75,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
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
              "texture": "glow",
              "radiusAbsolute": 0.1,
              "aspect": [
                0.6,
                1.4
              ],
              "rotationScale": 1,
              "blend": "add",
              "color": "#9fe0ff"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.05,
              "blend": "add",
              "color": "#ffffff"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#bfeaff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.25,
            0.52
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.85,
                  0.8
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.5
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "blend": "normal",
          "time": [
            0.5,
            0.8
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.2,
              "#f0fbff",
              0.9
            ],
            [
              0.5,
              "#7ad0f0",
              0.5
            ],
            [
              1,
              "#123a5a",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
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
              "exponent": 1.3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  1.0
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
          "color": "#c8f0ff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.04,
          "strokeProfile": "halo",
          "core": 0.25,
          "time": [
            0.5,
            0.78
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
              "interpolation": "power-out",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
                ],
                [
                  1,
                  1.2
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  16
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 8,
          "sizeRange": [
            0.07,
            0.11
          ],
          "speed": [
            0.3,
            0.7
          ],
          "direction": [
            3.9,
            5.5
          ],
          "gravity": [
            0,
            -0.4
          ],
          "drag": 1.2,
          "spin": [
            -1.5,
            1.5
          ],
          "lifeMs": [
            700,
            1000
          ],
          "delayMs": [
            0,
            120
          ],
          "shape": "feather",
          "color": "#e8f8ff",
          "light": "#ffffff",
          "shadow": "#6aaed0",
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
                  0.12,
                  0.95
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
          "color": "#e8f8ff",
          "count": 16,
          "radius": 0.9,
          "afterglow": true,
          "glint": true,
          "time": [
            0.5,
            0.8
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.55,
                  0.45
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
          "motion": "rise",
          "count": 12,
          "phaseRate": [
            1.1,
            0.5
          ],
          "riseX": [
            0.08,
            0.92
          ],
          "riseY": [
            1.0,
            -0.4
          ],
          "sway": 0.03,
          "swayFrequency": 4,
          "size": 0.06,
          "sizeSize": 0.04,
          "sizePhase": -0.05,
          "color": "#bfeaff",
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
                  0.15,
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
              "color": "#7ad0f0",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#ffffff",
              "radiusScale": 0.5,
              "blend": "add"
            }
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
        "atMs": 705,
        "cueMs": 705
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#0a3a14",
          "texture": "smoke",
          "radius": 0.8,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0.7
                ],
                [
                  0.8,
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
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5ad87a",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.46,
          "time": [
            0,
            0.85
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.85
                ],
                [
                  0.75,
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
                  0.2
                ],
                [
                  0.45,
                  0.62
                ],
                [
                  1,
                  0.64
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
          "color": "#5ad87a",
          "light": "#e8ffe8",
          "shadow": "#0a3a14",
          "radius": 0.38,
          "time": [
            0.05,
            0.8
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.7
                ],
                [
                  0.8,
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
                  0.16
                ],
                [
                  0.45,
                  0.5
                ],
                [
                  1,
                  0.52
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
                  -1.4
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
          "orbit": 0.45,
          "orbitVelocity": 0.12,
          "angleSpeed": 1.6,
          "color": "#e8ffe8",
          "time": [
            0,
            0.45
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.4
              ],
              [
                1,
                0.1
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.4
          },
          "radialDelay": 0.25,
          "radialLife": 0.75,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.9,
                  0.9
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
              "radiusAbsolute": 0.07,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#5ad87a"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "blend": "add",
              "color": "#e8ffe8"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "blend": "normal",
          "time": [
            0.36,
            0.88
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.3,
              "#d8ffd8",
              0.75
            ],
            [
              0.65,
              "#5ad87a",
              0.3
            ],
            [
              1,
              "#0a3a14",
              0
            ]
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
                  1
                ],
                [
                  0.55,
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
                  0.08
                ],
                [
                  0.4,
                  0.5
                ],
                [
                  1,
                  0.6
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
          "color": "#c7f0b0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.06,
          "strokeProfile": "halo",
          "time": [
            0.46,
            0.82
          ],
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
              "exponent": 1.5
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
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
                  6
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
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.45,
            0.65
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
                  0.9
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
          "motion": "radial-drag",
          "color": "#c7de8c",
          "count": 40,
          "vortex": 0.9,
          "radius": 1,
          "time": [
            0.47,
            0.92
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
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
            0.45,
            0.75
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
                  1.6
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
          "shape": "crystal-gem",
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
                  0.829
                ],
                [
                  0.14,
                  1.04
                ],
                [
                  0.3,
                  0.786
                ],
                [
                  0.46,
                  1.04
                ],
                [
                  0.62,
                  0.786
                ],
                [
                  0.78,
                  1.008
                ],
                [
                  1,
                  0.78
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
          "shape": "crystal-gem",
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
                  0.829
                ],
                [
                  0.14,
                  1.04
                ],
                [
                  0.3,
                  0.786
                ],
                [
                  0.46,
                  1.04
                ],
                [
                  0.62,
                  0.786
                ],
                [
                  0.78,
                  1.008
                ],
                [
                  1,
                  0.78
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
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.3,
          "aspect": [
            0.06,
            0.95
          ],
          "time": [
            0.06,
            0.9
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
                  0.159,
                  0
                ],
                [
                  0.16,
                  0
                ],
                [
                  0.24,
                  0.85
                ],
                [
                  0.319,
                  0
                ],
                [
                  0.32,
                  0
                ],
                [
                  0.4,
                  0.85
                ],
                [
                  0.479,
                  0
                ],
                [
                  0.48,
                  0
                ],
                [
                  0.56,
                  0.85
                ],
                [
                  0.639,
                  0
                ],
                [
                  0.64,
                  0
                ],
                [
                  0.72,
                  0.85
                ],
                [
                  0.799,
                  0
                ],
                [
                  0.8,
                  0
                ],
                [
                  0.88,
                  0.85
                ],
                [
                  0.959,
                  0
                ],
                [
                  0.96,
                  0
                ],
                [
                  0.98,
                  0.85
                ],
                [
                  0.999,
                  0
                ]
              ],
              "interpolation": "linear"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  -0.11
                ],
                [
                  0.159,
                  0.11
                ],
                [
                  0.16,
                  -0.11
                ],
                [
                  0.319,
                  0.11
                ],
                [
                  0.32,
                  -0.11
                ],
                [
                  0.479,
                  0.11
                ],
                [
                  0.48,
                  -0.11
                ],
                [
                  0.639,
                  0.11
                ],
                [
                  0.64,
                  -0.11
                ],
                [
                  0.799,
                  0.11
                ],
                [
                  0.8,
                  -0.11
                ],
                [
                  0.959,
                  0.11
                ],
                [
                  0.96,
                  -0.11
                ],
                [
                  0.999,
                  0.11
                ]
              ],
              "interpolation": "linear"
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
          "radius": 0.3,
          "aspect": [
            0.04,
            0.95
          ],
          "time": [
            0.06,
            0.9
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
                  0
                ],
                [
                  0.16,
                  0.45
                ],
                [
                  0.239,
                  0
                ],
                [
                  0.24,
                  0
                ],
                [
                  0.32,
                  0.45
                ],
                [
                  0.399,
                  0
                ],
                [
                  0.4,
                  0
                ],
                [
                  0.48,
                  0.45
                ],
                [
                  0.559,
                  0
                ],
                [
                  0.56,
                  0
                ],
                [
                  0.64,
                  0.45
                ],
                [
                  0.719,
                  0
                ],
                [
                  0.72,
                  0
                ],
                [
                  0.8,
                  0.45
                ],
                [
                  0.879,
                  0
                ],
                [
                  0.88,
                  0
                ],
                [
                  0.94,
                  0.45
                ],
                [
                  0.999,
                  0
                ]
              ],
              "interpolation": "linear"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.11
                ],
                [
                  0.08,
                  -0.11
                ],
                [
                  0.239,
                  0.11
                ],
                [
                  0.24,
                  -0.11
                ],
                [
                  0.399,
                  0.11
                ],
                [
                  0.4,
                  -0.11
                ],
                [
                  0.559,
                  0.11
                ],
                [
                  0.56,
                  -0.11
                ],
                [
                  0.719,
                  0.11
                ],
                [
                  0.72,
                  -0.11
                ],
                [
                  0.879,
                  0.11
                ],
                [
                  0.88,
                  -0.11
                ],
                [
                  0.999,
                  0.11
                ]
              ],
              "interpolation": "linear"
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
          "shape": "flare",
          "radius": 0.12,
          "color": "#ffffff",
          "light": "#ffffff",
          "shadow": "#bfe8ff",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0
                ],
                [
                  0.14,
                  0.9
                ],
                [
                  0.22,
                  0
                ],
                [
                  0.42,
                  0
                ],
                [
                  0.46,
                  0.9
                ],
                [
                  0.54,
                  0
                ],
                [
                  0.74,
                  0
                ],
                [
                  0.78,
                  0.8
                ],
                [
                  0.86,
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
            "shiftX": {
              "keys": [
                [
                  0,
                  -0.05
                ],
                [
                  0.14,
                  -0.12
                ],
                [
                  0.3,
                  0.04
                ],
                [
                  0.46,
                  -0.12
                ],
                [
                  0.62,
                  0.04
                ],
                [
                  0.78,
                  -0.1
                ],
                [
                  1,
                  0.02
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "add"
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
          "color": "#4a3008",
          "texture": "smoke",
          "radius": 0.9,
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0484,
                  0.28
                ],
                [
                  0.5947,
                  0.28
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  1
                ],
                [
                  0.3,
                  0.62
                ],
                [
                  1.0,
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
                  0.0,
                  0
                ],
                [
                  1.0,
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
          "color": "#ffb020",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0581,
                  0.3
                ],
                [
                  0.3,
                  0.55
                ],
                [
                  0.7237,
                  0.4
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  1.1
                ],
                [
                  0.3,
                  0.6
                ],
                [
                  1.0,
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
          "color": "#ffc040",
          "light": "#fff2b8",
          "shadow": "#a07010",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0484,
                  0.42
                ],
                [
                  0.3,
                  0.55
                ],
                [
                  0.6316,
                  0.2
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.72
                ],
                [
                  0.3,
                  0.3
                ],
                [
                  1.0,
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
                  0.0,
                  0
                ],
                [
                  1.0,
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
          "color": "#ffd870",
          "light": "#fffbe8",
          "shadow": "#b08010",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0677,
                  0.25
                ],
                [
                  0.3,
                  0.4
                ],
                [
                  0.6316,
                  0.15
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.62
                ],
                [
                  0.3,
                  0.25
                ],
                [
                  1.0,
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
                  0.0,
                  2
                ],
                [
                  1.0,
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
          "color": "#ffc040",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0484,
                  0.85
                ],
                [
                  0.3,
                  0.9
                ],
                [
                  0.6316,
                  0.3
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0.0,
                  0.66
                ],
                [
                  0.3,
                  0.27
                ],
                [
                  1.0,
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
              "color": "#ffb020",
              "blend": "add"
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.08,
              "rotationScale": -1,
              "color": "#fff2b8",
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
          "color": "#ffe6a0",
          "width": 2.2,
          "widthSpace": "pixel",
          "noise": 0.03,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0484,
                  0.7
                ],
                [
                  0.3,
                  0.95
                ],
                [
                  0.6684,
                  0.4
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.66
                ],
                [
                  0.3,
                  0.27
                ],
                [
                  1.0,
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
          "color": "#ffc848",
          "radialCurve": {
            "keys": [
              [
                0.0,
                1.9
              ],
              [
                1.0,
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
                  0.0,
                  0
                ],
                [
                  0.029,
                  0.95
                ],
                [
                  0.3737,
                  0.9
                ],
                [
                  0.5947,
                  0
                ],
                [
                  1.0,
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
              "color": "#ffb020",
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
              "color": "#fff2b8",
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
          "color": "#ffc040",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0484,
                  0.4
                ],
                [
                  0.3,
                  1
                ],
                [
                  0.7237,
                  0.8
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.1
                ],
                [
                  0.3,
                  0.28
                ],
                [
                  1.0,
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
                  0.0,
                  0
                ],
                [
                  1.0,
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
          "color": "#fff8e0",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0484,
                  0.3
                ],
                [
                  0.3,
                  0.95
                ],
                [
                  0.6316,
                  0.75
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.16
                ],
                [
                  0.3,
                  0.36
                ],
                [
                  1.0,
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
          "color": "#fff4c8",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.1935,
                  0
                ],
                [
                  0.3,
                  0.9
                ],
                [
                  0.7237,
                  0.6
                ],
                [
                  1.0,
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
            0.3,
            0.7237
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
            0.2903,
            0.4842
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "rise",
          "count": 12,
          "phaseRate": [
            1.6,
            0.8
          ],
          "riseX": [
            0.12,
            0.88
          ],
          "riseY": [
            1.0,
            -0.5
          ],
          "sway": 0,
          "swayFrequency": 1,
          "size": 0.08,
          "sizeSize": 0.04,
          "sizePhase": -0.04,
          "color": "#ffd040",
          "time": [
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
                  0.12,
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
            }
          },
          "materials": [
            {
              "texture": "glow",
              "color": "#ffc030",
              "blend": "add",
              "aspect": [
                0.26,
                1.8
              ],
              "rotationScale": 0
            },
            {
              "texture": "glow",
              "color": "#fff4c8",
              "radiusScale": 0.45,
              "aspect": [
                0.24,
                1.5
              ],
              "blend": "add",
              "rotationScale": 0
            }
          ]
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
          "color": "#0a2a34",
          "texture": "smoke",
          "radius": 0.9,
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0581,
                  0.28
                ],
                [
                  0.6295,
                  0.28
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  1
                ],
                [
                  0.36,
                  0.62
                ],
                [
                  1.0,
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
                  0.0,
                  0
                ],
                [
                  1.0,
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
          "color": "#2fb8d0",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0697,
                  0.3
                ],
                [
                  0.36,
                  0.55
                ],
                [
                  0.7474,
                  0.4
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  1.1
                ],
                [
                  0.36,
                  0.6
                ],
                [
                  1.0,
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
          "color": "#4fc8d8",
          "light": "#d0f8ff",
          "shadow": "#14607a",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0581,
                  0.42
                ],
                [
                  0.36,
                  0.55
                ],
                [
                  0.6632,
                  0.2
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.72
                ],
                [
                  0.36,
                  0.3
                ],
                [
                  1.0,
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
                  0.0,
                  0
                ],
                [
                  1.0,
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
          "color": "#7fe0f0",
          "light": "#f0feff",
          "shadow": "#2090a8",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0813,
                  0.25
                ],
                [
                  0.36,
                  0.4
                ],
                [
                  0.6632,
                  0.15
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.62
                ],
                [
                  0.36,
                  0.25
                ],
                [
                  1.0,
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
                  0.0,
                  2
                ],
                [
                  1.0,
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
          "color": "#4fc8d8",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0581,
                  0.85
                ],
                [
                  0.36,
                  0.9
                ],
                [
                  0.6632,
                  0.3
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "orbit": {
              "keys": [
                [
                  0.0,
                  0.66
                ],
                [
                  0.36,
                  0.27
                ],
                [
                  1.0,
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
              "color": "#2fb8d0",
              "blend": "add"
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.08,
              "rotationScale": -1,
              "color": "#d0f8ff",
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
          "color": "#bff4ff",
          "width": 2.2,
          "widthSpace": "pixel",
          "noise": 0.03,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0581,
                  0.7
                ],
                [
                  0.36,
                  0.95
                ],
                [
                  0.6968,
                  0.4
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.66
                ],
                [
                  0.36,
                  0.27
                ],
                [
                  1.0,
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
          "color": "#5fd8e8",
          "radialCurve": {
            "keys": [
              [
                0.0,
                1.9
              ],
              [
                1.0,
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
                  0.0,
                  0
                ],
                [
                  0.0348,
                  0.95
                ],
                [
                  0.4274,
                  0.9
                ],
                [
                  0.6295,
                  0
                ],
                [
                  1.0,
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
              "color": "#2fb8d0",
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
              "color": "#d0f8ff",
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
          "color": "#5fd8e8",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0581,
                  0.4
                ],
                [
                  0.36,
                  1
                ],
                [
                  0.7474,
                  0.8
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.1
                ],
                [
                  0.36,
                  0.28
                ],
                [
                  1.0,
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
                  0.0,
                  0
                ],
                [
                  1.0,
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
          "color": "#f0feff",
          "texture": "glow",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.0581,
                  0.3
                ],
                [
                  0.36,
                  0.95
                ],
                [
                  0.6632,
                  0.75
                ],
                [
                  1.0,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0.0,
                  0.16
                ],
                [
                  0.36,
                  0.36
                ],
                [
                  1.0,
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
          "color": "#e0fbff",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0.0,
                  0
                ],
                [
                  0.2323,
                  0
                ],
                [
                  0.36,
                  0.9
                ],
                [
                  0.7474,
                  0.6
                ],
                [
                  1.0,
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
            0.36,
            0.7474
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
            0.3484,
            0.5284
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
          "orbit": 0.7,
          "orbitVelocity": 0.2,
          "angleSpeed": 1.4,
          "directedSpin": true,
          "color": "#bff4ff",
          "time": [
            0,
            0.36
          ],
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
            "exponent": 1.5
          },
          "radialDelay": 0.2,
          "radialLife": 0.8,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  0.9
                ],
                [
                  0.85,
                  0.9
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
              "radiusAbsolute": 0.12,
              "aspect": [
                0.55,
                1.5
              ],
              "rotationScale": 1,
              "blend": "add",
              "color": "#9fe8f8"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.08,
              "blend": "add",
              "color": "#e0fbff"
            }
          ]
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
          "color": "#0e3a06",
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
                  0.0645,
                  0.28
                ],
                [
                  0.6526,
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
                  0.4,
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
          "color": "#4ac81a",
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
                  0.0774,
                  0.3
                ],
                [
                  0.4,
                  0.55
                ],
                [
                  0.7632,
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
                  0.4,
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
          "color": "#62d830",
          "light": "#e0ffc0",
          "shadow": "#1e6a0c",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.0645,
                  0.42
                ],
                [
                  0.4,
                  0.55
                ],
                [
                  0.6842,
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
                  0.4,
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
          "color": "#8ae850",
          "light": "#f4ffe0",
          "shadow": "#2a8a14",
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
                  0.0903,
                  0.25
                ],
                [
                  0.4,
                  0.4
                ],
                [
                  0.6842,
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
                  0.4,
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
          "color": "#62d830",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.0645,
                  0.85
                ],
                [
                  0.4,
                  0.9
                ],
                [
                  0.6842,
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
                  0.4,
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
              "color": "#4ac81a",
              "blend": "add"
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.08,
              "rotationScale": -1,
              "color": "#e0ffc0",
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
          "color": "#c0f0a0",
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
                  0.0645,
                  0.7
                ],
                [
                  0.4,
                  0.95
                ],
                [
                  0.7158,
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
                  0.4,
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
          "color": "#6ad83a",
          "radialCurve": {
            "keys": [
              [
                0,
                1.15
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
                  0.0387,
                  0.95
                ],
                [
                  0.4632,
                  0.9
                ],
                [
                  0.6526,
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
              "color": "#4ac81a",
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
              "color": "#e0ffc0",
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
          "color": "#6ad83a",
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
                  0.0645,
                  0.4
                ],
                [
                  0.4,
                  1
                ],
                [
                  0.7632,
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
                  0.4,
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
          "color": "#f0ffe0",
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
                  0.0645,
                  0.3
                ],
                [
                  0.4,
                  0.95
                ],
                [
                  0.6842,
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
                  0.4,
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
          "color": "#e0ffc8",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2581,
                  0
                ],
                [
                  0.4,
                  0.9
                ],
                [
                  0.7632,
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
            0.4,
            0.7632
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
            0.3871,
            0.5579
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
            0.05,
            0.08
          ],
          "speed": [
            0.4,
            0.9
          ],
          "drag": 1.8,
          "gravity": [
            0,
            -0.25
          ],
          "lifeMs": [
            500,
            800
          ],
          "delayMs": [
            0,
            80
          ],
          "texture": "plasma",
          "color": "#7ae04a",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.4,
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
                  0.15,
                  0.9
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
      "label": "着地の砂煙 · appearance",
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
        "atMs": 588,
        "cueMs": 588
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#8a7350",
          "texture": "smoke",
          "variant": 0,
          "offset": [
            -0.16,
            0.27
          ],
          "aspect": [
            2.7,
            0.8
          ],
          "time": [
            0.4,
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
                  0.06,
                  1
                ],
                [
                  0.3,
                  0.837
                ],
                [
                  0.75,
                  0.243
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
                  1,
                  0.14
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.35
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
          "color": "#5c4a33",
          "texture": "smoke",
          "variant": 2,
          "offset": [
            -0.2,
            0.295
          ],
          "aspect": [
            3.1,
            0.65
          ],
          "time": [
            0.4,
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
                  0.08,
                  0.81
                ],
                [
                  0.35,
                  0.54
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
                  0.05
                ],
                [
                  1,
                  0.115
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -0.3
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
          "count": 13,
          "emission": "rect",
          "offset": [
            -0.1,
            0.28
          ],
          "extent": [
            0.05,
            0.015
          ],
          "direction": [
            3,
            3.5
          ],
          "directionSpace": "absolute",
          "speed": [
            1.2,
            2
          ],
          "drag": 0.9,
          "gravity": [
            0,
            -0.05
          ],
          "lifeMs": [
            650,
            1050
          ],
          "delayMs": [
            0,
            60
          ],
          "sizeRange": [
            0.1,
            0.16
          ],
          "sizeEnd": 2.6,
          "particleRotation": [
            0,
            6.28
          ],
          "spin": [
            -1.2,
            1.2
          ],
          "texture": "smoke",
          "color": "#957b54",
          "time": [
            0.4,
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
                  0.1,
                  0.8
                ],
                [
                  0.45,
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
          "seedOffset": 7,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "count": 10,
          "emission": "rect",
          "offset": [
            0.12,
            0.29
          ],
          "extent": [
            0.08,
            0.015
          ],
          "direction": [
            2.95,
            3.3
          ],
          "directionSpace": "absolute",
          "speed": [
            1.5,
            2.4
          ],
          "drag": 0.9,
          "gravity": [
            0,
            -0.05
          ],
          "lifeMs": [
            650,
            1050
          ],
          "delayMs": [
            0,
            60
          ],
          "sizeRange": [
            0.1,
            0.16
          ],
          "sizeEnd": 2.6,
          "particleRotation": [
            0,
            6.28
          ],
          "spin": [
            -1.2,
            1.2
          ],
          "texture": "smoke",
          "color": "#957b54",
          "time": [
            0.4,
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
                  0.1,
                  0.8
                ],
                [
                  0.45,
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
          "seedOffset": 13,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "count": 11,
          "emission": "rect",
          "offset": [
            0,
            0.25
          ],
          "extent": [
            0.17,
            0.03
          ],
          "direction": [
            -2.95,
            -2.05
          ],
          "directionSpace": "absolute",
          "speed": [
            0.35,
            0.6
          ],
          "drag": 0.7,
          "gravity": [
            0,
            -0.03
          ],
          "lifeMs": [
            600,
            900
          ],
          "delayMs": [
            30,
            120
          ],
          "sizeRange": [
            0.08,
            0.13
          ],
          "sizeEnd": 1.8,
          "particleRotation": [
            0,
            6.28
          ],
          "texture": "smoke",
          "color": "#a48a62",
          "time": [
            0.4,
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
                  0.15,
                  0.5
                ],
                [
                  0.5,
                  0.34
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
          "seedOffset": 21,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "count": 16,
          "emission": "rect",
          "offset": [
            0,
            0.29
          ],
          "extent": [
            0.12,
            0.01
          ],
          "direction": [
            -2.95,
            -2.2
          ],
          "directionSpace": "absolute",
          "speed": [
            1,
            1.8
          ],
          "drag": 1.6,
          "gravity": [
            0,
            1.6
          ],
          "lifeMs": [
            320,
            560
          ],
          "delayMs": [
            0,
            50
          ],
          "sizeRange": [
            0.006,
            0.011
          ],
          "particleRotation": [
            0,
            6.28
          ],
          "shape": "rough-polygon",
          "color": "#9c8458",
          "blend": "normal",
          "time": [
            0.4,
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
                  0.06,
                  0.9
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
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "offset": [
            0,
            0.3
          ],
          "aspect": [
            3.2,
            0.32
          ],
          "blend": "add",
          "time": [
            0.4,
            0.72
          ],
          "stops": [
            [
              0,
              "#fff4cc",
              0.95
            ],
            [
              0.35,
              "#ffd27a",
              0.55
            ],
            [
              0.7,
              "#a87a2c",
              0.18
            ],
            [
              1,
              "#5a3c10",
              0
            ]
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
                  0.03
                ],
                [
                  1,
                  0.075
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
          "type": "card",
          "time": [
            0.4,
            0.7
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
                  1.22
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
      "name": "board-summon",
      "label": "召喚マスへの変化 · board_change1",
      "sourceCode": "board_change1",
      "ms": 1800,
      "color": "#5ad87a",
      "light": "#e8ffe8",
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#0a3a14",
          "texture": "smoke",
          "time": [
            0,
            0.9
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.6
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
                  0.6
                ],
                [
                  1,
                  0.46
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
          "type": "glow",
          "color": "#5ad87a",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.46,
          "time": [
            0,
            0.85
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.85
                ],
                [
                  0.75,
                  0.7
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
                  1.6
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.66
                ],
                [
                  0.5,
                  0.42
                ],
                [
                  1,
                  0.44
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
          "shape": "rune-wheel",
          "color": "#5ad87a",
          "light": "#e8ffe8",
          "shadow": "#0a3a14",
          "radius": 0.38,
          "time": [
            0.05,
            0.8
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.7
                ],
                [
                  0.8,
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
                  1,
                  -1.2
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.56
                ],
                [
                  0.55,
                  0.34
                ],
                [
                  1,
                  0.36
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
          "count": 16,
          "countScale": "none",
          "orbit": 0.45,
          "orbitVelocity": 0.12,
          "angleSpeed": 1.6,
          "color": "#e8ffe8",
          "time": [
            0,
            0.4166666666666667
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.4
              ],
              [
                1,
                0.1
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.4
          },
          "radialDelay": 0.25,
          "radialLife": 0.75,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.9,
                  0.9
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
              "radiusAbsolute": 0.07,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#5ad87a"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "blend": "add",
              "color": "#e8ffe8"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "geometry": "card",
          "pad": 0,
          "color": "#5ad87a",
          "width": 4,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.4166666666666667,
            0.95
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
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.3
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "blend": "normal",
          "time": [
            0.4166666666666667,
            0.7666666666666666
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.25,
              "#e8ffe8",
              0.8
            ],
            [
              0.6,
              "#5ad87a",
              0.35
            ],
            [
              1,
              "#0a3a14",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
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
              "exponent": 1.3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  0.6
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
          "motion": "radial-drag",
          "color": "#e8ffe8",
          "count": 14,
          "radius": 0.55,
          "afterglow": true,
          "glint": true,
          "time": [
            0.4166666666666667,
            0.7666666666666666
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.55,
                  0.45
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
          "motion": "rise",
          "count": 12,
          "phaseRate": [
            1.1,
            0.5
          ],
          "riseX": [
            0.08,
            0.92
          ],
          "riseY": [
            1,
            -0.2
          ],
          "sway": 0.03,
          "swayFrequency": 4,
          "size": 0.06,
          "sizeSize": 0.04,
          "sizePhase": -0.05,
          "color": "#5ad87a",
          "time": [
            0.4166666666666667,
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
                  0.15,
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
              "color": "#5ad87a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#e8ffe8",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    },
    {
      "name": "board-enchant",
      "label": "強化マスへの変化 · board_change2",
      "sourceCode": "board_change2",
      "ms": 1800,
      "color": "#5aa8ff",
      "light": "#e8f4ff",
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#0a2a5a",
          "texture": "smoke",
          "time": [
            0,
            0.9
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.6
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
                  0.6
                ],
                [
                  1,
                  0.46
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
          "type": "glow",
          "color": "#5aa8ff",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.46,
          "time": [
            0,
            0.85
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.85
                ],
                [
                  0.75,
                  0.7
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
                  1.6
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.66
                ],
                [
                  0.5,
                  0.42
                ],
                [
                  1,
                  0.44
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
          "shape": "rune-wheel",
          "color": "#5aa8ff",
          "light": "#e8f4ff",
          "shadow": "#0a2a5a",
          "radius": 0.38,
          "time": [
            0.05,
            0.8
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.7
                ],
                [
                  0.8,
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
                  1,
                  -1.2
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.56
                ],
                [
                  0.55,
                  0.34
                ],
                [
                  1,
                  0.36
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
          "count": 16,
          "countScale": "none",
          "orbit": 0.45,
          "orbitVelocity": 0.12,
          "angleSpeed": 1.6,
          "color": "#e8f4ff",
          "time": [
            0,
            0.4166666666666667
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.4
              ],
              [
                1,
                0.1
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.4
          },
          "radialDelay": 0.25,
          "radialLife": 0.75,
          "skipNonPositiveRadius": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.9,
                  0.9
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
              "radiusAbsolute": 0.07,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#5aa8ff"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "blend": "add",
              "color": "#e8f4ff"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "ring",
          "geometry": "card",
          "pad": 0,
          "color": "#5aa8ff",
          "width": 4,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.4166666666666667,
            0.95
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
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.3
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "blend": "normal",
          "time": [
            0.4166666666666667,
            0.7666666666666666
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.25,
              "#e8f4ff",
              0.8
            ],
            [
              0.6,
              "#5aa8ff",
              0.35
            ],
            [
              1,
              "#0a2a5a",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
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
              "exponent": 1.3
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  1,
                  0.6
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
          "motion": "radial-drag",
          "color": "#e8f4ff",
          "count": 14,
          "radius": 0.55,
          "afterglow": true,
          "glint": true,
          "time": [
            0.4166666666666667,
            0.7666666666666666
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.15,
                  1
                ],
                [
                  0.55,
                  0.45
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
          "motion": "rise",
          "count": 12,
          "phaseRate": [
            1.1,
            0.5
          ],
          "riseX": [
            0.08,
            0.92
          ],
          "riseY": [
            1,
            -0.2
          ],
          "sway": 0.03,
          "swayFrequency": 4,
          "size": 0.06,
          "sizeSize": 0.04,
          "sizePhase": -0.05,
          "color": "#5aa8ff",
          "time": [
            0.4166666666666667,
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
                  0.15,
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
              "color": "#5aa8ff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#e8f4ff",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    }
  ]
});
