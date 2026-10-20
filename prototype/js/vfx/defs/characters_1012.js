/* 2026-10-12 利用者指定：21キャラの固有演出。共有眷属波はvariantsの入力値だけを替える。
 * 汎用図形・数値曲線・層のみ。旧82種の定義は変更しない。 */
// 2026-10-12指定・撮影第2回: 整数個数／脈動、背景の無い人型残像、柔らかい霧、蔓の成長と突進の命中同期。
// 2026-10-12指定・撮影第3回: 局所の霧の密度、座ったローブの輪郭、縦長の溶解と突進の表示順を修正。
// 2026-10-14 品質向上（Claude直接）：satyr を作り直し
// 2026-10-14 品質向上（Claude直接）：hecatoncheir を作り直し
// 2026-10-14 品質向上（Claude直接）：phantom を作り直し
// 2026-10-14 品質向上（Claude直接）：scylla を作り直し
// 2026-10-14 品質向上（Claude直接）：spriggan を作り直し
// 2026-10-14 品質向上（Claude直接）：sleep-sheep を作り直し
// 2026-10-14 品質向上（Claude直接）：incubus を作り直し
// 2026-10-14 品質向上（Claude直接）：familiar を作り直し
// 2026-10-14 品質向上（Claude直接）：zombie を作り直し
// 2026-10-14 品質向上（Claude直接）：behemoth を作り直し
// 2026-10-14 品質向上（Claude直接）：sylph を作り直し
// 2026-10-14 品質向上（Claude直接）：nymph を作り直し
// 2026-10-14 品質向上（Claude直接）：undine を作り直し
// 2026-10-14 品質向上（Claude直接）：gremlin を作り直し
// 2026-10-14 品質向上（Claude直接）：fiend を作り直し
// 2026-10-14 品質向上（Claude直接）：arch-demon を作り直し
// 2026-10-14 品質向上（Claude直接）：lilith を作り直し
// 2026-10-14 品質向上（Claude直接）：overlord を作り直し
// 2026-10-14 品質向上（Claude直接）：chaos-imp を作り直し
// 2026-10-14 品質向上（Claude直接）：minotaur を作り直し
VbFxDefs.register({
  "schemaVersion": 2,
  "shapes": {
    "soul-wisp": {
      "paths": [
        {
          "d": "M 0 -1 C .65 -.82 .78 -.10 .34 .30 Q .13 .58 .32 1 Q -.25 .78 -.42 .37 C -.85 -.16 -.60 -.83 0 -1 Z",
          "fill": "color",
          "gradient": {
            "type": "radial",
            "from": [
              -0.14,
              -0.3
            ],
            "to": [
              0,
              0
            ],
            "inner": 0,
            "outer": 1.1,
            "stops": [
              [
                0,
                "light",
                1
              ],
              [
                0.35,
                "color",
                0.95
              ],
              [
                1,
                "shadow",
                0.1
              ]
            ]
          }
        }
      ],
      "label": "soul-wisp"
    },
    "blood-drop": {
      "paths": [
        {
          "d": "M 0 -1.2 C -.12 -.63 -.77 -.25 -.72 .30 C -.68 1.18 .72 1.18 .72 .30 C .77 -.25 .12 -.63 0 -1.2 Z",
          "fill": "color",
          "gradient": {
            "type": "radial",
            "from": [
              -0.22,
              0.12
            ],
            "to": [
              0,
              0.25
            ],
            "inner": 0,
            "outer": 1.2,
            "stops": [
              [
                0,
                "light",
                1
              ],
              [
                0.34,
                "color",
                1
              ],
              [
                1,
                "shadow",
                0.85
              ]
            ]
          }
        },
        {
          "d": "M -.35 .16 Q -.50 .37 -.24 .60",
          "stroke": "light",
          "fill": "none",
          "width": 0.08,
          "strokeAlpha": 0.7
        }
      ],
      "label": "blood-drop"
    },
    "gear-ring": {
      "paths": [
        {
          "d": "M 1.00000 0.00000 L 0.97528 0.09606 L 0.80424 0.15997 L 0.78469 0.23803 L 0.92388 0.38268 L 0.86428 0.46197 L 0.68181 0.45557 L 0.63387 0.52020 L 0.70711 0.70711 L 0.62171 0.75755 L 0.45557 0.68181 L 0.38655 0.72318 L 0.38268 0.92388 L 0.28448 0.93780 L 0.15997 0.80424 L 0.08037 0.81605 L 0.00000 1.00000 L -0.09606 0.97528 L -0.15997 0.80424 L -0.23803 0.78469 L -0.38268 0.92388 L -0.46197 0.86428 L -0.45557 0.68181 L -0.52020 0.63387 L -0.70711 0.70711 L -0.75755 0.62171 L -0.68181 0.45557 L -0.72318 0.38655 L -0.92388 0.38268 L -0.93780 0.28448 L -0.80424 0.15997 L -0.81605 0.08037 L -1.00000 0.00000 L -0.97528 -0.09606 L -0.80424 -0.15997 L -0.78469 -0.23803 L -0.92388 -0.38268 L -0.86428 -0.46197 L -0.68181 -0.45557 L -0.63387 -0.52020 L -0.70711 -0.70711 L -0.62171 -0.75755 L -0.45557 -0.68181 L -0.38655 -0.72318 L -0.38268 -0.92388 L -0.28448 -0.93780 L -0.15997 -0.80424 L -0.08037 -0.81605 L -0.00000 -1.00000 L 0.09606 -0.97528 L 0.15997 -0.80424 L 0.23803 -0.78469 L 0.38268 -0.92388 L 0.46197 -0.86428 L 0.45557 -0.68181 L 0.52020 -0.63387 L 0.70711 -0.70711 L 0.75755 -0.62171 L 0.68181 -0.45557 L 0.72318 -0.38655 L 0.92388 -0.38268 L 0.93780 -0.28448 L 0.80424 -0.15997 L 0.81605 -0.08037 Z M 0.38000 0.00000 L 0.36705 -0.09835 L 0.32909 -0.19000 L 0.26870 -0.26870 L 0.19000 -0.32909 L 0.09835 -0.36705 L 0.00000 -0.38000 L -0.09835 -0.36705 L -0.19000 -0.32909 L -0.26870 -0.26870 L -0.32909 -0.19000 L -0.36705 -0.09835 L -0.38000 -0.00000 L -0.36705 0.09835 L -0.32909 0.19000 L -0.26870 0.26870 L -0.19000 0.32909 L -0.09835 0.36705 L -0.00000 0.38000 L 0.09835 0.36705 L 0.19000 0.32909 L 0.26870 0.26870 L 0.32909 0.19000 L 0.36705 0.09835 Z",
          "fill": "color",
          "stroke": "light",
          "width": 0.014
        }
      ],
      "label": "gear-ring"
    },
    "petal-seal": {
      "paths": [
        {
          "d": "M 0 0 C -1 -.8 -.70 -1.30 0 -.74 C .70 -1.30 1 -.8 0 0 Z M 0 0 C 1 -.8 1.3 -.2 .72 .20 C 1.10 .75 .38 1.10 0 0 Z M 0 0 C .38 1.1 -.38 1.1 -.72 .20 C -1.3 -.2 -1 -.8 0 0 Z",
          "fill": "color",
          "stroke": "light",
          "width": 0.035,
          "gradient": {
            "type": "radial",
            "from": [
              0,
              -0.18
            ],
            "to": [
              0,
              -0.18
            ],
            "inner": 0,
            "outer": 1.15,
            "stops": [
              [
                0,
                "light",
                1
              ],
              [
                0.25,
                "color",
                0.95
              ],
              [
                1,
                "shadow",
                0.78
              ]
            ]
          }
        },
        {
          "fill": "light",
          "d": "M .15 0 C .15 .083 .083 .15 0 .15 C -.083 .15 -.15 .083 -.15 0 C -.15 -.083 -.083 -.15 0 -.15 C .083 -.15 .15 -.083 .15 0 Z"
        },
        {
          "d": "M 0 0 L 0 -.64 M 0 0 L .53 .11 M 0 0 L -.28 .44",
          "fill": "none",
          "stroke": "light",
          "strokeAlpha": 0.7,
          "width": 0.023
        }
      ],
      "label": "petal-seal"
    },
    "vine-loop": {
      "paths": [
        {
          "d": "M -.1 -.95 C -.92 -1.18 -1.33 -.24 -.81 .5 C -.43 1.17 .55 1.16 .96 .38 C 1.35 -.36 .64 -1.21 -.1 -.95 M -.76 .54 Q -1.22 .42 -1.1 .02 Q -.98 -.12 -.87 .04 M .96 .22 Q 1.2 -.08 1.36 .16 Q 1.42 .42 1.05 .47",
          "fill": "none",
          "stroke": "color",
          "width": 0.07
        },
        {
          "d": "M -.86 -.46 Q -1.35 -.92 -1.20 -.30 Q -1.08 -.2 -.86 -.46 Z M .48 -.94 Q .6 -1.4 .87 -1.12 Q .86 -.82 .48 -.94 Z M .1 .98 Q -.12 1.35 .30 1.29 Q .44 1.19 .1 .98 Z",
          "fill": "color",
          "stroke": "light",
          "width": 0.02,
          "gradient": {
            "type": "linear",
            "from": [
              -0.8,
              -1
            ],
            "to": [
              0.7,
              1.2
            ],
            "stops": [
              [
                0,
                "light",
                0.95
              ],
              [
                0.45,
                "color",
                1
              ],
              [
                1,
                "shadow",
                0.9
              ]
            ]
          }
        },
        {
          "d": "M -.1 -.95 C -.92 -1.18 -1.33 -.24 -.81 .5 C -.43 1.17 .55 1.16 .96 .38 C 1.35 -.36 .64 -1.21 -.1 -.95 M -.76 .54 Q -1.22 .42 -1.1 .02 Q -.98 -.12 -.87 .04 M .96 .22 Q 1.2 -.08 1.36 .16 Q 1.42 .42 1.05 .47",
          "fill": "none",
          "stroke": "light",
          "strokeAlpha": 0.65,
          "width": 0.018
        },
        {
          "d": "M -.86 -.46 L -1.19 -.58 M .48 -.94 L .73 -1.16 M .1 .98 L .20 1.22",
          "fill": "none",
          "stroke": "shadow",
          "strokeAlpha": 0.7,
          "width": 0.025
        }
      ],
      "label": "vine-loop"
    },
    "robed-silhouette": {
      "label": "座ったローブ姿の輪郭と衣の折り目",
      "paths": [
        {
          "d": "M 0 -.82 Q -.14 -.75 -.24 -.57 L -.4 -.37 L -.57 -.4 Q -.74 -.33 -.84 -.22 L -1.05 -.17 Q -.94 -.01 -.87 .12 L -.71 .19 Q -.79 .52 -.97 .97 Q -.54 1.03 0 .98 Q .54 1.03 .97 .97 Q .79 .52 .71 .19 L .87 .12 Q .94 -.01 1.05 -.17 L .84 -.22 Q .74 -.33 .57 -.4 L .4 -.37 L .24 -.57 Q .14 -.75 0 -.82 Z",
          "fill": "color",
          "stroke": "light",
          "strokeAlpha": 0.85,
          "width": 0.022,
          "gradient": {
            "type": "radial",
            "from": [
              0,
              -0.15
            ],
            "to": [
              0,
              0.05
            ],
            "inner": 0,
            "outer": 1.25,
            "stops": [
              [
                0,
                "color",
                0.25
              ],
              [
                0.4,
                "color",
                0.46
              ],
              [
                0.78,
                "shadow",
                0.55
              ],
              [
                1,
                "shadow",
                0.12
              ]
            ]
          }
        },
        {
          "d": "M 0 -.76 Q -.16 -.68 -.22 -.51 L -.35 -.3 Q -.18 -.4 -.12 -.33 L 0 -.27 L .12 -.33 Q .18 -.4 .35 -.3 L .22 -.51 Q .16 -.68 0 -.76 Z",
          "fill": "shadow",
          "fillAlpha": 0.75,
          "stroke": "light",
          "strokeAlpha": 0.68,
          "width": 0.016
        },
        {
          "d": "M -.075 -.53 L -.014 -.525 L -.022 -.496 L -.069 -.5 Z M .014 -.525 L .075 -.53 L .069 -.5 L .022 -.496 L .014 -.525 Z",
          "fill": "light",
          "fillAlpha": 0.7
        },
        {
          "d": "M -.58 -.36 L -.37 -.28 L -.53 -.14 L -.83 -.23 M .58 -.36 L .37 -.28 L .53 -.14 L .83 -.23 M -.4 -.33 Q -.37 -.06 -.18 .16 M .4 -.33 Q .37 -.06 .18 .16",
          "fill": "none",
          "stroke": "light",
          "strokeAlpha": 0.65,
          "width": 0.018
        },
        {
          "d": "M -.73 .19 Q -.57 .12 -.43 .27 Q -.28 .33 0 .37 Q .28 .33 .43 .27 Q .57 .12 .73 .19 M -.63 .29 Q -.32 .62 0 .63 Q .32 .62 .63 .29 M -.51 .45 Q -.33 .81 -.2 .91 M .51 .45 Q .33 .81 .2 .91 M -.26 .69 Q 0 .91 .26 .69",
          "fill": "none",
          "stroke": "light",
          "strokeAlpha": 0.55,
          "width": 0.015
        },
        {
          "d": "M 0 -.22 L .065 -.14 L 0 -.06 L -.065 -.14 Z M -.05 -.015 L .05 -.015 L .085 .08 L 0 .13 L -.085 .08 Z",
          "fill": "color",
          "stroke": "light",
          "strokeAlpha": 0.7,
          "width": 0.014
        }
      ]
    }
  },
  "effects": [
    {
      "name": "satyr",
      "label": "サテュロス",
      "sourceCode": "C004",
      "ms": 1500,
      "color": "#3aa6ff",
      "light": "#e6f6ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 900,
        "cueMs": 900
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2a8cff",
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
          "color": "#4ab8ff",
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
                  0.85
                ],
                [
                  0.5599999999999999,
                  0.9
                ],
                [
                  0.63,
                  1
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
                  0.15
                ],
                [
                  0.2,
                  0.475
                ],
                [
                  0.6,
                  0.5
                ],
                [
                  0.6599999999999999,
                  0.55
                ],
                [
                  1,
                  0.52
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
                  1.1
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
          "color": "#7fd4ff",
          "light": "#e0f6ff",
          "shadow": "#2a7ad0",
          "blend": "add",
          "stroke": 0.01,
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
                  0.084
                ],
                [
                  0.2,
                  0.266
                ],
                [
                  0.6,
                  0.28
                ],
                [
                  0.6599999999999999,
                  0.30800000000000005
                ],
                [
                  1,
                  0.2912
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
                  -1.6
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
          "color": "#a8e2ff",
          "width": 1.6,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.8
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.156
                ],
                [
                  0.2,
                  0.494
                ],
                [
                  0.6,
                  0.52
                ],
                [
                  0.6599999999999999,
                  0.5720000000000001
                ],
                [
                  1,
                  0.5408000000000001
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
          "angleSpeed": 1.3,
          "sizeRange": [
            0.04,
            0.04
          ],
          "color": "#dff4ff",
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
                  0.765
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
                  0.15
                ],
                [
                  0.2,
                  0.475
                ],
                [
                  0.6,
                  0.5
                ],
                [
                  0.6599999999999999,
                  0.55
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5ec0ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.32,
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
                  0.5
                ],
                [
                  0.6,
                  0.95
                ],
                [
                  0.76,
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
                  0.12
                ],
                [
                  0.6,
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
                  2.4
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
                  0.6,
                  0.95
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  0.6,
                  0.38
                ],
                [
                  1,
                  0.2
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
          "motion": "ballistic",
          "emit": "burst",
          "count": 28,
          "sizeRange": [
            0.012,
            0.03
          ],
          "speed": [
            0.25,
            0.7
          ],
          "lifeMs": [
            300,
            600
          ],
          "delayMs": [
            0,
            300
          ],
          "radius": 0.16,
          "color": "#a8e4ff",
          "texture": "glow",
          "emissionArc": [
            -2.2,
            -0.95
          ],
          "time": [
            0.08,
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
                  0.1,
                  0.9
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
          "time": [
            0.6,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "orbit",
          "count": 3,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 1,
          "angleSpeed": 1,
          "color": "#7fd0ff",
          "curves": {
            "angularProgress": {
              "keys": [
                [
                  0,
                  4.712
                ],
                [
                  1,
                  4.95
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
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radialCurve": {
            "keys": [
              [
                0,
                0.05
              ],
              [
                1,
                1
              ]
            ],
            "interpolation": "power-out",
            "exponent": 2.4
          },
          "materials": [
            {
              "texture": "glow",
              "radiusAbsolute": 0.42,
              "color": "#3a9cff",
              "blend": "add",
              "alphaScale": 0.7
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.3,
              "color": "#7cd0ff",
              "blend": "add",
              "rotationScale": 2
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.32,
              "color": "#ffffff",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.07,
              "radialOffset": -0.13,
              "alphaScale": 0.6,
              "color": "#8fd6ff",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.05,
              "radialOffset": -0.26,
              "alphaScale": 0.35,
              "color": "#8fd6ff",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.6,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8f2ff",
          "count": 36,
          "vortex": 0.5,
          "radius": 1.4,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
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
            0.6,
            0.8
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "ring",
          "color": "#c8eeff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
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
                  0.25
                ],
                [
                  1,
                  0.8
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  3.5
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
          "type": "card",
          "time": [
            0.6,
            0.8
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
      "name": "hecatoncheir",
      "label": "ヘカトンケイル",
      "sourceCode": "C020",
      "ms": 1350,
      "color": "#3aa6ff",
      "light": "#e6f6ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 945,
        "cueMs": 945
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2a8cff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.72,
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
          "color": "#4ab8ff",
          "texture": "magic-circle",
          "blend": "add",
          "directedRotation": true,
          "radius": 0.36,
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
                  0.6599999999999999,
                  0.9
                ],
                [
                  0.73,
                  1
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
                  0.108
                ],
                [
                  0.2,
                  0.34199999999999997
                ],
                [
                  0.7,
                  0.36
                ],
                [
                  0.76,
                  0.396
                ],
                [
                  1,
                  0.3744
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
                  1.1
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
          "color": "#7fd4ff",
          "light": "#e0f6ff",
          "shadow": "#2a7ad0",
          "blend": "add",
          "stroke": 0.01,
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
                  0.06048
                ],
                [
                  0.2,
                  0.19152
                ],
                [
                  0.7,
                  0.2016
                ],
                [
                  0.76,
                  0.22176
                ],
                [
                  1,
                  0.20966400000000002
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
                  -1.6
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
          "color": "#a8e2ff",
          "width": 1.6,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.8
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.11232
                ],
                [
                  0.2,
                  0.35568
                ],
                [
                  0.7,
                  0.3744
                ],
                [
                  0.76,
                  0.41184000000000004
                ],
                [
                  1,
                  0.389376
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
          "orbit": 0.36,
          "angleSpeed": 1.3,
          "sizeRange": [
            0.0288,
            0.0288
          ],
          "color": "#dff4ff",
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
                  0.765
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
                  0.108
                ],
                [
                  0.2,
                  0.34199999999999997
                ],
                [
                  0.7,
                  0.36
                ],
                [
                  0.76,
                  0.396
                ],
                [
                  1,
                  0.3744
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
          "color": "#5ec0ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.2304,
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
                  0.5
                ],
                [
                  0.7,
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
                  0.08639999999999999
                ],
                [
                  0.7,
                  0.2304
                ],
                [
                  1,
                  0.1872
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
                  2.4
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
                  0.7,
                  0.95
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
                  0.072
                ],
                [
                  0.7,
                  0.2736
                ],
                [
                  1,
                  0.144
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
          "motion": "ballistic",
          "emit": "burst",
          "count": 22,
          "sizeRange": [
            0.00864,
            0.021599999999999998
          ],
          "speed": [
            0.18,
            0.504
          ],
          "lifeMs": [
            300,
            600
          ],
          "delayMs": [
            0,
            300
          ],
          "radius": 0.1152,
          "color": "#a8e4ff",
          "texture": "glow",
          "emissionArc": [
            -2.2,
            -0.95
          ],
          "time": [
            0.08,
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
                  0.1,
                  0.9
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
          "time": [
            0.7,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "orbit",
          "count": 3,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.72,
          "angleSpeed": 1,
          "color": "#7fd0ff",
          "curves": {
            "angularProgress": {
              "keys": [
                [
                  0,
                  4.712
                ],
                [
                  1,
                  4.95
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
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radialCurve": {
            "keys": [
              [
                0,
                0.05
              ],
              [
                1,
                1
              ]
            ],
            "interpolation": "power-out",
            "exponent": 2.4
          },
          "materials": [
            {
              "texture": "glow",
              "radiusAbsolute": 0.3024,
              "color": "#3a9cff",
              "blend": "add",
              "alphaScale": 0.7
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.216,
              "color": "#7cd0ff",
              "blend": "add",
              "rotationScale": 2
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.2304,
              "color": "#ffffff",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.0504,
              "radialOffset": -0.0936,
              "alphaScale": 0.6,
              "color": "#8fd6ff",
              "blend": "add"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.036,
              "radialOffset": -0.1872,
              "alphaScale": 0.35,
              "color": "#8fd6ff",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "time": [
            0.7,
            1
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8f2ff",
          "count": 28,
          "vortex": 0.5,
          "radius": 1.008,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
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
            0.7,
            0.8
          ],
          "clockSpace": "life",
          "batch": 1,
          "type": "ring",
          "color": "#c8eeff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
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
                  0.18
                ],
                [
                  1,
                  0.576
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  3.5
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
          "type": "card",
          "time": [
            0.7,
            0.8999999999999999
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
      "name": "zombie",
      "label": "ゾンビ",
      "sourceCode": "C021",
      "ms": 1125,
      "color": "#9fe0f0",
      "light": "#f2fdff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 495,
        "cueMs": 495
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "time": [
            0,
            0.6
          ],
          "holdEnd": false,
          "filterOrder": [
            "saturation",
            "brightness"
          ],
          "curves": {
            "saturation": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.4,
                  0.7
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
          "type": "particles",
          "motion": "orbit",
          "count": 8,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.22,
          "orbitSize": 0.1,
          "angleSpeed": 0.4,
          "color": "#3a7a8a",
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
                  0.6
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
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  1,
                  0.4
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.32,
              "blend": "add",
              "rotationScale": 1,
              "alphaScale": 0.8
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#4ab0d0",
          "texture": "glow",
          "blend": "add",
          "radius": 0.8,
          "time": [
            0,
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
                  0.25,
                  0.45
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
          "type": "glow",
          "color": "#bff0ff",
          "texture": "smoke",
          "blend": "add",
          "radius": 0.42,
          "aspect": [
            0.8,
            1.3
          ],
          "variant": 1,
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
                  0.12,
                  1
                ],
                [
                  0.44,
                  1
                ],
                [
                  0.62,
                  0.4
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
                  0.2
                ],
                [
                  0.44,
                  -0.35
                ],
                [
                  1,
                  -0.5
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
          "type": "glow",
          "color": "#8fe0ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.22,
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
                  0.12,
                  1
                ],
                [
                  0.44,
                  1
                ],
                [
                  0.62,
                  0.4
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
                  0.2
                ],
                [
                  0.44,
                  -0.35
                ],
                [
                  1,
                  -0.5
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
          "type": "shape",
          "shape": "soul-wisp",
          "radius": 0.26,
          "color": "#c6f2f5",
          "light": "#ffffff",
          "shadow": "#2a6a9a",
          "blend": "add",
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
                  0.12,
                  1
                ],
                [
                  0.44,
                  1
                ],
                [
                  0.62,
                  0.4
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
                  0.2
                ],
                [
                  0.44,
                  -0.35
                ],
                [
                  1,
                  -0.5
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  -0.1
                ],
                [
                  0.5,
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.12,
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
                  0.12,
                  1
                ],
                [
                  0.44,
                  1
                ],
                [
                  0.62,
                  0.4
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
                  0.2
                ],
                [
                  0.44,
                  -0.35
                ],
                [
                  1,
                  -0.5
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 12,
          "phaseRate": [
            0.8,
            0.6
          ],
          "riseX": [
            0.3,
            0.7
          ],
          "riseY": [
            0.7,
            0
          ],
          "size": 0.03,
          "sizeSize": 0.03,
          "sizePhase": -0.02,
          "color": "#cff6ff",
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
                  0.15,
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
            }
          },
          "materials": [
            {
              "texture": "glow",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#3aa6ff",
          "texture": "glow",
          "blend": "add",
          "shiftY": -0.35,
          "time": [
            0.44,
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
                  0.15,
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
          "type": "ring",
          "color": "#c8eeff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
          "shiftY": -0.35,
          "time": [
            0.44,
            0.85
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
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.08
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  3.5
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
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8f2ff",
          "count": 20,
          "vortex": 0.5,
          "radius": 0.5,
          "shiftY": -0.35,
          "time": [
            0.44,
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
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        }
      ]
    },
    {
      "name": "behemoth",
      "label": "ベヒーモス",
      "sourceCode": "C060",
      "ms": 1650,
      "color": "#9fdcff",
      "light": "#ffffff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 841.5,
        "cueMs": 841.5
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a86ff",
          "texture": "glow",
          "blend": "add",
          "radius": 1.2,
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
                  0.51,
                  0.8
                ],
                [
                  0.75,
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
          "type": "glow",
          "color": "#5ec0ff",
          "texture": "magic-circle",
          "blend": "add",
          "directedRotation": true,
          "radius": 0.7,
          "time": [
            0,
            0.62
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
                  0.8
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
                  0.4
                ],
                [
                  0.25,
                  0.7
                ],
                [
                  0.8,
                  0.74
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
                  2.6
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#a8e4ff",
          "light": "#ffffff",
          "shadow": "#3a8ad0",
          "blend": "add",
          "radius": 0.4,
          "stroke": 0.012,
          "time": [
            0,
            0.62
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
              "interpolation": "power-in",
              "exponent": 1.6
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 16,
          "countScale": "none",
          "orbit": 0.5,
          "orbitVelocity": 0.3,
          "angleSpeed": 1.2,
          "color": "#dff6ff",
          "time": [
            0,
            0.51
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.8
              ],
              [
                1,
                0.05
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.4
          },
          "radialDelay": 0.5,
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
              "texture": "glow",
              "radiusAbsolute": 0.1,
              "aspect": [
                1.6,
                0.3
              ],
              "rotationScale": 1,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#9fd8ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.5,
          "aspect": [
            0.7,
            1.1
          ],
          "time": [
            0,
            0.53
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
                  0.6
                ],
                [
                  0.47000000000000003,
                  1
                ],
                [
                  0.51,
                  1.2
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
          "type": "shape",
          "shape": "crystal",
          "radius": 0.4,
          "color": "#4f9ee8",
          "light": "#ffffff",
          "shadow": "#2a64b8",
          "time": [
            0,
            0.53
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
                  0.47000000000000003,
                  1
                ],
                [
                  0.51,
                  1.2
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
            },
            "scaleX": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  0.1,
                  1
                ],
                [
                  0.18,
                  0.25
                ],
                [
                  0.26,
                  1
                ],
                [
                  0.33,
                  0.25
                ],
                [
                  0.39,
                  1
                ],
                [
                  0.44,
                  0.25
                ],
                [
                  0.48,
                  1
                ],
                [
                  0.51,
                  0.6
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
                  1.05
                ],
                [
                  0.51,
                  1.12
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "crystal",
          "radius": 0.4,
          "color": "#ffffff",
          "blend": "add",
          "time": [
            0,
            0.53
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
                  0.1
                ],
                [
                  0.48,
                  0.9
                ],
                [
                  0.51,
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
              "interpolation": "power-in",
              "exponent": 2
            },
            "scaleX": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  0.1,
                  1
                ],
                [
                  0.18,
                  0.25
                ],
                [
                  0.26,
                  1
                ],
                [
                  0.33,
                  0.25
                ],
                [
                  0.39,
                  1
                ],
                [
                  0.44,
                  0.25
                ],
                [
                  0.48,
                  1
                ],
                [
                  0.51,
                  0.6
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
                  1.05
                ],
                [
                  0.51,
                  1.12
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
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.3,
          "time": [
            0,
            0.53
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
                  0.3
                ],
                [
                  0.51,
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
              "interpolation": "power-in",
              "exponent": 1.8
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "time": [
            0.51,
            1
          ],
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
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
                  1.2
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
          "time": [
            0.51,
            1
          ],
          "type": "glow",
          "color": "#bfe8ff",
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
                  0.3
                ],
                [
                  1,
                  1.1
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
          "time": [
            0.51,
            0.8
          ],
          "type": "shape",
          "shape": "flare",
          "color": "#e8faff",
          "blend": "add",
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
                  0.95
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
          "time": [
            0.51,
            0.85
          ],
          "type": "ring",
          "color": "#ffffff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
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
                  0.2
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
                  6
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
          "time": [
            0.55,
            0.95
          ],
          "type": "ring",
          "color": "#7fd0ff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.2,
          "strokeProfile": "halo",
          "seedOffset": 5,
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
                  0.15
                ],
                [
                  1,
                  1
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
          "time": [
            0.51,
            1
          ],
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 18,
          "sizeRange": [
            0.035,
            0.07
          ],
          "speed": [
            0.8,
            1.6
          ],
          "drag": 2.5,
          "lifeMs": [
            450,
            800
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
            -8,
            8
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
                  0.7,
                  0.9
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
          "time": [
            0.51,
            1
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#f0faff",
          "count": 60,
          "vortex": 0.4,
          "radius": 1.2,
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
          "type": "card",
          "time": [
            0.51,
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
                  1.8
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
          "type": "shake",
          "time": [
            0.51,
            0.68
          ],
          "holdEnd": true,
          "strength": [
            0.035,
            0.02
          ],
          "frequencyHz": [
            19,
            14
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
      "name": "sylph",
      "label": "シルフ",
      "sourceCode": "C064",
      "ms": 975,
      "color": "#7fd4ff",
      "light": "#f2fbff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 351,
        "cueMs": 351
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#3aa6ff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.8,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.1,
                  0.45
                ],
                [
                  0.6,
                  0.36000000000000004
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#a8e8ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.45,
          "aspect": [
            0.8,
            1.2
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
                  0.6
                ],
                [
                  0.6,
                  0.48
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
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -9
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
          "color": "#e8fbff",
          "width": 2,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            2.6
          ],
          "seedOffset": 0,
          "time": [
            0.02,
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
                  0.1,
                  0.9
                ],
                [
                  0.6,
                  0.7200000000000001
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
                  0.65
                ],
                [
                  1,
                  0.442
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
                  -7
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
          "color": "#bff0ff",
          "width": 1.4,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            2.95
          ],
          "seedOffset": 1,
          "time": [
            0.05,
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
                  0.1,
                  0.8200000000000001
                ],
                [
                  0.6,
                  0.6560000000000001
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
                  0.5375
                ],
                [
                  1,
                  0.3655
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  -7.5
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
          "color": "#e8fbff",
          "width": 2,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            3.3
          ],
          "seedOffset": 2,
          "time": [
            0.08,
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
                  0.1,
                  0.74
                ],
                [
                  0.6,
                  0.592
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
                  0.4375
                ],
                [
                  1,
                  0.2975
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  2
                ],
                [
                  1,
                  -8
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
          "color": "#bff0ff",
          "width": 1.4,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            3.65
          ],
          "seedOffset": 3,
          "time": [
            0.11,
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
                  0.1,
                  0.66
                ],
                [
                  0.6,
                  0.528
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
                  0.3375
                ],
                [
                  1,
                  0.2295
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  3
                ],
                [
                  1,
                  -9
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
          "color": "#e8fbff",
          "width": 2,
          "widthSpace": "pixel",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "arc": [
            0,
            4
          ],
          "seedOffset": 4,
          "time": [
            0.13999999999999999,
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
                  0.1,
                  0.5800000000000001
                ],
                [
                  0.6,
                  0.4640000000000001
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
                  0.2375
                ],
                [
                  1,
                  0.1615
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  4
                ],
                [
                  1,
                  -10
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 16,
          "countScale": "none",
          "orbit": 0.36,
          "orbitSize": 0.2,
          "angleSpeed": 5,
          "angularSpread": 1,
          "sizeRange": [
            0.022,
            0.022
          ],
          "sizeSize": 0.02,
          "color": "#e0f8ff",
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
                  0.6,
                  0.7200000000000001
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
            "orbit": {
              "keys": [
                [
                  0,
                  0.5
                ],
                [
                  1,
                  0.25
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "glow",
              "blend": "add",
              "aspect": [
                1,
                0.5
              ],
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#e8f8ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.31,
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
                  0.2,
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
                  0.15
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 18,
          "sizeRange": [
            0.015,
            0.035
          ],
          "speed": [
            0.3,
            0.8
          ],
          "lifeMs": [
            300,
            600
          ],
          "delayMs": [
            0,
            250
          ],
          "radius": 0.12,
          "color": "#a8e4ff",
          "texture": "glow",
          "emissionArc": [
            -2.3,
            -0.85
          ],
          "time": [
            0.31,
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
                  0.9
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
          "type": "projectile",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0,
            0.1
          ],
          "toOffset": [
            0,
            -0.6
          ],
          "radius": 0.15,
          "shape": "soul-wisp",
          "color": "#91d8ff",
          "light": "#f3fbff",
          "shadow": "#176baa",
          "bend": 0.12,
          "time": [
            0.36,
            1
          ],
          "curves": {
            "progress": {
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
              "interpolation": "ease-out"
            },
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
                  0.65,
                  0.85
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "trail": {
            "length": 0.35,
            "width": 0.05,
            "color": "#91d8ff",
            "alpha": 0.6,
            "segments": 14
          }
        }
      ]
    },
    {
      "name": "nymph",
      "label": "ニンフ",
      "sourceCode": "C071",
      "ms": 1500,
      "color": "#9bd5ff",
      "light": "#f5f9ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 780,
        "cueMs": 780
      },
      "layers": [
        {
          "type": "beam",
          "anchor": "each-target",
          "basis": "unit",
          "colorFrom": "anchor",
          "geometry": "filament",
          "strokeProfile": "halo",
          "width": 0.022,
          "noise": 0.2,
          "segments": 40,
          "core": 0.6,
          "time": [
            0,
            0.46
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
                  0.8
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
          },
          "filamentClockRate": 3
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "target",
          "to": "source",
          "colorFrom": "anchor",
          "radius": 0.09,
          "shape": "orb",
          "bend": 0.28,
          "time": [
            0,
            0.51
          ],
          "curves": {
            "progress": {
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
                  0.65,
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
          "trail": {
            "length": 0.35,
            "width": 0.035,
            "alpha": 0.9,
            "segments": 16
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "copies": 5,
          "layout": "orbit",
          "orbit": 0.36,
          "time": [
            0.4,
            0.85
          ],
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ],
          "type": "shape",
          "shape": "orb",
          "radius": 0.08,
          "color": "#d6f4ff",
          "light": "#ffffff",
          "shadow": "#2a5a8a",
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
          "copies": 5,
          "layout": "orbit",
          "orbit": 0.36,
          "time": [
            0.4,
            0.85
          ],
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ],
          "type": "glow",
          "texture": "glow",
          "color": "#7fd0ff",
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
                  0.12,
                  0.9
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
          "type": "beam",
          "anchor": "each-target",
          "basis": "unit",
          "colorFrom": "anchor",
          "geometry": "filament",
          "strokeProfile": "ribbon",
          "width": 0.08,
          "noise": 0.26,
          "segments": 40,
          "core": 0,
          "time": [
            0,
            0.46
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
                  0.45
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
            }
          },
          "seedOffset": 5,
          "filamentClockRate": 4
        },
        {
          "type": "beam",
          "anchor": "each-target",
          "basis": "unit",
          "colorFrom": "anchor",
          "geometry": "filament",
          "strokeProfile": "halo",
          "width": 0.012,
          "noise": 0.3,
          "segments": 40,
          "core": 0.9,
          "time": [
            0,
            0.46
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
                  0.75
                ],
                [
                  0.7,
                  0.65
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "seedOffset": 9,
          "filamentClockRate": -5
        },
        {
          "type": "particles",
          "anchor": "path",
          "basis": "unit",
          "motion": "stream",
          "streamFrom": "target",
          "streamTo": "source",
          "count": 12,
          "size": 0.025,
          "sizeSize": 0.02,
          "color": "#e8f6ff",
          "time": [
            0,
            0.5
          ],
          "delayRatio": 0.4,
          "lifeRatio": 0.6,
          "materials": [
            {
              "texture": "glow",
              "color": "#ffffff",
              "radiusScale": 1.6,
              "alphaScale": 0.9
            }
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
                  0.75,
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#3aa6ff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.9,
          "time": [
            0.25,
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
                  0.2,
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#8edcff",
          "texture": "magic-circle",
          "blend": "add",
          "directedRotation": true,
          "time": [
            0.32,
            0.92
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
                  0.25
                ],
                [
                  0.25,
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
          "type": "glow",
          "color": "#e8f8ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.42,
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
                  0.15,
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
          "type": "particles",
          "motion": "radial-drag",
          "color": "#e0f6ff",
          "count": 24,
          "vortex": 0.6,
          "radius": 0.6,
          "time": [
            0.42,
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
                  1,
                  0.6
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "type": "projectile",
          "anchor": "source",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0,
            0.45
          ],
          "toOffset": [
            0,
            -0.46
          ],
          "radius": 0.15,
          "shape": "soul-wisp",
          "color": "#b2e7ff",
          "light": "#f3fbff",
          "shadow": "#176baa",
          "bend": 0.12,
          "time": [
            0.58,
            1
          ],
          "curves": {
            "progress": {
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
              "interpolation": "ease-out"
            },
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
                  0.65,
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
          "trail": {
            "length": 0.35,
            "width": 0.05,
            "color": "#b2e7ff",
            "alpha": 0.65,
            "segments": 14
          }
        }
      ]
    },
    {
      "name": "familiar",
      "label": "ファミリア",
      "sourceCode": "C089",
      "ms": 1200,
      "color": "#d0203a",
      "light": "#ffd0d6",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 648,
        "cueMs": 144
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#a01028",
          "texture": "smoke",
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
                  0.3,
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
                  0.75
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
                  -2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "orbit": 0.3,
          "orbitVelocity": 0.2,
          "angleSpeed": 1.4,
          "color": "#ff3a52",
          "time": [
            0,
            0.4
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.6
              ],
              [
                1,
                0.05
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
                  0.8,
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
              "texture": "glow",
              "radiusAbsolute": 0.14,
              "aspect": [
                1.6,
                0.35
              ],
              "rotationScale": 1,
              "blend": "add"
            }
          ]
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "target",
          "to": "source",
          "bend": 0.48,
          "time": [
            0.05,
            0.58
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.4
            },
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
                  0.85,
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
          "radius": 0.55,
          "texture": "glow",
          "color": "#ff2040",
          "trail": {
            "length": 0.6,
            "width": 0.16,
            "alpha": 0.55,
            "color": "#c0102c",
            "segments": 16
          }
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "target",
          "to": "source",
          "bend": 0.48,
          "time": [
            0.05,
            0.58
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.4
            },
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
                  0.85,
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
          "radius": 0.15,
          "shape": "orb",
          "color": "#a3102c",
          "light": "#ffb0b8",
          "shadow": "#2a0208"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "target",
          "to": "source",
          "bend": 0.48,
          "time": [
            0.08,
            0.58
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.4
            },
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
                  0.85,
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
          "radius": 0.28,
          "texture": "plasma",
          "color": "#ff4a60"
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ff4058",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.52,
            0.7000000000000001
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
                  0.25
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
          "type": "glow",
          "color": "#3aa6ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.55,
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
                  0.15,
                  0.9
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.3
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
          "type": "glow",
          "color": "#9fdcff",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0.55,
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
                  0.15,
                  0.9
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
          "type": "ring",
          "color": "#c8eeff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
          "time": [
            0.55,
            0.85
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
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  3.5
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
          "type": "particles",
          "motion": "radial-drag",
          "color": "#bfe8ff",
          "count": 22,
          "vortex": 0.6,
          "radius": 0.6,
          "time": [
            0.55,
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
          "type": "projectile",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0,
            0.1
          ],
          "toOffset": [
            0,
            -0.55
          ],
          "radius": 0.17,
          "shape": "soul-wisp",
          "color": "#91dcff",
          "light": "#f3fbff",
          "shadow": "#176baa",
          "bend": 0.12,
          "time": [
            0.6000000000000001,
            1
          ],
          "curves": {
            "progress": {
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
              "interpolation": "ease-out"
            },
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
                  0.65,
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
          "trail": {
            "length": 0.3,
            "width": 0.05,
            "color": "#91dcff",
            "alpha": 0.6,
            "segments": 14
          }
        }
      ]
    },
    {
      "name": "fiend",
      "label": "フィーンド",
      "sourceCode": "C099",
      "ms": 1080,
      "color": "#8a3ad0",
      "light": "#f0d8ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 658.8,
        "cueMs": 658.8
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a0a3a",
          "texture": "smoke",
          "radius": 0.5,
          "time": [
            0,
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
                  0.4,
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
                  -2.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "orbit": 0.3,
          "orbitVelocity": 0.2,
          "angleSpeed": 1.6,
          "color": "#c070ff",
          "time": [
            0,
            0.25
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.5
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
                  0.15,
                  1
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
              "texture": "plasma",
              "radiusAbsolute": 0.1,
              "rotationScale": 1,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#a050f0",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0,
            0.22
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
                  0.9
                ],
                [
                  1,
                  0.6
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
                  0.24
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
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.18,
            0.6
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.65
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
          "radius": 0.6,
          "texture": "glow",
          "color": "#7a20d0",
          "trail": {
            "length": 0.9,
            "width": 0.3,
            "color": "#5a18a0",
            "alpha": 0.9,
            "segments": 18
          }
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.18,
            0.6
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.65
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
          "radius": 0.42,
          "texture": "smoke",
          "color": "#b060ff",
          "trail": {
            "length": 0.45,
            "width": 0.1,
            "color": "#c080ff",
            "alpha": 0.7,
            "segments": 16
          }
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.18,
            0.6
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.65
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
          "radius": 0.36,
          "blend": "normal",
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.22,
              "#e0b0ff",
              0.95
            ],
            [
              0.5,
              "#8a30d0",
              0.8
            ],
            [
              0.8,
              "#3a0a5a",
              0.45
            ],
            [
              1,
              "#1e0630",
              0
            ]
          ]
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.18,
            0.6
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.65
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
          "radius": 0.3,
          "texture": "plasma",
          "color": "#d090ff"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.18,
            0.6
          ],
          "curves": {
            "progress": {
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
              "exponent": 1.65
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
          "radius": 0.15,
          "shape": "orb",
          "color": "#652485",
          "light": "#f0d0ff",
          "shadow": "#10091d"
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#c070ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.6,
            0.95
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
              "exponent": 2
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#1e0630",
          "texture": "smoke",
          "time": [
            0.6,
            1
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
                  0.8
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#a050f0",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "time": [
            0.6,
            1
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
                  -1.5
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "shape",
          "shape": "flare",
          "color": "#d8a0ff",
          "blend": "add",
          "time": [
            0.6,
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
                  0.15
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "ease-out"
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0.3
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#e0b8ff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.2,
          "strokeProfile": "halo",
          "time": [
            0.6,
            0.9
          ],
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
                  0.1
                ],
                [
                  1,
                  0.6
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
                  1
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 20,
          "sizeRange": [
            0.05,
            0.09
          ],
          "speed": [
            0.5,
            1
          ],
          "drag": 2.2,
          "gravity": [
            0,
            -0.5
          ],
          "lifeMs": [
            350,
            650
          ],
          "delayMs": [
            0,
            50
          ],
          "texture": "plasma",
          "color": "#9040e0",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.6,
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
            0.6,
            0.85
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
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "shake",
          "time": [
            0.6,
            0.75
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
      "name": "phantom",
      "label": "ファントム（眷属強化）",
      "sourceCode": "C029",
      "ms": 3600,
      "color": "#8fd6f5",
      "light": "#f2fbff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 828,
        "cueMs": 828
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "radius": 0.02,
          "radiusSpace": "width",
          "width": 0.04,
          "color": "#bfeaff",
          "strokeProfile": "halo",
          "time": [
            0,
            0.4
          ],
          "noise": 0.055,
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.14
                ],
                [
                  0.3,
                  1.2
                ],
                [
                  1,
                  5.4
                ]
              ],
              "interpolation": "linear"
            },
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
                  0.65,
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "radius": 0.02,
          "radiusSpace": "width",
          "width": 1.4,
          "widthSpace": "pixel",
          "color": "#7cc8ea",
          "strokeProfile": "halo",
          "core": 0,
          "noise": 0.12,
          "noiseClock": -4,
          "time": [
            0.04,
            0.44
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.14
                ],
                [
                  0.3,
                  1.2
                ],
                [
                  1,
                  5.4
                ]
              ],
              "interpolation": "linear"
            },
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
                  0.65,
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
          "type": "ring",
          "radius": 0.02,
          "radiusSpace": "width",
          "width": 1,
          "widthSpace": "pixel",
          "color": "#d8f4ff",
          "strokeProfile": "halo",
          "core": 0,
          "noise": 0.08,
          "noiseClock": 5,
          "seedOffset": 11,
          "time": [
            0.08,
            0.48
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.14
                ],
                [
                  0.3,
                  1.2
                ],
                [
                  1,
                  5.4
                ]
              ],
              "interpolation": "linear"
            },
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
                  0.65,
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
          "type": "particles",
          "motion": "orbit",
          "count": 18,
          "countScale": "none",
          "orbit": 1,
          "orbitSpace": "width",
          "orbitSize": 0.12,
          "angleSpeed": 0.12,
          "color": "#a8e2f8",
          "time": [
            0,
            0.4
          ],
          "curves": {
            "orbit": {
              "keys": [
                [
                  0,
                  0.14
                ],
                [
                  0.3,
                  1.2
                ],
                [
                  1,
                  5.4
                ]
              ],
              "interpolation": "linear"
            },
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
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.32,
              "blend": "add",
              "rotationScale": 1,
              "alphaScale": 0.7
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.14,
              "color": "#e0f6ff",
              "blend": "add",
              "alphaScale": 0.6
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#6fc0e8",
          "texture": "glow",
          "blend": "add",
          "radius": 0.8,
          "time": [
            0,
            0.25
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
          "color": "#bfe8ff",
          "texture": "smoke",
          "blend": "add",
          "radius": 0.6,
          "aspect": [
            0.8,
            1.3
          ],
          "variant": 1,
          "time": [
            0,
            0.25
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
                  0.6,
                  0.5
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
                  0.1
                ],
                [
                  1,
                  -0.55
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
          "type": "glow",
          "blend": "normal",
          "aspect": [
            0.6,
            1.6
          ],
          "time": [
            0,
            0.28
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.9
            ],
            [
              0.25,
              "#dff6ff",
              0.75
            ],
            [
              0.6,
              "#6fc0e8",
              0.3
            ],
            [
              1,
              "#1d4a7a",
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
                  0.2,
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
            },
            "shiftY": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  1,
                  -0.45
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "offset": [
            0,
            0
          ],
          "type": "glow",
          "color": "#dff6ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.22,
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
                  0.2,
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
          "anchor": "each-target",
          "basis": "unit",
          "offset": [
            0,
            0
          ],
          "type": "glow",
          "color": "#2a7cc8",
          "texture": "glow",
          "blend": "add",
          "radius": 0.3,
          "time": [
            0.22,
            0.62
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
                  0.45
                ],
                [
                  0.85,
                  0.3825
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
          "offset": [
            0,
            0
          ],
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#8fd6f5",
          "light": "#e8f8ff",
          "shadow": "#3a8ac0",
          "blend": "add",
          "radius": 0.17,
          "stroke": 0.011,
          "time": [
            0.22,
            0.62
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
                  0.85,
                  0.85
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
                  2.4
                ]
              ],
              "interpolation": "linear"
            }
          },
          "bind": [
            {
              "input": "value",
              "target": "radius",
              "curve": {
                "keys": [
                  [
                    1,
                    0.17
                  ],
                  [
                    2,
                    0.2
                  ]
                ],
                "interpolation": "smooth"
              },
              "mode": "set"
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "offset": [
            0,
            0
          ],
          "type": "ring",
          "radius": 0.2,
          "width": 1.4,
          "widthSpace": "pixel",
          "color": "#bfeaff",
          "strokeProfile": "halo",
          "core": 0.3,
          "noise": 0.05,
          "noiseClock": 3,
          "time": [
            0.22,
            0.62
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
                  0.85
                ],
                [
                  0.85,
                  0.7224999999999999
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "bind": [
            {
              "input": "value",
              "target": "radius",
              "curve": {
                "keys": [
                  [
                    1,
                    0.2
                  ],
                  [
                    2,
                    0.23
                  ]
                ],
                "interpolation": "smooth"
              },
              "mode": "set"
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "offset": [
            0,
            0
          ],
          "type": "glow",
          "color": "#6fd0ff",
          "texture": "plasma-soft",
          "blend": "add",
          "radius": 0.12,
          "aspect": [
            0.75,
            1.25
          ],
          "shiftY": -0.03,
          "time": [
            0.22,
            0.62
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
                  0.55
                ],
                [
                  0.85,
                  0.4675
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
                  9
                ]
              ],
              "interpolation": "linear"
            }
          },
          "bind": [
            {
              "input": "value",
              "target": "radius",
              "curve": {
                "keys": [
                  [
                    1,
                    0.14
                  ],
                  [
                    2,
                    0.17
                  ]
                ],
                "interpolation": "smooth"
              },
              "mode": "set"
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "offset": [
            0,
            0
          ],
          "type": "glow",
          "color": "#9fe0ff",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "radius": 0.13,
          "aspect": [
            0.7,
            1.3
          ],
          "time": [
            0.22,
            0.62
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
                  0.9
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
          "anchor": "each-target",
          "basis": "unit",
          "offset": [
            0,
            0
          ],
          "type": "glow",
          "color": "#dff6ff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.05,
          "shiftY": 0.01,
          "time": [
            0.22,
            0.62
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
                  0.5
                ],
                [
                  0.85,
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
          "anchor": "each-target",
          "basis": "unit",
          "offset": [
            0,
            0
          ],
          "type": "particles",
          "motion": "orbit",
          "count": 5,
          "countScale": "none",
          "orbit": 0.1,
          "orbitSize": 0.06,
          "angleSpeed": 0.6,
          "sizeRange": [
            0.02,
            0.02
          ],
          "color": "#cfefff",
          "time": [
            0.22,
            0.62
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
                  0.8
                ],
                [
                  0.85,
                  0.68
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
      ],
      "variants": [
        {
          "name": "eidolon",
          "label": "エイドロン（眷属強化）",
          "sourceCode": "C034",
          "value": 2
        }
      ]
    },
    {
      "name": "arch-demon",
      "label": "アークデーモン",
      "sourceCode": "C082",
      "ms": 2100,
      "color": "#b060f0",
      "light": "#f4e0ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 903,
        "cueMs": 903
      },
      "layers": [
        {
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.03,
          "color": "#a040e0",
          "segments": 32,
          "noise": 0.12,
          "core": 0.55,
          "time": [
            0.08,
            0.91
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
                  0.9
                ],
                [
                  0.65,
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
          "cycles": 1,
          "bind": [
            {
              "input": "value",
              "target": "cycles",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ]
        },
        {
          "type": "particles",
          "anchor": "path",
          "basis": "unit",
          "motion": "stream",
          "streamFrom": "source",
          "streamTo": "target",
          "count": 18,
          "size": 0.05,
          "sizeSize": 0.035,
          "color": "#d394fa",
          "time": [
            0.12,
            0.91
          ],
          "delayRatio": 0.1,
          "lifeRatio": 0.7,
          "materials": [
            {
              "texture": "glow",
              "color": "#c885fa",
              "radiusScale": 1.7,
              "alphaScale": 0.7
            }
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
                  0.65,
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
          "cycles": 1,
          "bind": [
            {
              "input": "value",
              "target": "cycles",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ]
        },
        {
          "type": "ring",
          "anchor": "each-target",
          "basis": "unit",
          "radius": 0.56,
          "width": 0.024,
          "color": "#af64dd",
          "time": [
            0.14,
            0.96
          ],
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.8
                ],
                [
                  0.65,
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
          "cycles": 1,
          "bind": [
            {
              "input": "value",
              "target": "cycles",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ]
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "color": "#7a20c0",
          "texture": "glow",
          "blend": "add",
          "radius": 1,
          "time": [
            0,
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
                  0.6
                ],
                [
                  0.85,
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
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "color": "#c070ff",
          "texture": "magic-circle",
          "blend": "add",
          "directedRotation": true,
          "radius": 0.6,
          "time": [
            0,
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
                  0.75
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
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "color": "#2a0a3a",
          "texture": "smoke",
          "radius": 0.7,
          "variant": 1,
          "time": [
            0,
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
                  0.5
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
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -1
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
            0.14,
            0.96
          ],
          "cycles": 1,
          "bind": [
            {
              "input": "value",
              "target": "cycles",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ],
          "type": "glow",
          "color": "#9a40e8",
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
                  0.12,
                  0.9
                ],
                [
                  0.65,
                  0.63
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
                  0.3,
                  0.5
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
            0.14,
            0.96
          ],
          "cycles": 1,
          "bind": [
            {
              "input": "value",
              "target": "cycles",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ],
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#d090ff",
          "light": "#ffffff",
          "shadow": "#6020a0",
          "blend": "add",
          "stroke": 0.012,
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
                  0.65,
                  0.63
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
                  0.36
                ],
                [
                  1,
                  0.4
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
                  -1.2
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
            0.14,
            0.96
          ],
          "cycles": 1,
          "bind": [
            {
              "input": "value",
              "target": "cycles",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ],
          "type": "glow",
          "color": "#f0d8ff",
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
                  0.85
                ],
                [
                  0.4,
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
                  0.15
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
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.14,
            0.96
          ],
          "cycles": 1,
          "bind": [
            {
              "input": "value",
              "target": "cycles",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#e0b0ff",
          "count": 18,
          "vortex": 0.6,
          "radius": 0.6,
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
                  0.65,
                  0.63
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
      "name": "gremlin",
      "label": "グレムリン",
      "sourceCode": "C083",
      "ms": 1350,
      "color": "#6a5a68",
      "light": "#e8dcd0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 608,
        "cueMs": 608
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "color": "#2a2230",
          "texture": "smoke",
          "radius": 0.6,
          "variant": 1,
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
                  1
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.05,
          "color": "#3a3040",
          "segments": 32,
          "noise": 0.12,
          "core": 0,
          "time": [
            0,
            0.54
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
                  0.9
                ],
                [
                  0.65,
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
          "widthSpace": "unit"
        },
        {
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.014,
          "color": "#ffb060",
          "segments": 32,
          "noise": 0.16,
          "core": 0.6,
          "time": [
            0,
            0.54
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
                  0.9
                ],
                [
                  0.65,
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
          "widthSpace": "unit",
          "seedOffset": 3
        },
        {
          "type": "particles",
          "anchor": "path",
          "basis": "unit",
          "motion": "stream",
          "streamFrom": "source",
          "streamTo": "target",
          "count": 16,
          "size": 0.05,
          "sizeSize": 0.04,
          "color": "#2a2230",
          "time": [
            0,
            0.55
          ],
          "delayRatio": 0.15,
          "lifeRatio": 0.75,
          "materials": [
            {
              "texture": "smoke",
              "radiusScale": 2.2,
              "alphaScale": 0.85,
              "blend": "normal"
            }
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
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "shape": "gear-ring",
          "radius": 0.15,
          "color": "#65535b",
          "light": "#e0c8a8",
          "shadow": "#211e2a",
          "bend": 0.25,
          "time": [
            0.03,
            0.57
          ],
          "curves": {
            "progress": {
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
                  4
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
                  0.12,
                  0.85
                ],
                [
                  0.65,
                  0.85
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
          "type": "glow",
          "color": "#1e1820",
          "texture": "smoke",
          "time": [
            0.45,
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
                  0.15,
                  0.85
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.25
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
                  0.7
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#4a3a48",
          "texture": "smoke",
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
                  0.2,
                  0.6
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
                  0.3
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
                  0.5
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 14,
          "sizeRange": [
            0.008,
            0.018
          ],
          "speed": [
            0.5,
            1.1
          ],
          "drag": 2.5,
          "gravity": [
            0,
            0.8
          ],
          "lifeMs": [
            250,
            500
          ],
          "delayMs": [
            0,
            60
          ],
          "texture": "glow",
          "color": "#ffa040",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.45,
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 6,
          "sizeRange": [
            0.035,
            0.055
          ],
          "speed": [
            0.3,
            0.6
          ],
          "drag": 1.5,
          "gravity": [
            0,
            1.8
          ],
          "lifeMs": [
            500,
            800
          ],
          "delayMs": [
            0,
            80
          ],
          "shape": "gear-ring",
          "color": "#65535b",
          "light": "#c8b4a0",
          "shadow": "#211e2a",
          "spin": [
            -8,
            8
          ],
          "emissionArc": [
            3.6,
            5.8
          ],
          "time": [
            0.45,
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
                  0.7,
                  0.9
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
            0.45,
            1
          ],
          "filterOrder": [
            "sepia",
            "saturation",
            "brightness"
          ],
          "curves": {
            "sepia": {
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
                  0.5
                ],
                [
                  1,
                  0
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
                  0.15,
                  0.4
                ],
                [
                  0.7,
                  0.5
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.15,
                  0.65
                ],
                [
                  0.7,
                  0.75
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "shake",
          "time": [
            0.45,
            0.5700000000000001
          ],
          "holdEnd": true,
          "strength": [
            0.015,
            0.006
          ],
          "frequencyHz": [
            23,
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
      "name": "lilith",
      "label": "リリス",
      "sourceCode": "C095",
      "ms": 2250,
      "color": "#e05098",
      "light": "#ffe0f0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 967.5,
        "cueMs": 967.5
      },
      "layers": [
        {
          "type": "shape",
          "anchor": "source",
          "basis": "unit",
          "shape": "petal-seal",
          "radius": 0.2,
          "color": "#c83a8a",
          "light": "#ffd0e8",
          "shadow": "#6e1f66",
          "copies": 2,
          "layout": "orbit",
          "orbit": 0.43,
          "time": [
            0,
            0.25
          ],
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
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
                  0.65,
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
                  0.6
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
          "texture": "glow",
          "color": "#ff4aa0",
          "blend": "add",
          "radius": 0.3,
          "copies": 2,
          "layout": "orbit",
          "orbit": 0.43,
          "time": [
            0,
            0.25
          ],
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              },
              "mode": "set"
            }
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
                  0.8
                ],
                [
                  0.65,
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
                  0.6
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
          "color": "#a02870",
          "texture": "glow",
          "blend": "add",
          "radius": 0.9,
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
                  0.2,
                  0.5
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "orbit": 0.42,
          "orbitSize": 0.15,
          "angleSpeed": 0.6,
          "size": 0.05,
          "sizeSize": 0.03,
          "particleSpin": 4,
          "color": "#ff7ab8",
          "light": "#ffe0f0",
          "shadow": "#a02870",
          "time": [
            0,
            0.35
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
          },
          "materials": [
            {
              "shape": "feather",
              "blend": "normal",
              "rotationScale": 1
            }
          ]
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "bend": 0.4,
          "time": [
            0.15,
            0.43
          ],
          "targetSpread": 0.49,
          "curves": {
            "progress": {
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
                  0.75,
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
          "radius": 0.35,
          "texture": "glow",
          "color": "#ff4aa0",
          "trail": {
            "length": 0.5,
            "width": 0.1,
            "color": "#ff70b0",
            "alpha": 0.7,
            "segments": 16
          }
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "shape": "petal-seal",
          "radius": 0.18,
          "color": "#bc378d",
          "light": "#ffbadf",
          "shadow": "#6e1f66",
          "bend": 0.4,
          "time": [
            0.15,
            0.43
          ],
          "targetSpread": 0.49,
          "curves": {
            "progress": {
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
                  0.65,
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
                  2.7
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "targetSpread": 0.49,
          "type": "glow",
          "color": "#ff70b8",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.37,
            0.62
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
              "exponent": 2
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
            }
          }
        },
        {
          "type": "ring",
          "anchor": "each-target",
          "basis": "unit",
          "radius": 0.24,
          "width": 0.036,
          "color": "#e76cae",
          "time": [
            0.37,
            0.51
          ],
          "targetSpread": 0.49,
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.22
                ],
                [
                  0.45,
                  0.68
                ],
                [
                  1,
                  0.73
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
                  0.12,
                  0.9
                ],
                [
                  0.65,
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
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "targetSpread": 0.49,
          "type": "shape",
          "shape": "petal-seal",
          "color": "#ff7ab8",
          "light": "#ffe0f0",
          "shadow": "#a02870",
          "blend": "add",
          "time": [
            0.37,
            0.65
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
                  1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "targetSpread": 0.49,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 12,
          "sizeRange": [
            0.04,
            0.07
          ],
          "speed": [
            0.5,
            1
          ],
          "drag": 2,
          "gravity": [
            0,
            0.6
          ],
          "lifeMs": [
            450,
            750
          ],
          "delayMs": [
            0,
            50
          ],
          "shape": "feather",
          "color": "#ff7ab8",
          "light": "#ffe0f0",
          "shadow": "#a02870",
          "spin": [
            -6,
            6
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.37,
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
                  0.7,
                  0.9
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
          "type": "card",
          "anchor": "each-target",
          "basis": "unit",
          "scale": 1,
          "time": [
            0.39,
            0.51
          ],
          "targetSpread": 0.49,
          "curves": {
            "scale": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  1.085
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
          "anchor": "each-target",
          "basis": "unit",
          "targetSpread": 0.49,
          "type": "card",
          "time": [
            0.39,
            0.55
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
      "name": "overlord",
      "label": "オーバーロード",
      "sourceCode": "C097",
      "ms": 1500,
      "color": "#b060f0",
      "light": "#f4e0ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
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
          "type": "glow",
          "color": "#2a0a3a",
          "texture": "smoke",
          "radius": 1.1,
          "variant": 1,
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
                  0.15,
                  0.4
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
          "type": "glow",
          "color": "#7a20c0",
          "texture": "glow",
          "blend": "add",
          "radius": 1.2,
          "time": [
            0,
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
                  0.2,
                  0.35
                ],
                [
                  0.5,
                  0.7
                ],
                [
                  0.75,
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
          "type": "card",
          "echo": true,
          "artOnly": true,
          "lumaMask": true,
          "lumaGain": 2.4,
          "lumaExponent": 1.2,
          "blend": "add",
          "color": "#c070ff",
          "time": [
            0.02,
            0.3
          ],
          "curves": {
            "x": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  -0.18
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "opacity": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "echo": true,
          "artOnly": true,
          "lumaMask": true,
          "lumaGain": 2.4,
          "lumaExponent": 1.2,
          "blend": "add",
          "color": "#ff70d0",
          "time": [
            0.02,
            0.3
          ],
          "curves": {
            "x": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  0.18
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "opacity": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
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
          "type": "card",
          "echo": true,
          "artOnly": true,
          "lumaMask": true,
          "lumaGain": 2.4,
          "lumaExponent": 1.2,
          "blend": "add",
          "color": "#a050f0",
          "time": [
            0.08,
            0.52
          ],
          "curves": {
            "scale": {
              "keys": [
                [
                  0,
                  2.6
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.8
            },
            "y": {
              "keys": [
                [
                  0,
                  -0.5
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.8
            },
            "opacity": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.25,
                  0.8
                ],
                [
                  0.9,
                  0.95
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
          "type": "card",
          "echo": true,
          "artOnly": true,
          "lumaMask": true,
          "lumaGain": 2.4,
          "lumaExponent": 1.2,
          "blend": "add",
          "color": "#e0b0ff",
          "time": [
            0.14,
            0.52
          ],
          "curves": {
            "scale": {
              "keys": [
                [
                  0,
                  2
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.8
            },
            "y": {
              "keys": [
                [
                  0,
                  -0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.8
            },
            "opacity": {
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
                  0.9,
                  0.85
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
          "color": "#ffffff",
          "texture": "glow",
          "time": [
            0.5,
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
                  1
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
          "type": "glow",
          "color": "#c070ff",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0.5,
            1
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
                  1
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
          "type": "shape",
          "shape": "flare",
          "color": "#f0d0ff",
          "blend": "add",
          "time": [
            0.5,
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
            },
            "rotation": {
              "keys": [
                [
                  0,
                  0
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
          "type": "ring",
          "color": "#f0d8ff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
          "time": [
            0.5,
            0.92
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
                  6
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
          "type": "ring",
          "geometry": "superellipse",
          "pad": 0.04,
          "radius": 1,
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.03,
          "color": "#d090ff",
          "strokeProfile": "halo",
          "core": 0.5,
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
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "radial-drag",
          "color": "#e0b8ff",
          "count": 50,
          "vortex": 0.5,
          "radius": 1.1,
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
          "type": "card",
          "time": [
            0.5,
            0.85
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
                  1.8
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
          "type": "shake",
          "time": [
            0.5,
            0.78
          ],
          "holdEnd": true,
          "strength": [
            0.03,
            0.02
          ],
          "frequencyHz": [
            18,
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
      "name": "minotaur",
      "label": "ミノタウロス",
      "sourceCode": "C009",
      "ms": 975,
      "color": "#ff3a20",
      "light": "#ffe0c0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 448.5,
        "cueMs": 82.875
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "color": "#a00804",
          "texture": "glow",
          "blend": "add",
          "radius": 1.5,
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
                  0.3,
                  0.35
                ],
                [
                  0.5,
                  0.5
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
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.7,
          "orbitSize": 0.2,
          "angleSpeed": 0.9,
          "color": "#2a0402",
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
                  0.75,
                  0.81
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
                  0.45
                ],
                [
                  1,
                  0.95
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.55,
              "blend": "normal",
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "particles",
          "motion": "orbit",
          "count": 9,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "moteOffset": 20,
          "orbit": 0.6,
          "orbitSize": 0.2,
          "angleSpeed": -1.2,
          "color": "#ff2a10",
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
                  0.75,
                  0.675
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
                  0.4
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.45,
              "blend": "add",
              "rotationScale": -1,
              "variantOffset": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "particles",
          "motion": "rise",
          "count": 30,
          "phaseRate": [
            2,
            1.2
          ],
          "riseX": [
            -0.15,
            1.15
          ],
          "riseY": [
            0.95,
            -0.65
          ],
          "sway": 0.05,
          "swayFrequency": 10,
          "size": 0.16,
          "sizeSize": 0.12,
          "sizePhase": -0.1,
          "rotationPhase": 1.5,
          "color": "#ff4a14",
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
                  0.75,
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
              "color": "#ff3a10",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "plasma-soft",
              "color": "#ffc060",
              "radiusScale": 0.5,
              "blend": "add",
              "variantOffset": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "ring",
          "geometry": "superellipse",
          "pad": 0.04,
          "radius": 1,
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.08,
          "noiseClock": 12,
          "color": "#ff3a1a",
          "strokeProfile": "halo",
          "core": 0.4,
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
                  0.75,
                  0.855
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
          "time": [
            0,
            0.18
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "shape",
          "shape": "flare",
          "color": "#ff5a30",
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
                  0.4
                ],
                [
                  1,
                  1.3
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
          "time": [
            0,
            0.2
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "ring",
          "color": "#ffb080",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.2,
          "strokeProfile": "halo",
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
                  0.2
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  5
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
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 24,
          "sizeRange": [
            0.01,
            0.022
          ],
          "speed": [
            0.6,
            1.3
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.6
          ],
          "lifeMs": [
            300,
            600
          ],
          "delayMs": [
            0,
            120
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
          "anchor": "source",
          "basis": "unit",
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "card",
          "filterOrder": [
            "sepia",
            "hue",
            "saturation",
            "brightness"
          ],
          "curves": {
            "sepia": {
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
            "hue": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.15,
                  -30
                ],
                [
                  1,
                  -30
                ]
              ],
              "interpolation": "linear"
            },
            "saturation": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.15,
                  1.6
                ],
                [
                  0.8,
                  1.5
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.12,
                  1.35
                ],
                [
                  0.8,
                  1.1
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
          "time": [
            0,
            0.4
          ],
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "shake",
          "strength": [
            0.022,
            0.01
          ],
          "frequencyHz": [
            24,
            19
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  0.12,
                  1
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
            }
          }
        },
        {
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    1
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.03,
          "color": "#ee473d",
          "segments": 32,
          "noise": 0.05,
          "core": 0.6,
          "time": [
            0.4,
            0.62
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
                  0.9
                ],
                [
                  0.65,
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
        },
        {
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    1
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "ring",
          "anchor": "each-target",
          "basis": "unit",
          "radius": 0.34,
          "width": 0.026,
          "color": "#fa6555",
          "time": [
            0.44,
            0.68
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
                  0.9
                ],
                [
                  0.65,
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
                  0.48
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
          "bind": [
            {
              "input": "value",
              "target": "alpha",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    1
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "color": "#ff3a20",
          "texture": "glow",
          "blend": "add",
          "radius": 0.6,
          "time": [
            0.44,
            0.68
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
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "type": "card",
          "anchor": "source",
          "basis": "unit",
          "time": [
            0.38,
            0.88
          ],
          "moveTo": "next-target",
          "transition": "none",
          "curves": {
            "move": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.16,
                  1
                ],
                [
                  0.28,
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
          "bind": [
            {
              "input": "value",
              "target": "move",
              "mode": "multiply",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0
                  ],
                  [
                    3,
                    1
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "zIndex": 20
        }
      ]
    },
    {
      "name": "sleep-sheep",
      "label": "スリープシープ",
      "sourceCode": "C042",
      "ms": 1575,
      "color": "#d0203a",
      "light": "#ffd0d6",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 708.75,
        "cueMs": 708.75
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "time": [
            0,
            0.55
          ],
          "filterOrder": [
            "sepia",
            "hue",
            "saturation",
            "brightness"
          ],
          "curves": {
            "opacity": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.35,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "sepia": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  0.8
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "smooth"
            },
            "hue": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  -40
                ],
                [
                  1,
                  -45
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
                  0.4,
                  2.2
                ],
                [
                  1,
                  2.4
                ]
              ],
              "interpolation": "smooth"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.4,
                  0.85
                ],
                [
                  1,
                  1.2
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
          "count": 9,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.2,
          "orbitSize": 0.12,
          "angleSpeed": 0.35,
          "color": "#5a0a18",
          "time": [
            0.05,
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
                  0.2,
                  0.85
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
            },
            "orbit": {
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
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.42,
              "blend": "normal",
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 8,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "moteOffset": 20,
          "orbit": 0.18,
          "orbitSize": 0.1,
          "angleSpeed": -0.45,
          "color": "#d0203a",
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
                  0.2,
                  0.7
                ],
                [
                  0.6,
                  0.45
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
                  0.08
                ],
                [
                  1,
                  0.36
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.36,
              "blend": "add",
              "rotationScale": -1,
              "variantOffset": 1
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.1,
              "color": "#ffc0cc",
              "blend": "add",
              "alphaScale": 0.5
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "copies": 3,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "shape",
          "shape": "orb",
          "radius": 0.13,
          "color": "#a3102c",
          "light": "#ffb0b8",
          "shadow": "#2a0208",
          "time": [
            0.42,
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
                  0.7,
                  0.9
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
                  0.25,
                  -0.05
                ],
                [
                  1,
                  -0.55
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.039
                ],
                [
                  0.18,
                  0.14300000000000002
                ],
                [
                  0.3,
                  0.13
                ],
                [
                  0.75,
                  0.117
                ],
                [
                  1,
                  0.0325
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "copies": 3,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "texture": "glow",
          "color": "#ff2040",
          "blend": "add",
          "time": [
            0.42,
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
                  0.7,
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
                  0.25,
                  -0.05
                ],
                [
                  1,
                  -0.55
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  0.18,
                  0.55
                ],
                [
                  0.3,
                  0.5
                ],
                [
                  0.75,
                  0.45
                ],
                [
                  1,
                  0.125
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "copies": 3,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "texture": "plasma",
          "color": "#d01830",
          "blend": "add",
          "variant": 1,
          "time": [
            0.42,
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
                  0.8
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
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.25,
                  -0.05
                ],
                [
                  1,
                  -0.55
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.078
                ],
                [
                  0.18,
                  0.28600000000000003
                ],
                [
                  0.3,
                  0.26
                ],
                [
                  0.75,
                  0.234
                ],
                [
                  1,
                  0.065
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
          "copies": 3,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "texture": "glow",
          "color": "#ff5a6e",
          "blend": "add",
          "aspect": [
            0.12,
            1
          ],
          "time": [
            0.54,
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
                  0.3,
                  0.55
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
                  1,
                  -0.3
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.18
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
          "type": "glow",
          "color": "#ff4058",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.33999999999999997,
            0.6699999999999999
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
                  0.3
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ff8a98",
          "count": 24,
          "vortex": 0.6,
          "radius": 0.55,
          "afterglow": false,
          "time": [
            0.1,
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
                  0.8
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
            }
          }
        }
      ]
    },
    {
      "name": "scylla",
      "label": "スキュラ",
      "sourceCode": "C056",
      "ms": 1050,
      "color": "#2f8a1e",
      "light": "#c6f26a",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 546,
        "cueMs": 546
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.11,
          "color": "#1e5410",
          "light": "#5aa42e",
          "shadow": "#06120a",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.46,
            "width": 0.032,
            "color": "#1f5a14",
            "alpha": 0.45,
            "segments": 14
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            -0.42,
            -1.3
          ],
          "toOffset": [
            -0.18,
            0.12
          ],
          "time": [
            0,
            0.36
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 5
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.075,
          "color": "#2f7a18",
          "light": "#74bc44",
          "shadow": "#0c2208",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.35,
            "width": 0.05,
            "color": "#4c9a2a",
            "alpha": 0.45,
            "segments": 12
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            -0.39,
            -1.25
          ],
          "toOffset": [
            -0.18,
            0.12
          ],
          "time": [
            0.03,
            0.39
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 5
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.11,
          "color": "#1e5410",
          "light": "#5aa42e",
          "shadow": "#06120a",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.46,
            "width": 0.032,
            "color": "#1f5a14",
            "alpha": 0.45,
            "segments": 14
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            0.3,
            -0.95
          ],
          "toOffset": [
            0.2,
            -0.18
          ],
          "time": [
            0.08,
            0.38
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 216
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.075,
          "color": "#2f7a18",
          "light": "#74bc44",
          "shadow": "#0c2208",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.35,
            "width": 0.05,
            "color": "#4c9a2a",
            "alpha": 0.45,
            "segments": 12
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            0.32999999999999996,
            -0.8999999999999999
          ],
          "toOffset": [
            0.2,
            -0.18
          ],
          "time": [
            0.11,
            0.41000000000000003
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 216
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.11,
          "color": "#1e5410",
          "light": "#5aa42e",
          "shadow": "#06120a",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.46,
            "width": 0.032,
            "color": "#1f5a14",
            "alpha": 0.45,
            "segments": 14
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            -0.1,
            -1.4
          ],
          "toOffset": [
            -0.04,
            0.22
          ],
          "time": [
            0.16,
            0.52
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 427
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.075,
          "color": "#2f7a18",
          "light": "#74bc44",
          "shadow": "#0c2208",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.35,
            "width": 0.05,
            "color": "#4c9a2a",
            "alpha": 0.45,
            "segments": 12
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            -0.07,
            -1.3499999999999999
          ],
          "toOffset": [
            -0.04,
            0.22
          ],
          "time": [
            0.19,
            0.55
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 427
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.11,
          "color": "#1e5410",
          "light": "#5aa42e",
          "shadow": "#06120a",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.46,
            "width": 0.032,
            "color": "#1f5a14",
            "alpha": 0.45,
            "segments": 14
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            0.46,
            -1.18
          ],
          "toOffset": [
            0.06,
            0.02
          ],
          "time": [
            0.24,
            0.56
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 638
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.075,
          "color": "#2f7a18",
          "light": "#74bc44",
          "shadow": "#0c2208",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.35,
            "width": 0.05,
            "color": "#4c9a2a",
            "alpha": 0.45,
            "segments": 12
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            0.49,
            -1.13
          ],
          "toOffset": [
            0.06,
            0.02
          ],
          "time": [
            0.27,
            0.5900000000000001
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 638
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.11,
          "color": "#1e5410",
          "light": "#5aa42e",
          "shadow": "#06120a",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.46,
            "width": 0.032,
            "color": "#1f5a14",
            "alpha": 0.45,
            "segments": 14
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            -0.3,
            -0.88
          ],
          "toOffset": [
            -0.22,
            -0.26
          ],
          "time": [
            0.3,
            0.6
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 849
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "projectile",
          "from": "target",
          "to": "target",
          "shape": "blood-drop",
          "radius": 0.075,
          "color": "#2f7a18",
          "light": "#74bc44",
          "shadow": "#0c2208",
          "spread": [
            0.2,
            0
          ],
          "trail": {
            "length": 0.35,
            "width": 0.05,
            "color": "#4c9a2a",
            "alpha": 0.45,
            "segments": 12
          },
          "curves": {
            "progress": {
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
              "exponent": 1.6
            },
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
                  1
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "fromOffset": [
            -0.27,
            -0.83
          ],
          "toOffset": [
            -0.22,
            -0.26
          ],
          "time": [
            0.32999999999999996,
            0.63
          ],
          "copies": 1,
          "jitter": 0.32,
          "fromJitter": [
            0.42,
            0.22
          ],
          "timeJitter": 0.06,
          "seedOffset": 849
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.52,
            1
          ],
          "type": "glow",
          "color": "#5aa83a",
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
              "exponent": 2.5
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
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.52,
            1
          ],
          "type": "glow",
          "color": "#163608",
          "texture": "smoke",
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
                  0.85
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2
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
                  0.6
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
            0.52,
            1
          ],
          "type": "glow",
          "color": "#2c2446",
          "texture": "smoke",
          "variant": 2,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2,
                  0.4
                ],
                [
                  0.6,
                  0.25
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
                  0.6
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
            0.52,
            1
          ],
          "type": "glow",
          "color": "#3f8a25",
          "texture": "plasma-soft",
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
                  0.1,
                  0.8
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  1,
                  0.48
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
                  -1
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
            0.52,
            1
          ],
          "type": "ring",
          "color": "#6ab83a",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.35,
          "strokeProfile": "halo",
          "core": 0.2,
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
              "exponent": 1.5
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
                  3.5
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
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.52,
            1
          ],
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 20,
          "sizeRange": [
            0.022,
            0.072
          ],
          "speed": [
            0.6,
            1.3
          ],
          "drag": 2.2,
          "gravity": [
            0,
            1.9
          ],
          "lifeMs": [
            400,
            700
          ],
          "delayMs": [
            0,
            40
          ],
          "shape": "blood-drop",
          "color": "#2f8a1e",
          "light": "#6cb43c",
          "shadow": "#0e1e04",
          "emissionArc": [
            3.4,
            6
          ],
          "particleRotation": [
            -0.6,
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
                  0.7,
                  0.9
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
          "time": [
            0.52,
            1
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#8ad86a",
          "count": 18,
          "vortex": 0.3,
          "radius": 0.6,
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.52,
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
      "name": "undine",
      "label": "ウンディーネ",
      "sourceCode": "C066",
      "ms": 1200,
      "color": "#8aa8c8",
      "light": "#e8f4ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 564,
        "cueMs": 564
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#3a5a8a",
          "texture": "glow",
          "blend": "add",
          "radius": 0.8,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.4
                ],
                [
                  0.65,
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 9,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.34,
          "orbitSize": 0.1,
          "angleSpeed": 0.25,
          "color": "#4a4660",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.75
                ],
                [
                  0.65,
                  0.6375
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
              "radiusAbsolute": 0.32,
              "blend": "normal",
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 8,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "moteOffset": 30,
          "orbit": 0.3,
          "orbitSize": 0.1,
          "angleSpeed": -0.3,
          "color": "#7ab4d8",
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
                  0.65,
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
                  0.45
                ],
                [
                  1,
                  0.22
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
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#8ac0e0",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.08,
          "noiseClock": 3,
          "strokeProfile": "halo",
          "core": 0.2,
          "seedOffset": 0,
          "time": [
            0.08,
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
                  0.25,
                  0.8
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
                  0.7
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#c8e8ff",
          "width": 1.8,
          "widthSpace": "pixel",
          "noise": 0.08,
          "noiseClock": 4,
          "strokeProfile": "halo",
          "core": 0.2,
          "seedOffset": 1,
          "time": [
            0.18,
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
                  0.25,
                  0.8
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
                  0.7
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#8ac0e0",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.08,
          "noiseClock": 5,
          "strokeProfile": "halo",
          "core": 0.2,
          "seedOffset": 2,
          "time": [
            0.28,
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
                  0.25,
                  0.8
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
                  0.7
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "rate",
          "rate": 14,
          "count": 14,
          "emission": "rect",
          "extent": [
            0.32,
            0.3
          ],
          "sizeRange": [
            0.018,
            0.032
          ],
          "speed": [
            0.05,
            0.1
          ],
          "direction": [
            1.5,
            1.64
          ],
          "gravity": [
            0,
            1.2
          ],
          "lifeMs": [
            400,
            700
          ],
          "shape": "blood-drop",
          "color": "#8ac0e0",
          "light": "#e8f8ff",
          "shadow": "#2a4a7a",
          "time": [
            0.1,
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
                  0.2,
                  0.9
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.15,
            0.95
          ],
          "filterOrder": [
            "saturation",
            "brightness"
          ],
          "curves": {
            "saturation": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  0.45
                ],
                [
                  0.7,
                  0.5
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  0.8
                ],
                [
                  0.7,
                  0.82
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
      "name": "spriggan",
      "label": "スプリガン",
      "sourceCode": "C079",
      "ms": 1350,
      "color": "#7ccf5a",
      "light": "#f0ffe0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 823.5,
        "cueMs": 823.5
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#3a9a28",
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
                  0.15,
                  0.4
                ],
                [
                  0.61,
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
          "seedOffset": 7,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.02,
              0.98
            ],
            [
              0.3425,
              0.635
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.02,
            0.69
          ],
          "width": 0.09,
          "color": "#2a5a18",
          "strokeProfile": "taper",
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
                  0.8,
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
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 7,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.02,
              0.98
            ],
            [
              0.3425,
              0.635
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.02,
            0.69
          ],
          "width": 0.04,
          "color": "#6cbf3e",
          "strokeProfile": "ribbon",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.8
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.05,
            0.08
          ],
          "speed": [
            0.05,
            0.15
          ],
          "drag": 1.5,
          "gravity": [
            0,
            0.05
          ],
          "lifeMs": [
            500,
            800
          ],
          "delayMs": [
            100,
            400
          ],
          "shape": "feather",
          "color": "#7ccf5a",
          "light": "#e8ffd0",
          "shadow": "#1a5a10",
          "spin": [
            -1,
            1
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "offset": [
            -0.18000000000000002,
            0.144
          ],
          "time": [
            0.02,
            0.76
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
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 8,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.98,
              0.98
            ],
            [
              0.6575,
              0.635
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.07,
            0.69
          ],
          "width": 0.09,
          "color": "#2a5a18",
          "strokeProfile": "taper",
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
                  0.8,
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
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 8,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.98,
              0.98
            ],
            [
              0.6575,
              0.635
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.07,
            0.69
          ],
          "width": 0.04,
          "color": "#6cbf3e",
          "strokeProfile": "ribbon",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.8
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.05,
            0.08
          ],
          "speed": [
            0.05,
            0.15
          ],
          "drag": 1.5,
          "gravity": [
            0,
            0.05
          ],
          "lifeMs": [
            500,
            800
          ],
          "delayMs": [
            100,
            400
          ],
          "shape": "feather",
          "color": "#7ccf5a",
          "light": "#e8ffd0",
          "shadow": "#1a5a10",
          "spin": [
            -1,
            1
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "offset": [
            0.17999999999999997,
            0.19200000000000003
          ],
          "time": [
            0.07,
            0.76
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
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 9,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.02,
              0.02
            ],
            [
              0.335,
              0.35000000000000003
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.12,
            0.69
          ],
          "width": 0.09,
          "color": "#2a5a18",
          "strokeProfile": "taper",
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
                  0.8,
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
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 9,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.02,
              0.02
            ],
            [
              0.335,
              0.35000000000000003
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.12,
            0.69
          ],
          "width": 0.04,
          "color": "#6cbf3e",
          "strokeProfile": "ribbon",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.8
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.05,
            0.08
          ],
          "speed": [
            0.05,
            0.15
          ],
          "drag": 1.5,
          "gravity": [
            0,
            0.05
          ],
          "lifeMs": [
            500,
            800
          ],
          "delayMs": [
            100,
            400
          ],
          "shape": "feather",
          "color": "#7ccf5a",
          "light": "#e8ffd0",
          "shadow": "#1a5a10",
          "spin": [
            -1,
            1
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "offset": [
            -0.19799999999999998,
            -0.168
          ],
          "time": [
            0.12,
            0.76
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
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 10,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.98,
              0.02
            ],
            [
              0.665,
              0.35000000000000003
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.17,
            0.69
          ],
          "width": 0.09,
          "color": "#2a5a18",
          "strokeProfile": "taper",
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
                  0.8,
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
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 10,
          "intrinsicAlpha": true,
          "type": "beam",
          "geometry": "filament",
          "points": [
            [
              0.98,
              0.02
            ],
            [
              0.665,
              0.35000000000000003
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.32,
          "segments": 36,
          "filamentClockRate": 0.3,
          "time": [
            0.17,
            0.69
          ],
          "width": 0.04,
          "color": "#6cbf3e",
          "strokeProfile": "ribbon",
          "blend": "add",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.8
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.05,
            0.08
          ],
          "speed": [
            0.05,
            0.15
          ],
          "drag": 1.5,
          "gravity": [
            0,
            0.05
          ],
          "lifeMs": [
            500,
            800
          ],
          "delayMs": [
            100,
            400
          ],
          "shape": "feather",
          "color": "#7ccf5a",
          "light": "#e8ffd0",
          "shadow": "#1a5a10",
          "spin": [
            -1,
            1
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "offset": [
            0.19799999999999998,
            -0.216
          ],
          "time": [
            0.17,
            0.76
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
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 8,
          "countScale": "none",
          "orbit": 0.5,
          "orbitSize": 0.18,
          "angleSpeed": 0.5,
          "angularSpread": 0.4,
          "size": 0.06,
          "sizeSize": 0.03,
          "particleSpin": 3,
          "color": "#6cbf3e",
          "light": "#d8f8a8",
          "shadow": "#2e5a1a",
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
                  0.61,
                  1
                ],
                [
                  0.76,
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
                  0.7
                ],
                [
                  0.61,
                  0.42
                ],
                [
                  1,
                  0.42
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "shape": "feather",
              "blend": "normal",
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "radial-drag",
          "color": "#d8f8a8",
          "count": 20,
          "vortex": 0.5,
          "radius": 0.6,
          "afterglow": false,
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
                  0.61,
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
          "type": "ring",
          "geometry": "superellipse",
          "pad": 0.05,
          "radius": 1,
          "width": 2.4,
          "widthSpace": "pixel",
          "noise": 0.03,
          "color": "#e0ffd0",
          "strokeProfile": "halo",
          "core": 0.5,
          "time": [
            0.57,
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
          "type": "glow",
          "color": "#f0ffe8",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.61,
            0.95
          ],
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
              "exponent": 2.4
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 10,
          "sizeRange": [
            0.04,
            0.07
          ],
          "speed": [
            0.5,
            1
          ],
          "drag": 2,
          "lifeMs": [
            400,
            650
          ],
          "delayMs": [
            0,
            40
          ],
          "shape": "feather",
          "color": "#7ccf5a",
          "light": "#e0ffc0",
          "shadow": "#2e5a1a",
          "spin": [
            -6,
            6
          ],
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.61,
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
            0.61,
            0.85
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
      "name": "incubus",
      "label": "インキュバス",
      "sourceCode": "C084",
      "ms": 1350,
      "color": "#d0203a",
      "light": "#ffd0d6",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 621,
        "cueMs": 621
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0,
            0.55
          ],
          "filterOrder": [
            "sepia",
            "hue",
            "saturation",
            "brightness"
          ],
          "curves": {
            "opacity": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.35,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "sepia": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  0.8
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "smooth"
            },
            "hue": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.4,
                  -40
                ],
                [
                  1,
                  -45
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
                  0.4,
                  2.2
                ],
                [
                  1,
                  2.4
                ]
              ],
              "interpolation": "smooth"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.4,
                  0.85
                ],
                [
                  1,
                  1.2
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 9,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "orbit": 0.2,
          "orbitSize": 0.12,
          "angleSpeed": 0.35,
          "color": "#5a0a18",
          "time": [
            0.05,
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
                  0.2,
                  0.85
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
            },
            "orbit": {
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
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.42,
              "blend": "normal",
              "rotationScale": 1
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "copies": 2,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "shape",
          "shape": "orb",
          "radius": 0.13,
          "color": "#a3102c",
          "light": "#ffb0b8",
          "shadow": "#2a0208",
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
                  1
                ],
                [
                  0.7,
                  0.9
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
                  0.25,
                  -0.05
                ],
                [
                  1,
                  -0.55
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.039
                ],
                [
                  0.18,
                  0.14300000000000002
                ],
                [
                  0.3,
                  0.13
                ],
                [
                  0.75,
                  0.117
                ],
                [
                  1,
                  0.0325
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "orbit",
          "count": 8,
          "countScale": "none",
          "phaseDistribution": "uniform",
          "moteOffset": 20,
          "orbit": 0.18,
          "orbitSize": 0.1,
          "angleSpeed": -0.45,
          "color": "#d0203a",
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
                  0.2,
                  0.7
                ],
                [
                  0.6,
                  0.45
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
                  0.08
                ],
                [
                  1,
                  0.36
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "smoke",
              "radiusAbsolute": 0.36,
              "blend": "add",
              "rotationScale": -1,
              "variantOffset": 1
            },
            {
              "texture": "plasma-soft",
              "radiusAbsolute": 0.1,
              "color": "#c070ff",
              "blend": "add",
              "alphaScale": 0.5
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "copies": 2,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "texture": "glow",
          "color": "#ff2040",
          "blend": "add",
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
                  0.7,
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
                  0.25,
                  -0.05
                ],
                [
                  1,
                  -0.55
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  0.18,
                  0.55
                ],
                [
                  0.3,
                  0.5
                ],
                [
                  0.75,
                  0.45
                ],
                [
                  1,
                  0.125
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "copies": 2,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "texture": "plasma",
          "color": "#d01830",
          "blend": "add",
          "variant": 1,
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
                  0.8
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
            "shiftY": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.25,
                  -0.05
                ],
                [
                  1,
                  -0.55
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.078
                ],
                [
                  0.18,
                  0.28600000000000003
                ],
                [
                  0.3,
                  0.26
                ],
                [
                  0.75,
                  0.234
                ],
                [
                  1,
                  0.065
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
                  4
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "copies": 2,
          "layout": "orbit",
          "orbit": 0.2,
          "bind": [
            {
              "input": "value",
              "target": "copies",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    1
                  ],
                  [
                    128,
                    128
                  ]
                ],
                "interpolation": "linear"
              }
            },
            {
              "input": "value",
              "target": "orbit",
              "mode": "set",
              "curve": {
                "keys": [
                  [
                    1,
                    0
                  ],
                  [
                    2,
                    0.17
                  ],
                  [
                    3,
                    0.21
                  ],
                  [
                    6,
                    0.3
                  ],
                  [
                    9,
                    0.38
                  ],
                  [
                    20,
                    0.48
                  ]
                ],
                "interpolation": "linear"
              }
            }
          ],
          "type": "glow",
          "texture": "glow",
          "color": "#ff5a6e",
          "blend": "add",
          "aspect": [
            0.12,
            1
          ],
          "time": [
            0.52,
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
                  0.3,
                  0.55
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
                  1,
                  -0.3
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.6
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.18
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#ff4058",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.32,
            0.65
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
                  0.3
                ],
                [
                  1,
                  0.65
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ff8a98",
          "count": 24,
          "vortex": 0.6,
          "radius": 0.55,
          "afterglow": false,
          "time": [
            0.1,
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
                  0.8
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
            }
          }
        }
      ]
    },
    {
      "name": "chaos-imp",
      "label": "カオス・インプ",
      "sourceCode": "C094",
      "ms": 1350,
      "color": "#9a50e0",
      "light": "#f0e0ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 580.5,
        "cueMs": 580.5
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#6a20b0",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "time": [
            0,
            0.35
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
                  1,
                  0.45
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
                  -3
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.06,
          "color": "#2a0a3a",
          "segments": 24,
          "noise": 0.5,
          "core": 0,
          "time": [
            0,
            0.47
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
                  0.9
                ],
                [
                  0.65,
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
        },
        {
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.028,
          "color": "#b060ff",
          "segments": 24,
          "noise": 0.46,
          "core": 0.8,
          "time": [
            0,
            0.47
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
                  0.9
                ],
                [
                  0.65,
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
          "seedOffset": 4
        },
        {
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.014,
          "color": "#e0c0ff",
          "segments": 24,
          "noise": 0.6,
          "core": 0.9,
          "time": [
            0.05,
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
                  0.12,
                  0.9
                ],
                [
                  0.65,
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
          "seedOffset": 9
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#d0a0ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.35000000000000003,
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
                  0.55
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#e8c86a",
          "texture": "magic-circle",
          "blend": "add",
          "directedRotation": true,
          "time": [
            0.4,
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
                  0.25,
                  0.48
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
                  1.2
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#c9a050",
          "texture": "glow",
          "blend": "add",
          "radius": 0.7,
          "time": [
            0.4,
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
                  0.15,
                  0.5
                ],
                [
                  0.6,
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#ffe8a8",
          "width": 1.6,
          "widthSpace": "pixel",
          "noise": 0.03,
          "strokeProfile": "halo",
          "time": [
            0.4,
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
                  0.15,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.22
                ],
                [
                  0.25,
                  0.5
                ],
                [
                  1,
                  0.54
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#b070ff",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.25,
          "noiseClock": 8,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.4,
            0.85
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
            "radius": {
              "keys": [
                [
                  0,
                  0.3
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 20,
          "sizeRange": [
            0.01,
            0.022
          ],
          "speed": [
            0.6,
            1.3
          ],
          "drag": 2.5,
          "lifeMs": [
            250,
            500
          ],
          "delayMs": [
            0,
            80
          ],
          "texture": "glow",
          "color": "#c890ff",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.4,
            0.9
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
          "type": "particles",
          "motion": "orbit",
          "count": 8,
          "countScale": "none",
          "orbit": 0.45,
          "orbitSize": 0.1,
          "angleSpeed": 1.5,
          "sizeRange": [
            0.03,
            0.03
          ],
          "color": "#ffe8a8",
          "time": [
            0.4,
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
                  0.15,
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
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
    }
  ]
});
