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
VbFxDefs.register({
  "schemaVersion": 2,
  "effects": [
    {
      "name": "hit-burst",
      "label": "被弾 · hit",
      "sourceCode": "hit",
      "ms": 1200.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "blend": "normal",
          "softness": 0.018
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "blend": "normal",
          "softness": 0.012
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
      "ms": 1050.0,
      "color": "#d75928",
      "light": "#f3b16a",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "fog",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#8c382f",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.1584
                ],
                [
                  0.35,
                  0.4752
                ],
                [
                  0.6,
                  0.5456
                ],
                [
                  0.77,
                  0.264
                ],
                [
                  0.93,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "mode": "cloud",
          "count": 8,
          "radius": 0.25,
          "extent": [
            0.73,
            0.77
          ],
          "texture": "smoke",
          "blend": "normal",
          "flow": [
            0,
            -0.03
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c66a3c",
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
                  0.375,
                  0.49
                ],
                [
                  0.5,
                  0.54
                ],
                [
                  0.625,
                  0.44
                ],
                [
                  0.77,
                  0.24
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
            "orbit": {
              "keys": [
                [
                  0,
                  0.56
                ],
                [
                  0.25,
                  0.7
                ],
                [
                  0.5,
                  0.74
                ],
                [
                  0.72,
                  0.76
                ],
                [
                  1,
                  0.78
                ]
              ],
              "interpolation": "smooth"
            },
            "angularProgress": {
              "keys": [
                [
                  0,
                  0.04
                ],
                [
                  0.125,
                  0.153846
                ],
                [
                  0.25,
                  0.384615
                ],
                [
                  0.375,
                  0.538462
                ],
                [
                  0.5,
                  1.038462
                ],
                [
                  0.625,
                  1.223077
                ],
                [
                  0.75,
                  1.307692
                ],
                [
                  1,
                  1.769231
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "motion": "orbit",
          "count": 4,
          "countScale": "none",
          "size": 0.13,
          "orbit": 0.73,
          "light": "#f8c894",
          "shadow": "#c66a3c",
          "phaseDistribution": "uniform",
          "materials": [
            {
              "shape": "orb",
              "blend": "normal"
            }
          ],
          "angleSpeed": 1.3,
          "sizeSize": 0.021
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#bb523a",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.4,
                  0.102
                ],
                [
                  0.65,
                  0.1275
                ],
                [
                  0.9,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.74,
          "width": 0.02,
          "strokeProfile": "single",
          "blend": "normal",
          "core": 0
        }
      ]
    },
    {
      "name": "arachne-ring",
      "label": "橙の輪 · C008",
      "sourceCode": "C008",
      "ms": 1050.0,
      "color": "#df7851",
      "light": "#ffd8a0",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d87955",
          "radius": 0.66,
          "width": 0.22,
          "strokeProfile": "single",
          "core": 1,
          "noise": 0.01,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.276
                ],
                [
                  0.3,
                  0.6992
                ],
                [
                  0.5,
                  0.874
                ],
                [
                  0.88,
                  0.874
                ],
                [
                  1,
                  0.68172
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
                  0.06
                ],
                [
                  0.125,
                  0.29
                ],
                [
                  0.25,
                  0.5
                ],
                [
                  0.5,
                  0.66
                ],
                [
                  0.875,
                  0.71
                ],
                [
                  1,
                  0.72
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal",
          "softness": 0.022
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#874633",
          "radius": 0.66,
          "width": 0.027,
          "strokeProfile": "single",
          "core": 1,
          "noise": 0.01,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.12696
                ],
                [
                  0.3,
                  0.321632
                ],
                [
                  0.5,
                  0.40204
                ],
                [
                  0.88,
                  0.40204
                ],
                [
                  1,
                  0.313591
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
                  0.0528
                ],
                [
                  0.125,
                  0.2552
                ],
                [
                  0.25,
                  0.44
                ],
                [
                  0.5,
                  0.5808
                ],
                [
                  0.875,
                  0.6248
                ],
                [
                  1,
                  0.6336
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal",
          "softness": 0.016
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ffd3a3",
          "radius": 0.68,
          "width": 0.028,
          "strokeProfile": "single",
          "core": 1,
          "noise": 0.01,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.24
                ],
                [
                  0.3,
                  0.288
                ],
                [
                  0.5,
                  0.36
                ],
                [
                  0.88,
                  0.36
                ],
                [
                  1,
                  0.2808
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
                  0.0645
                ],
                [
                  0.125,
                  0.31175
                ],
                [
                  0.25,
                  0.5375
                ],
                [
                  0.5,
                  0.7095
                ],
                [
                  0.875,
                  0.76325
                ],
                [
                  1,
                  0.774
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "ballistic",
          "count": 10,
          "emission": "circle",
          "radius": 0.67,
          "lifeMs": [
            350,
            740
          ],
          "delayMs": [
            0,
            180
          ],
          "speed": [
            0.04,
            0.18
          ],
          "sizeRange": [
            0.014,
            0.029
          ],
          "spin": [
            -1,
            1
          ],
          "shape": "rough-polygon",
          "color": "#e9cf9e",
          "light": "#fff0c2",
          "blend": "normal",
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
                  0.7,
                  0.75
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
      "name": "siren-wave",
      "label": "サイレンの波 · C011",
      "sourceCode": "C011",
      "ms": 1200.0,
      "color": "#b6b57f",
      "light": "#f3ead0",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#b7a07d",
          "radius": 0.48,
          "blend": "normal",
          "stops": [
            [
              0,
              "#b7a07d",
              0.75
            ],
            [
              0.65,
              "#a28c70",
              0.65
            ],
            [
              1,
              "#776950",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.25,
                  0.0225
                ],
                [
                  0.5,
                  0.054
                ],
                [
                  0.75,
                  0.0738
                ],
                [
                  1,
                  0.081
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
          "color": "#bdb995",
          "radius": 0.4,
          "width": 0.009,
          "strokeProfile": "halo",
          "core": 0.32,
          "noise": 0.03,
          "count": 96,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.54
                ],
                [
                  0.7,
                  0.54
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
          "arc": [
            -0.9,
            4.8
          ]
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#d4ce83",
          "radius": 0.37,
          "width": 0.008,
          "strokeProfile": "halo",
          "core": 0.32,
          "noise": 0.06,
          "count": 96,
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
          "arc": [
            1.4,
            6.6
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "motion": "orbit",
          "color": "#d1bd80",
          "count": 12,
          "size": 0.022,
          "texture": "glow",
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
                  0.32
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "orbit": 0.31,
          "angleSpeed": 1.1
        }
      ]
    },
    {
      "name": "medusa-gaze",
      "label": "魔眼の放電 · C017",
      "sourceCode": "C017",
      "ms": 1200.0,
      "color": "#b67ca4",
      "light": "#f6edf4",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#bd83a5",
          "radius": 1.18,
          "blend": "add",
          "stops": [
            [
              0,
              "#efddc4",
              0.8
            ],
            [
              0.28,
              "#bd83a5",
              0.7
            ],
            [
              0.65,
              "#bd83a5",
              0.35
            ],
            [
              1,
              "#bd83a5",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  0.125,
                  0.32
                ],
                [
                  0.25,
                  0.04
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
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#bc789e",
          "texture": "plasma-soft",
          "radius": 0.82,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.65
                ],
                [
                  0.125,
                  0.46
                ],
                [
                  0.25,
                  0.08
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
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#f2e8ee",
          "texture": "glow",
          "radius": 0.29,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.65
                ],
                [
                  0.125,
                  0.46
                ],
                [
                  0.25,
                  0.08
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
            }
          }
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#bc789e",
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
          "color": "#bc789e",
          "count": 18,
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
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "geometry": "radial",
          "copies": 9,
          "radius": 1.13,
          "width": 0.046,
          "segments": 18,
          "noise": 0.065,
          "angleJitter": 0.08,
          "color": "#cfe8e7",
          "strokeProfile": "halo",
          "core": 0.25,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.65
                ],
                [
                  0.125,
                  0.46
                ],
                [
                  0.25,
                  0.08
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
            }
          }
        }
      ]
    },
    {
      "name": "centaur-missile",
      "label": "ケンタウロスの弾 · C019_1",
      "sourceCode": "C019_1",
      "ms": 672.0,
      "color": "#98c948",
      "light": "#d8e8ac",
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
        "atMs": 672.0,
        "cueMs": 672.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#a7cc47",
          "texture": "plasma-soft",
          "radius": 0.14,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.06,
                  0.896
                ],
                [
                  1,
                  0.896
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "aspect": [
            0.8,
            1.5
          ]
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#cdeaa0",
          "texture": "glow",
          "radius": 0.085,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.06,
                  0.8236
                ],
                [
                  1,
                  0.8236
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
          "color": "#c67437",
          "points": [
            [
              0,
              0.02
            ],
            [
              -0.2,
              0.24
            ],
            [
              -0.32,
              0.72
            ]
          ],
          "width": 0.022,
          "noise": 0.03,
          "segments": 40,
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.06,
                  0.5005
                ],
                [
                  1,
                  0.5005
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
          "color": "#8e3e2c",
          "points": [
            [
              0.01,
              0.06
            ],
            [
              0.1,
              0.41
            ],
            [
              0.15,
              0.8
            ]
          ],
          "width": 0.018,
          "noise": 0.03,
          "segments": 40,
          "core": 0.2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.06,
                  0.332
                ],
                [
                  1,
                  0.332
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
        }
      ]
    },
    {
      "name": "centaur-impact",
      "label": "ケンタウロス着弾 · C019_2",
      "sourceCode": "C019_2",
      "ms": 1200.0,
      "color": "#7db529",
      "light": "#ddf2a5",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#4fb414",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.125,
                  1
                ],
                [
                  0.25,
                  0.5
                ],
                [
                  0.375,
                  0.3
                ],
                [
                  0.5,
                  0.15
                ],
                [
                  0.625,
                  0.065
                ],
                [
                  0.75,
                  0.028
                ],
                [
                  0.875,
                  0.004
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
                  1.86
                ],
                [
                  0.125,
                  0.95
                ],
                [
                  0.25,
                  0.56
                ],
                [
                  0.375,
                  0.54
                ],
                [
                  0.5,
                  0.46
                ],
                [
                  0.625,
                  0.35
                ],
                [
                  0.75,
                  0.25
                ],
                [
                  0.875,
                  0.14
                ],
                [
                  1,
                  0.01
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 1.86,
          "blend": "normal",
          "stops": [
            [
              0,
              "#89e52a",
              0.9
            ],
            [
              0.16,
              "#63d51b",
              0.725
            ],
            [
              0.48,
              "#439d17",
              0.4
            ],
            [
              0.83,
              "#35781e",
              0.1
            ],
            [
              1,
              "#35781e",
              0.0
            ]
          ],
          "offset": [
            0,
            -0.2
          ],
          "aspect": [
            1.35,
            0.82
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#42cd12",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.92
                ],
                [
                  0.125,
                  0.84
                ],
                [
                  0.25,
                  0.1748
                ],
                [
                  0.375,
                  0.0184
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
                  1.24
                ],
                [
                  0.125,
                  0.56642
                ],
                [
                  0.25,
                  0.267901
                ],
                [
                  0.4,
                  0.030617
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
          "radius": 1.24,
          "light": "#85ee24",
          "shadow": "#308c11",
          "blend": "normal",
          "aspect": [
            1.1,
            0.52
          ],
          "softness": 0.018,
          "offset": [
            0,
            -0.2
          ]
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#71d91c",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.78
                ],
                [
                  0.25,
                  0.23
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
                  0.29
                ],
                [
                  0.125,
                  0.4
                ],
                [
                  0.4,
                  0.47
                ],
                [
                  1,
                  0.49
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4,
          "width": 0.031,
          "strokeProfile": "single",
          "blend": "normal",
          "core": 0,
          "noise": 0.06,
          "offset": [
            0,
            -0.2
          ]
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#60ce22",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.125,
                  0.8
                ],
                [
                  0.25,
                  0.18
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
          "motion": "ballistic",
          "count": 12,
          "emission": "rim",
          "extent": [
            0.72,
            0.48
          ],
          "lifeMs": [
            130,
            280
          ],
          "delayMs": [
            0,
            55
          ],
          "speed": [
            0.2,
            0.5
          ],
          "gravity": [
            0,
            -0.025
          ],
          "sizeRange": [
            0.019,
            0.039
          ],
          "spin": [
            -0.8,
            0.8
          ],
          "shape": "orb",
          "light": "#d6ff81",
          "blend": "normal",
          "offset": [
            0,
            -0.2
          ],
          "directionSpace": "radial"
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#b3ec68",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.125,
                  0.72
                ],
                [
                  0.25,
                  0.19
                ],
                [
                  0.375,
                  0.02
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
          "radius": 0.074,
          "blend": "normal",
          "stops": [
            [
              0,
              "#f1ffd6",
              1
            ],
            [
              0.3,
              "#f1ffd6",
              1
            ],
            [
              0.6,
              "#b3ec68",
              0.92
            ],
            [
              0.85,
              "#b3ec68",
              0.54
            ],
            [
              1,
              "#b3ec68",
              0
            ]
          ],
          "offset": [
            0,
            -0.2
          ]
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#91e746",
          "geometry": "polyline",
          "points": [
            [
              -2.2,
              0
            ],
            [
              2.2,
              0
            ]
          ],
          "pointSpace": "unit",
          "width": 0.018,
          "offset": [
            0,
            -0.2
          ],
          "strokeProfile": "taper",
          "taper": {
            "keys": [
              [
                0,
                0
              ],
              [
                0.15,
                0.36
              ],
              [
                0.48,
                1
              ],
              [
                0.52,
                1
              ],
              [
                0.85,
                0.36
              ],
              [
                1,
                0
              ]
            ],
            "interpolation": "smooth"
          },
          "stops": [
            [
              0,
              "#4cb71d",
              0
            ],
            [
              0.22,
              "#7cd628",
              0.6
            ],
            [
              0.5,
              "#c0f88a",
              0.9
            ],
            [
              0.78,
              "#7cd628",
              0.6
            ],
            [
              1,
              "#4cb71d",
              0
            ]
          ],
          "blend": "normal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.125,
                  0.72
                ],
                [
                  0.25,
                  0.19
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
      "name": "flame-sweep",
      "label": "炎の薙ぎ払い · C043",
      "sourceCode": "C043",
      "ms": 1050.0,
      "color": "#f05a16",
      "light": "#fff1a8",
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
        "atMs": 105.0,
        "cueMs": 105.0
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "shape": "billow-cloud",
          "color": "#4b403c",
          "light": "#7d6150",
          "shadow": "#261c1b",
          "blend": "normal",
          "copies": 3,
          "copyDelay": 0.055,
          "copyAlpha": 0.7,
          "layout": "line",
          "spread": [
            0.022,
            0.01
          ],
          "aspect": [
            1.1,
            0.86
          ],
          "softness": 0.006,
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
                  0.25,
                  0.1
                ],
                [
                  0.375,
                  0.19
                ],
                [
                  0.5,
                  0.25
                ],
                [
                  0.625,
                  0.19
                ],
                [
                  0.75,
                  0.14
                ],
                [
                  0.875,
                  0.045
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
                  0.012
                ],
                [
                  0.125,
                  0.025
                ],
                [
                  0.25,
                  0.046
                ],
                [
                  0.375,
                  0.055
                ],
                [
                  0.625,
                  0.073
                ],
                [
                  1,
                  0.09
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  1.0
                ],
                [
                  1,
                  1.65
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.04
                ],
                [
                  0.125,
                  0.13
                ],
                [
                  0.25,
                  0.2
                ],
                [
                  0.375,
                  0.235
                ],
                [
                  0.5,
                  0.255
                ],
                [
                  0.625,
                  0.28
                ],
                [
                  0.75,
                  0.3
                ],
                [
                  0.875,
                  0.32
                ],
                [
                  1,
                  0.32
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  -0.025
                ],
                [
                  0.25,
                  -0.04
                ],
                [
                  0.375,
                  -0.04
                ],
                [
                  0.5,
                  -0.045
                ],
                [
                  0.625,
                  -0.038
                ],
                [
                  0.75,
                  -0.035
                ],
                [
                  0.875,
                  -0.03
                ],
                [
                  1,
                  -0.025
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
          "color": "#59423a",
          "light": "#927055",
          "shadow": "#30231f",
          "shape": "billow-cloud",
          "blend": "normal",
          "copies": 1,
          "layout": "line",
          "spread": [
            0.02,
            0.018
          ],
          "offset": [
            -0.024,
            -0.012
          ],
          "aspect": [
            1.14,
            1.04
          ],
          "softness": 0.006,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.02
                ],
                [
                  0.25,
                  0.12
                ],
                [
                  0.375,
                  0.21
                ],
                [
                  0.5,
                  0.27
                ],
                [
                  0.625,
                  0.22
                ],
                [
                  0.75,
                  0.16
                ],
                [
                  0.875,
                  0.08
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
                  0.01056
                ],
                [
                  0.125,
                  0.0462
                ],
                [
                  0.25,
                  0.08976
                ],
                [
                  0.375,
                  0.1056
                ],
                [
                  0.5,
                  0.1188
                ],
                [
                  0.625,
                  0.1056
                ],
                [
                  0.75,
                  0.0792
                ],
                [
                  0.875,
                  0.04488
                ],
                [
                  1,
                  0.00924
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  1.08
                ],
                [
                  0.25,
                  1.2
                ],
                [
                  0.5,
                  1.4
                ],
                [
                  0.75,
                  1.68
                ],
                [
                  1,
                  1.9
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.045
                ],
                [
                  0.1,
                  0.1
                ],
                [
                  0.125,
                  0.15
                ],
                [
                  0.25,
                  0.24
                ],
                [
                  0.375,
                  0.285
                ],
                [
                  0.5,
                  0.315
                ],
                [
                  0.625,
                  0.325
                ],
                [
                  0.75,
                  0.34
                ],
                [
                  0.875,
                  0.38
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  -0.006
                ],
                [
                  0.25,
                  -0.01
                ],
                [
                  0.375,
                  -0.01
                ],
                [
                  0.5,
                  0.015
                ],
                [
                  0.625,
                  0.028
                ],
                [
                  0.75,
                  0.03
                ],
                [
                  0.875,
                  0.024
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
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#e53c0c",
          "light": "#ff961c",
          "shadow": "#a5230a",
          "shape": "flame-tongue",
          "blend": "normal",
          "copies": 2,
          "layout": "line",
          "spread": [
            0.024,
            0.015
          ],
          "offset": [
            -0.025,
            -0.018
          ],
          "aspect": [
            1.04,
            1.28
          ],
          "softness": 0.0025,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.055
                ],
                [
                  0.25,
                  0.36
                ],
                [
                  0.375,
                  0.55
                ],
                [
                  0.5,
                  0.65
                ],
                [
                  0.625,
                  0.6
                ],
                [
                  0.75,
                  0.3
                ],
                [
                  0.875,
                  0.08
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
                  0.00624
                ],
                [
                  0.125,
                  0.0273
                ],
                [
                  0.25,
                  0.05304
                ],
                [
                  0.375,
                  0.0624
                ],
                [
                  0.5,
                  0.0702
                ],
                [
                  0.625,
                  0.0624
                ],
                [
                  0.75,
                  0.0468
                ],
                [
                  0.875,
                  0.02652
                ],
                [
                  1,
                  0.00546
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.72
                ],
                [
                  0.25,
                  0.88
                ],
                [
                  0.5,
                  1.12
                ],
                [
                  0.75,
                  1.5
                ],
                [
                  1,
                  1.82
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.045
                ],
                [
                  0.1,
                  0.1
                ],
                [
                  0.125,
                  0.15
                ],
                [
                  0.25,
                  0.24
                ],
                [
                  0.375,
                  0.285
                ],
                [
                  0.5,
                  0.315
                ],
                [
                  0.625,
                  0.325
                ],
                [
                  0.75,
                  0.34
                ],
                [
                  0.875,
                  0.38
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  -0.006
                ],
                [
                  0.25,
                  -0.01
                ],
                [
                  0.375,
                  -0.01
                ],
                [
                  0.5,
                  0.015
                ],
                [
                  0.625,
                  0.028
                ],
                [
                  0.75,
                  0.03
                ],
                [
                  0.875,
                  0.024
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
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#f05a16",
          "light": "#ffb741",
          "shadow": "#9d250a",
          "shape": "flame-tongue",
          "blend": "normal",
          "copies": 2,
          "layout": "line",
          "spread": [
            0.02,
            0.018
          ],
          "offset": [
            0,
            0
          ],
          "aspect": [
            1.1,
            1.4
          ],
          "softness": 0.0025,
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
                  0.56
                ],
                [
                  0.375,
                  0.74
                ],
                [
                  0.5,
                  0.86
                ],
                [
                  0.625,
                  0.76
                ],
                [
                  0.75,
                  0.4
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
                  0.008
                ],
                [
                  0.125,
                  0.035
                ],
                [
                  0.25,
                  0.068
                ],
                [
                  0.375,
                  0.08
                ],
                [
                  0.5,
                  0.09
                ],
                [
                  0.625,
                  0.08
                ],
                [
                  0.75,
                  0.06
                ],
                [
                  0.875,
                  0.034
                ],
                [
                  1,
                  0.007
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  1.08
                ],
                [
                  0.25,
                  1.2
                ],
                [
                  0.5,
                  1.4
                ],
                [
                  0.75,
                  1.68
                ],
                [
                  1,
                  1.9
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.045
                ],
                [
                  0.1,
                  0.1
                ],
                [
                  0.125,
                  0.15
                ],
                [
                  0.25,
                  0.24
                ],
                [
                  0.375,
                  0.285
                ],
                [
                  0.5,
                  0.315
                ],
                [
                  0.625,
                  0.325
                ],
                [
                  0.75,
                  0.34
                ],
                [
                  0.875,
                  0.38
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  -0.006
                ],
                [
                  0.25,
                  -0.01
                ],
                [
                  0.375,
                  -0.01
                ],
                [
                  0.5,
                  0.015
                ],
                [
                  0.625,
                  0.028
                ],
                [
                  0.75,
                  0.03
                ],
                [
                  0.875,
                  0.024
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
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#e85812",
          "light": "#ffb842",
          "shadow": "#8b2911",
          "shape": "flame-tongue",
          "blend": "normal",
          "copies": 2,
          "layout": "line",
          "spread": [
            0.04,
            0.024
          ],
          "offset": [
            0,
            -0.008
          ],
          "aspect": [
            1.12,
            1.1
          ],
          "softness": 0.004,
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
                  0.2
                ],
                [
                  0.375,
                  0.38
                ],
                [
                  0.5,
                  0.5
                ],
                [
                  0.625,
                  0.46
                ],
                [
                  0.75,
                  0.28
                ],
                [
                  0.875,
                  0.075
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
                  0.004
                ],
                [
                  0.125,
                  0.018
                ],
                [
                  0.25,
                  0.044
                ],
                [
                  0.375,
                  0.068
                ],
                [
                  0.5,
                  0.083
                ],
                [
                  0.625,
                  0.084
                ],
                [
                  0.75,
                  0.074
                ],
                [
                  0.875,
                  0.05
                ],
                [
                  1,
                  0.012
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.25,
                  0.24
                ],
                [
                  0.5,
                  0.16
                ],
                [
                  0.75,
                  0.44
                ],
                [
                  1,
                  0.62
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.045
                ],
                [
                  0.1,
                  0.1
                ],
                [
                  0.125,
                  0.15
                ],
                [
                  0.25,
                  0.285
                ],
                [
                  0.375,
                  0.375
                ],
                [
                  0.5,
                  0.455
                ],
                [
                  0.625,
                  0.495
                ],
                [
                  0.75,
                  0.52
                ],
                [
                  0.875,
                  0.55
                ],
                [
                  1,
                  0.57
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  -0.006
                ],
                [
                  0.25,
                  -0.01
                ],
                [
                  0.375,
                  -0.016
                ],
                [
                  0.5,
                  -0.005
                ],
                [
                  0.625,
                  0.008
                ],
                [
                  0.75,
                  0.016
                ],
                [
                  0.875,
                  0.016
                ],
                [
                  1,
                  0.012
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
          "color": "#ffb027",
          "light": "#fff1a8",
          "shadow": "#f56b0f",
          "shape": "flame-tongue",
          "blend": "normal",
          "copies": 2,
          "layout": "line",
          "spread": [
            0.015,
            0.013
          ],
          "offset": [
            0.004,
            0.003
          ],
          "aspect": [
            1.35,
            0.36
          ],
          "softness": 0.0008,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.055
                ],
                [
                  0.25,
                  0.44
                ],
                [
                  0.375,
                  0.59
                ],
                [
                  0.5,
                  0.76
                ],
                [
                  0.625,
                  0.69
                ],
                [
                  0.75,
                  0.34
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
                  0.0048
                ],
                [
                  0.125,
                  0.021
                ],
                [
                  0.25,
                  0.0408
                ],
                [
                  0.375,
                  0.048
                ],
                [
                  0.5,
                  0.054
                ],
                [
                  0.625,
                  0.048
                ],
                [
                  0.75,
                  0.036
                ],
                [
                  0.875,
                  0.0204
                ],
                [
                  1,
                  0.0042
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  1.08
                ],
                [
                  0.25,
                  1.2
                ],
                [
                  0.5,
                  1.4
                ],
                [
                  0.75,
                  1.68
                ],
                [
                  1,
                  1.9
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.045
                ],
                [
                  0.1,
                  0.1
                ],
                [
                  0.125,
                  0.15
                ],
                [
                  0.25,
                  0.24
                ],
                [
                  0.375,
                  0.285
                ],
                [
                  0.5,
                  0.315
                ],
                [
                  0.625,
                  0.325
                ],
                [
                  0.75,
                  0.34
                ],
                [
                  0.875,
                  0.38
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  -0.006
                ],
                [
                  0.25,
                  -0.01
                ],
                [
                  0.375,
                  -0.01
                ],
                [
                  0.5,
                  0.015
                ],
                [
                  0.625,
                  0.028
                ],
                [
                  0.75,
                  0.03
                ],
                [
                  0.875,
                  0.024
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
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ffd564",
          "radius": 0.02,
          "blend": "add",
          "copies": 2,
          "layout": "line",
          "spread": [
            0.018,
            0.012
          ],
          "aspect": [
            1.1,
            0.8
          ],
          "stops": [
            [
              0,
              "#fff5b5",
              0.9
            ],
            [
              0.2,
              "#ffd564",
              0.8
            ],
            [
              0.6,
              "#ff8c22",
              0.32
            ],
            [
              1,
              "#ff5b0c",
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
                  0.125,
                  0.08
                ],
                [
                  0.25,
                  0.2
                ],
                [
                  0.375,
                  0.3
                ],
                [
                  0.5,
                  0.32
                ],
                [
                  0.625,
                  0.28
                ],
                [
                  0.75,
                  0.1
                ],
                [
                  0.875,
                  0.01
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
                  1.08
                ],
                [
                  0.25,
                  1.2
                ],
                [
                  0.5,
                  1.4
                ],
                [
                  0.75,
                  1.68
                ],
                [
                  1,
                  1.9
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftX": {
              "keys": [
                [
                  0,
                  0.045
                ],
                [
                  0.1,
                  0.1
                ],
                [
                  0.125,
                  0.15
                ],
                [
                  0.25,
                  0.24
                ],
                [
                  0.375,
                  0.285
                ],
                [
                  0.5,
                  0.315
                ],
                [
                  0.625,
                  0.325
                ],
                [
                  0.75,
                  0.34
                ],
                [
                  0.875,
                  0.38
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "smooth"
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  -0.006
                ],
                [
                  0.25,
                  -0.01
                ],
                [
                  0.375,
                  -0.01
                ],
                [
                  0.5,
                  0.015
                ],
                [
                  0.625,
                  0.028
                ],
                [
                  0.75,
                  0.03
                ],
                [
                  0.875,
                  0.024
                ],
                [
                  1,
                  0.02
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "steal-mark",
      "label": "奪うの印 · C090",
      "sourceCode": "C090",
      "ms": 1200.0,
      "color": "#b14370",
      "light": "#edabc1",
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
          "color": "#9d3057",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.1204
                ],
                [
                  0.375,
                  0.215
                ],
                [
                  0.5,
                  0.3698
                ],
                [
                  0.625,
                  0.3956
                ],
                [
                  0.75,
                  0.1376
                ],
                [
                  0.875,
                  0.0387
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.09504
                ],
                [
                  0.125,
                  0.1782
                ],
                [
                  0.25,
                  0.42174
                ],
                [
                  0.375,
                  0.63261
                ],
                [
                  0.5,
                  0.84348
                ],
                [
                  0.7,
                  0.885654
                ],
                [
                  1,
                  0.919393
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.1
                ],
                [
                  1,
                  0.16
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "billow-cloud",
          "radius": 0.84348,
          "light": "#b95c7e",
          "shadow": "#7d3a54",
          "blend": "normal",
          "aspect": [
            1.03,
            1.32
          ],
          "softness": 0.03
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#9d3057",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.049
                ],
                [
                  0.375,
                  0.0875
                ],
                [
                  0.5,
                  0.1505
                ],
                [
                  0.625,
                  0.161
                ],
                [
                  0.75,
                  0.056
                ],
                [
                  0.875,
                  0.01575
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.09504
                ],
                [
                  0.125,
                  0.1782
                ],
                [
                  0.25,
                  0.42174
                ],
                [
                  0.375,
                  0.63261
                ],
                [
                  0.5,
                  0.84348
                ],
                [
                  0.7,
                  0.885654
                ],
                [
                  1,
                  0.919393
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.759132,
          "texture": "smoke",
          "aspect": [
            1.03,
            1.32
          ],
          "blend": "normal"
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "radius": 0.379566,
          "aspect": [
            0.9,
            1.18
          ],
          "blend": "normal",
          "copies": 3,
          "layout": "line",
          "spread": [
            0.17,
            0.08
          ],
          "offset": [
            -0.07,
            0.02
          ],
          "stops": [
            [
              0,
              "#bf477a",
              0.98
            ],
            [
              0.36,
              "#af3865",
              0.94
            ],
            [
              0.69,
              "#993053",
              0.73
            ],
            [
              1,
              "#77374f",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.161
                ],
                [
                  0.375,
                  0.2875
                ],
                [
                  0.5,
                  0.4945
                ],
                [
                  0.625,
                  0.529
                ],
                [
                  0.75,
                  0.184
                ],
                [
                  0.875,
                  0.05175
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.042768
                ],
                [
                  0.125,
                  0.08019
                ],
                [
                  0.25,
                  0.189783
                ],
                [
                  0.375,
                  0.284674
                ],
                [
                  0.5,
                  0.379566
                ],
                [
                  0.7,
                  0.398544
                ],
                [
                  1,
                  0.413727
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
          "shape": "heart",
          "radius": 0.075,
          "color": "#efb2c8",
          "light": "#ffe1eb",
          "shadow": "#b95b7d",
          "offset": [
            -0.31,
            0.94
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
                  0.4,
                  0
                ],
                [
                  0.5,
                  0.82
                ],
                [
                  0.625,
                  0.95
                ],
                [
                  0.75,
                  0.25
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
            "shiftY": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.375,
                  -0.03
                ],
                [
                  0.625,
                  -0.14
                ],
                [
                  0.875,
                  -0.22
                ],
                [
                  1,
                  -0.25
                ]
              ],
              "interpolation": "smooth"
            }
          }
        }
      ]
    },
    {
      "name": "fire-arrow",
      "label": "炎の矢 · E058_1",
      "sourceCode": "E058_1",
      "ms": 672.0,
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
        "atMs": 672.0,
        "cueMs": 672.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
      "ms": 1200.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
      "ms": 1200.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
      "ms": 1200.0,
      "color": "#6c942f",
      "light": "#c9dd8b",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#598e27",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.68
                ],
                [
                  0.375,
                  0.92
                ],
                [
                  0.5,
                  0.97
                ],
                [
                  0.75,
                  0.9
                ],
                [
                  0.875,
                  0.75
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.086528
                ],
                [
                  0.125,
                  0.16224
                ],
                [
                  0.25,
                  0.421824
                ],
                [
                  0.375,
                  0.632736
                ],
                [
                  0.5,
                  0.843648
                ],
                [
                  0.7,
                  0.88583
                ],
                [
                  1,
                  0.919576
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.1
                ],
                [
                  1,
                  0.16
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "billow-cloud",
          "radius": 0.843648,
          "light": "#afd34b",
          "shadow": "#34521b",
          "blend": "normal",
          "aspect": [
            1.08,
            1
          ],
          "softness": 0.023
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#4b821e",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.238
                ],
                [
                  0.375,
                  0.322
                ],
                [
                  0.5,
                  0.3395
                ],
                [
                  0.75,
                  0.315
                ],
                [
                  0.875,
                  0.2625
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.086528
                ],
                [
                  0.125,
                  0.16224
                ],
                [
                  0.25,
                  0.421824
                ],
                [
                  0.375,
                  0.632736
                ],
                [
                  0.5,
                  0.843648
                ],
                [
                  0.7,
                  0.88583
                ],
                [
                  1,
                  0.919576
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.759283,
          "texture": "smoke",
          "aspect": [
            1.08,
            1
          ],
          "blend": "normal"
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "radius": 0.371205,
          "aspect": [
            1.08,
            1
          ],
          "blend": "normal",
          "copies": 3,
          "layout": "line",
          "spread": [
            0.18,
            0.15
          ],
          "offset": [
            -0.025,
            -0.015
          ],
          "stops": [
            [
              0,
              "#8abc32",
              1
            ],
            [
              0.3,
              "#77ac29",
              0.99
            ],
            [
              0.65,
              "#598e27",
              0.76
            ],
            [
              1,
              "#426e1f",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.476
                ],
                [
                  0.375,
                  0.644
                ],
                [
                  0.5,
                  0.679
                ],
                [
                  0.75,
                  0.63
                ],
                [
                  0.875,
                  0.525
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.038072
                ],
                [
                  0.125,
                  0.071386
                ],
                [
                  0.25,
                  0.185603
                ],
                [
                  0.375,
                  0.278404
                ],
                [
                  0.5,
                  0.371205
                ],
                [
                  0.7,
                  0.389765
                ],
                [
                  1,
                  0.404613
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
          "color": "#4b821e",
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
                  0.25,
                  0.68
                ],
                [
                  0.375,
                  0.92
                ],
                [
                  0.5,
                  0.97
                ],
                [
                  0.75,
                  0.9
                ],
                [
                  0.875,
                  0.75
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
          "count": 4,
          "countScale": "none",
          "size": 0.023,
          "orbit": 0.48360000000000003,
          "light": "#8db132",
          "shadow": "#4b821e",
          "phaseDistribution": "uniform",
          "materials": [
            {
              "shape": "orb",
              "blend": "normal"
            }
          ],
          "angleSpeed": 0.4
        }
      ]
    },
    {
      "name": "piercing-streak",
      "label": "貫通の軌跡 · K007",
      "sourceCode": "K007",
      "ms": 630.0,
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
        "atMs": 315.0,
        "cueMs": 315.0
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
      "ms": 1200.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
      "ms": 1200.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "blend": "normal",
          "softness": 0.012
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
          ],
          "softness": 0.018
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
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
      "ms": 1200.0,
      "color": "#6c942f",
      "light": "#c9dd8b",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#548425",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.4
                ],
                [
                  0.375,
                  0.76
                ],
                [
                  0.5,
                  0.95
                ],
                [
                  0.625,
                  0.95
                ],
                [
                  0.75,
                  0.24
                ],
                [
                  0.875,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.09568
                ],
                [
                  0.125,
                  0.1794
                ],
                [
                  0.25,
                  0.43654
                ],
                [
                  0.375,
                  0.654805
                ],
                [
                  0.5,
                  0.87308
                ],
                [
                  0.7,
                  0.916729
                ],
                [
                  1,
                  0.951662
                ]
              ],
              "interpolation": "smooth"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.1
                ],
                [
                  1,
                  0.16
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "billow-cloud",
          "radius": 0.87308,
          "light": "#94b83d",
          "shadow": "#345321",
          "blend": "normal",
          "aspect": [
            0.98,
            1.45
          ],
          "softness": 0.023
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#4a7c20",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.14
                ],
                [
                  0.375,
                  0.266
                ],
                [
                  0.5,
                  0.3325
                ],
                [
                  0.625,
                  0.3325
                ],
                [
                  0.75,
                  0.084
                ],
                [
                  0.875,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.09568
                ],
                [
                  0.125,
                  0.1794
                ],
                [
                  0.25,
                  0.43654
                ],
                [
                  0.375,
                  0.654805
                ],
                [
                  0.5,
                  0.87308
                ],
                [
                  0.7,
                  0.916729
                ],
                [
                  1,
                  0.951662
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.785772,
          "texture": "smoke",
          "aspect": [
            0.98,
            1.45
          ],
          "blend": "normal"
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "radius": 0.384155,
          "aspect": [
            0.98,
            1.45
          ],
          "blend": "normal",
          "copies": 3,
          "layout": "line",
          "spread": [
            0.18,
            0.15
          ],
          "offset": [
            -0.025,
            -0.015
          ],
          "stops": [
            [
              0,
              "#84ac2d",
              1
            ],
            [
              0.3,
              "#6d9b27",
              0.99
            ],
            [
              0.65,
              "#548425",
              0.76
            ],
            [
              1,
              "#3a641e",
              0
            ]
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.25,
                  0.272
                ],
                [
                  0.375,
                  0.5168
                ],
                [
                  0.5,
                  0.646
                ],
                [
                  0.625,
                  0.646
                ],
                [
                  0.75,
                  0.1632
                ],
                [
                  0.875,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.042099
                ],
                [
                  0.125,
                  0.078936
                ],
                [
                  0.25,
                  0.192078
                ],
                [
                  0.375,
                  0.288114
                ],
                [
                  0.5,
                  0.384155
                ],
                [
                  0.7,
                  0.403361
                ],
                [
                  1,
                  0.418731
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
          "color": "#4a7c20",
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
                  0.25,
                  0.4
                ],
                [
                  0.375,
                  0.76
                ],
                [
                  0.5,
                  0.95
                ],
                [
                  0.625,
                  0.95
                ],
                [
                  0.75,
                  0.24
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
          },
          "motion": "orbit",
          "count": 4,
          "countScale": "none",
          "size": 0.023,
          "orbit": 0.4526,
          "light": "#8aac31",
          "shadow": "#4a7c20",
          "phaseDistribution": "uniform",
          "materials": [
            {
              "shape": "orb",
              "blend": "normal"
            }
          ],
          "angleSpeed": 0.4
        }
      ]
    },
    {
      "name": "shield-contact",
      "label": "結界の接触 · K018",
      "sourceCode": "K018",
      "ms": 1200.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
          "softness": 0.003,
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
      "ms": 5250.0,
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
        "atMs": 2625.0,
        "cueMs": 2625.0
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
                  0.0
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
                  0.0
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
          "softness": 0.003,
          "scaleX": 1
        }
      ]
    },
    {
      "name": "revive-burst",
      "label": "復活の光 · K020",
      "sourceCode": "K020",
      "ms": 2250.0,
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
        "atMs": 1125.0,
        "cueMs": 1125.0
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
      "ms": 1350.0,
      "color": "#60b7c0",
      "light": "#a8dddd",
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
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#32979d",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.125,
                  0.31
                ],
                [
                  0.25,
                  0.672
                ],
                [
                  0.375,
                  0.6888
                ],
                [
                  0.5,
                  0.4956
                ],
                [
                  0.625,
                  0.2184
                ],
                [
                  0.75,
                  0.08
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.005
                ],
                [
                  0.125,
                  0.33
                ],
                [
                  0.25,
                  1.08
                ],
                [
                  0.375,
                  1.63
                ],
                [
                  0.5,
                  2.03
                ],
                [
                  0.625,
                  2.15
                ],
                [
                  1,
                  2.2
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
              "interpolation": "smooth"
            },
            "stroke": {
              "keys": [
                [
                  0,
                  0.001281
                ],
                [
                  0.125,
                  0.015372
                ],
                [
                  0.25,
                  0.030744
                ],
                [
                  0.375,
                  0.043554
                ],
                [
                  0.5,
                  0.046116
                ],
                [
                  0.75,
                  0.040992
                ],
                [
                  1,
                  0.035868
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "rune-wheel",
          "radius": 2.03,
          "light": "#62b9bc",
          "shadow": "#26717c",
          "blend": "normal",
          "stroke": 0.043554
        }
      ]
    },
    {
      "name": "summon-sigil",
      "label": "緑の召喚陣 · S001",
      "sourceCode": "S001",
      "ms": 1500.0,
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
        "atMs": 750.0,
        "cueMs": 750.0
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
      "ms": 1050.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
      "ms": 1005.0,
      "color": "#80b5ce",
      "light": "#e3edf1",
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
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#8cbfda",
          "texture": "glow",
          "radius": 0.4425,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.19
                ],
                [
                  0.7,
                  0.19
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
          "color": "#7fbddd",
          "texture": "plasma-soft",
          "radius": 0.2537,
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
                  0.7,
                  0.28
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
            1.15,
            1.45
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "shape": "crystal",
          "radius": 0.2773,
          "aspect": [
            1.05,
            1.18
          ],
          "color": "#548fb7",
          "light": "#b6dfec",
          "shadow": "#294f79",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.87
                ],
                [
                  0.7,
                  0.87
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
                  -0.05
                ],
                [
                  1,
                  0.05
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
          "color": "#b7d9e4",
          "count": 18,
          "radius": 0.413,
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
                  0.4
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
      "name": "attack-buff",
      "label": "攻撃の強化 · S005",
      "sourceCode": "S005",
      "ms": 1050.0,
      "color": "#c59a45",
      "light": "#f0df9c",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c49133",
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
              "#f6e48c",
              1
            ],
            [
              0.45,
              "#f6e48c",
              1
            ],
            [
              0.68,
              "#c49133",
              0.98
            ],
            [
              0.88,
              "#c49133",
              0.72
            ],
            [
              1,
              "#c49133",
              0
            ]
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c49133",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.24,
                  0.14
                ],
                [
                  0.375,
                  0.644
                ],
                [
                  0.55,
                  0.7
                ],
                [
                  0.68,
                  0.63
                ],
                [
                  0.78,
                  0.084
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.0672
                ],
                [
                  0.125,
                  0.1344
                ],
                [
                  0.25,
                  0.6272
                ],
                [
                  0.375,
                  0.7504
                ],
                [
                  0.56,
                  0.6832
                ],
                [
                  0.69,
                  0.7616
                ],
                [
                  0.82,
                  0.7728
                ],
                [
                  1,
                  0.784
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
          "radius": 0.728,
          "light": "#f6e48c",
          "shadow": "#705129",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c49133",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.24,
                  0.0
                ],
                [
                  0.43,
                  0.574
                ],
                [
                  0.64,
                  0.63
                ],
                [
                  0.78,
                  0.035
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
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
          "radius": 0.4816,
          "light": "#f6e48c",
          "shadow": "#705129",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c49133",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.1
                ],
                [
                  0.47,
                  0.65
                ],
                [
                  0.64,
                  0.72
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
            "rotation": {
              "keys": [
                [
                  0,
                  -0.18
                ],
                [
                  1,
                  0.18
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "shape": "flare",
          "radius": 0.32,
          "light": "#f6e48c",
          "shadow": "#705129",
          "blend": "normal",
          "softness": 0.008
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c49133",
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
          "shape": "star",
          "light": "#f6e48c",
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#c49133",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "light": "#f6e48c",
          "shadow": "#c49133",
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
      "name": "injury-buff",
      "label": "負傷の強化 · S006",
      "sourceCode": "S006",
      "ms": 1050.0,
      "color": "#c16b34",
      "light": "#edd09c",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ec701b",
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
              "#fff0b0",
              1
            ],
            [
              0.45,
              "#fff0b0",
              1
            ],
            [
              0.68,
              "#ec701b",
              0.98
            ],
            [
              0.88,
              "#ec701b",
              0.72
            ],
            [
              1,
              "#ec701b",
              0
            ]
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ec701b",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.24,
                  0.0969
                ],
                [
                  0.375,
                  0.44574
                ],
                [
                  0.55,
                  0.4845
                ],
                [
                  0.68,
                  0.43605
                ],
                [
                  0.78,
                  0.05814
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.0696
                ],
                [
                  0.125,
                  0.1392
                ],
                [
                  0.25,
                  0.6496
                ],
                [
                  0.375,
                  0.7772
                ],
                [
                  0.56,
                  0.7076
                ],
                [
                  0.69,
                  0.7888
                ],
                [
                  0.82,
                  0.8004
                ],
                [
                  1,
                  0.812
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
          "radius": 0.754,
          "light": "#fff0b0",
          "shadow": "#842c19",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ec701b",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.24,
                  0.0
                ],
                [
                  0.43,
                  0.39729
                ],
                [
                  0.64,
                  0.43605
                ],
                [
                  0.78,
                  0.024225
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
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
          "radius": 0.4988,
          "light": "#fff0b0",
          "shadow": "#842c19",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ec701b",
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
          "light": "#fff0b0",
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#ec701b",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.24,
                  0.144
                ],
                [
                  0.375,
                  0.6624
                ],
                [
                  0.55,
                  0.72
                ],
                [
                  0.68,
                  0.648
                ],
                [
                  0.78,
                  0.0864
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
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
          "light": "#fff0b0",
          "shadow": "#ec701b",
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
      "name": "death-buff",
      "label": "死亡の強化 · S007",
      "sourceCode": "S007",
      "ms": 1050.0,
      "color": "#6bafba",
      "light": "#c4e4e4",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#3da9b2",
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
              "#d7fffa",
              1
            ],
            [
              0.45,
              "#d7fffa",
              1
            ],
            [
              0.68,
              "#3da9b2",
              0.98
            ],
            [
              0.88,
              "#3da9b2",
              0.72
            ],
            [
              1,
              "#3da9b2",
              0
            ]
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#3da9b2",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.24,
                  0.14
                ],
                [
                  0.375,
                  0.644
                ],
                [
                  0.55,
                  0.7
                ],
                [
                  0.68,
                  0.63
                ],
                [
                  0.78,
                  0.084
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.0672
                ],
                [
                  0.125,
                  0.1344
                ],
                [
                  0.25,
                  0.6272
                ],
                [
                  0.375,
                  0.7504
                ],
                [
                  0.56,
                  0.6832
                ],
                [
                  0.69,
                  0.7616
                ],
                [
                  0.82,
                  0.7728
                ],
                [
                  1,
                  0.784
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
          "radius": 0.728,
          "light": "#d7fffa",
          "shadow": "#286563",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#3da9b2",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.24,
                  0.0
                ],
                [
                  0.43,
                  0.574
                ],
                [
                  0.64,
                  0.63
                ],
                [
                  0.78,
                  0.035
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
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
          "radius": 0.4816,
          "light": "#d7fffa",
          "shadow": "#286563",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#3da9b2",
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
          "shape": "feather",
          "light": "#d7fffa",
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#3da9b2",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "light": "#d7fffa",
          "shadow": "#3da9b2",
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
      "name": "mana-buff",
      "label": "マナの強化 · S008",
      "sourceCode": "S008",
      "ms": 1050.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
                  0.0
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
                  0.0
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
                  0.0
                ],
                [
                  0.125,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "blend": "normal",
          "softness": 0.012
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
                  0.0
                ],
                [
                  0.24,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "blend": "normal",
          "softness": 0.012
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
                  0.0
                ],
                [
                  0.125,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
      "ms": 1050.0,
      "color": "#6fa992",
      "light": "#cce5ce",
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
        "atMs": 0.0,
        "cueMs": 0.0
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#49b393",
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
              "#c6ffe9",
              1
            ],
            [
              0.45,
              "#c6ffe9",
              1
            ],
            [
              0.68,
              "#49b393",
              0.98
            ],
            [
              0.88,
              "#49b393",
              0.72
            ],
            [
              1,
              "#49b393",
              0
            ]
          ]
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#49b393",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
                ],
                [
                  0.24,
                  0.14
                ],
                [
                  0.375,
                  0.644
                ],
                [
                  0.55,
                  0.7
                ],
                [
                  0.68,
                  0.63
                ],
                [
                  0.78,
                  0.084
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.0672
                ],
                [
                  0.125,
                  0.1344
                ],
                [
                  0.25,
                  0.6272
                ],
                [
                  0.375,
                  0.7504
                ],
                [
                  0.56,
                  0.6832
                ],
                [
                  0.69,
                  0.7616
                ],
                [
                  0.82,
                  0.7728
                ],
                [
                  1,
                  0.784
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
          "radius": 0.728,
          "light": "#c6ffe9",
          "shadow": "#296c63",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#49b393",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.24,
                  0.0
                ],
                [
                  0.43,
                  0.574
                ],
                [
                  0.64,
                  0.63
                ],
                [
                  0.78,
                  0.035
                ],
                [
                  0.88,
                  0.0
                ],
                [
                  1,
                  0.0
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
          "radius": 0.4816,
          "light": "#c6ffe9",
          "shadow": "#296c63",
          "blend": "normal",
          "softness": 0.012
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#49b393",
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
          "shape": "feather",
          "light": "#c6ffe9",
          "blend": "normal"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "intrinsicAlpha": true,
          "color": "#49b393",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.0
                ],
                [
                  0.125,
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          "light": "#c6ffe9",
          "shadow": "#49b393",
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
      "name": "opening-sigil",
      "label": "着地の金輪 · appearance",
      "sourceCode": "appearance_sheet",
      "ms": 1470.0,
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
        "atMs": 0.0,
        "cueMs": 0.0
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
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          ],
          "softness": 0.027
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
                  0.0
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
                  0.0
                ],
                [
                  1,
                  0.0
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
          ],
          "softness": 0.036
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
            -1.0
          ],
          "gravity": [
            0.0,
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
      "ms": 1800.0,
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
        "atMs": 750.0,
        "cueMs": 750.0
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
                  0.0
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
                  0.0
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
          "blend": "normal",
          "softness": 0.001
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
                  0.0
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
                  0.0
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
          "blend": "normal",
          "softness": 0.001
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
      "ms": 1800.0,
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
        "atMs": 750.0,
        "cueMs": 750.0
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
                  0.0
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
                  0.0
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
          "blend": "normal",
          "softness": 0.001
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
                  0.0
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
                  0.0
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
          "blend": "normal",
          "softness": 0.001
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
                  0.0
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
