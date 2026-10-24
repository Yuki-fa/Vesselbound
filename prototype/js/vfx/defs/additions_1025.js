/* 2026-10-25 利用者指定の新しい演出（Claude 直接。利用者の確認待ち＝LAB で☆）。
 * ヘルナイトの剣戟と血の吸収・ユミルの神秘のオーラ・グリマルキンの煌めきと光の柱・報酬への祝福（ファミリア／ゴーレム）・復活の指輪・隠密・防戦。
 * 第2弾（新しいキャラクター）：アラストルの呪印・エリニュスの復讐の火・エキドナの毒蛇の波・アトラスの重荷・サンダーバードの雷・ケールの血の衝撃。
 * 土台：全体攻撃の横一閃・破壊して取り込む・赤い縁の黒いオーラ・常時の強化・封印解放・光輪と降りる光の柱・錬成・姿を隠す霧・透明な盾・開戦の砂煙（FIX 済み）。
 * 生成元：scratchpad の gen_vfx_1025.py。 */
VbFxDefs.register({
  "schemaVersion": 2,
  "effects": [
    {
      "name": "hellknight-slash",
      "label": "ヘルナイト：剣戟と血の吸収 · C116",
      "ms": 1700,
      "color": "#e0283c",
      "light": "#ffe0e4",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 1090,
        "cueMs": 1090
      },
      "composites": [],
      "sourceCode": "C116",
      "layers": [
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "geometry": "filament",
          "strokeProfile": "ribbon",
          "points": [
            [
              0.02,
              0.02
            ],
            [
              0.98,
              0.98
            ]
          ],
          "pointSpace": "bounds",
          "pointOffsets": [
            [
              -0.14,
              -0.14
            ],
            [
              0.14,
              0.14
            ]
          ],
          "noise": 0.27,
          "segments": 64,
          "ribbonSeedOffset": 0,
          "width": 0.11,
          "color": "#ffe8ea",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.075,
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
              "interpolation": "linear"
            },
            "width": {
              "keys": [
                [
                  0,
                  0.11
                ],
                [
                  1,
                  0.03
                ]
              ],
              "interpolation": "linear"
            }
          },
          "time": [
            0.13,
            0.35
          ],
          "clockSpace": "life"
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "geometry": "filament",
          "points": [
            [
              0.02,
              0.02
            ],
            [
              0.98,
              0.98
            ]
          ],
          "pointSpace": "bounds",
          "pointOffsets": [
            [
              -0.14,
              -0.14
            ],
            [
              0.14,
              0.14
            ]
          ],
          "noise": 0.27,
          "segments": 64,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.075,
                  0.3
                ],
                [
                  0.35,
                  0.3
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "strokes": [
            {
              "color": "#ff2a3c",
              "width": 0.009,
              "core": 0,
              "profile": "halo",
              "pointOffset": [
                0,
                -0.13
              ]
            },
            {
              "color": "#ff2a3c",
              "width": 0.009,
              "core": 0,
              "profile": "halo",
              "pointOffset": [
                0,
                0
              ]
            },
            {
              "color": "#ff2a3c",
              "width": 0.009,
              "core": 0,
              "profile": "halo",
              "pointOffset": [
                0,
                0.13
              ]
            }
          ],
          "time": [
            0.13,
            0.35
          ],
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "line-motes",
          "count": 40,
          "moteOffset": 0,
          "pointSpace": "bounds",
          "points": [
            [
              0.02,
              0.02
            ],
            [
              0.98,
              0.98
            ]
          ],
          "pointOffsets": [
            [
              -0.14,
              -0.14
            ],
            [
              0.14,
              0.14
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
                  0.075,
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
              "interpolation": "linear"
            },
            "spreadDistance": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  1,
                  0.6
                ]
              ],
              "interpolation": "ease-out"
            },
            "scatter": {
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
              "interpolation": "ease-out"
            }
          },
          "materials": [
            {
              "texture": "plasma-soft",
              "color": "#e01028",
              "radius": 0.11,
              "radiusVelocity": 0.2,
              "alphaScale": 0.56,
              "rotationScale": 0,
              "moteSpin": 1,
              "rotationIndex": 1
            },
            {
              "texture": "plasma",
              "color": "#e01028",
              "radius": 0.055,
              "radiusVelocity": 0.095,
              "alphaScale": 0.36,
              "rotationScale": 0,
              "moteSpin": 1,
              "rotationIndex": 1
            },
            {
              "texture": "glow",
              "color": "#e01028",
              "radius": 0.018,
              "radiusSize": 0.028,
              "alphaScale": 0.7,
              "alphaCurve": {
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
              },
              "rotationScale": 0,
              "variant": 0,
              "moteShift": [
                1,
                0
              ]
            }
          ],
          "afterglowEvery": 4,
          "afterglowFixedRadius": 0.04,
          "afterglowColor": "#ff8692",
          "afterglowAlpha": 0.22,
          "time": [
            0.13,
            0.35
          ],
          "clockSpace": "life"
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#fff0f2",
          "texture": "glow",
          "blend": "add",
          "radius": 0.62,
          "time": [
            0.14,
            0.3
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.95
                ],
                [
                  0.6,
                  0.6649999999999999
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
            0.14,
            0.24
          ],
          "clockSpace": "life",
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.9
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
          "type": "glow",
          "color": "#3a0610",
          "texture": "smoke",
          "blend": "normal",
          "radius": 0.85,
          "time": [
            0.18,
            0.62
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.62
                ],
                [
                  0.6,
                  0.434
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
          "color": "#c0182c",
          "texture": "glow",
          "blend": "add",
          "radius": 0.6,
          "time": [
            0.2,
            0.58
          ],
          "clockSpace": "life",
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
                  0.385
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
          "anchor": "path",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "path-motes",
          "count": 14,
          "indexStart": 1,
          "reverse": true,
          "moteOffset": 300,
          "lagIndex": 0.02,
          "size": 0.12,
          "sizeIndex": 0.02,
          "alpha": 0.55,
          "opacityIndex": -0.018181818181818184,
          "orient": "mote",
          "orientationSpeed": 2,
          "color": "#ff5a6a",
          "materials": [
            {
              "texture": "glow",
              "blend": "add"
            }
          ],
          "location": "path",
          "time": [
            0.3,
            0.64
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.3,
          "curves": {
            "pathProgress": {
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
            }
          }
        },
        {
          "type": "glow",
          "anchor": "path",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#e0203a",
          "texture": "glow",
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
            },
            "pathProgress": {
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
            }
          },
          "radius": 0.42,
          "location": "path",
          "time": [
            0.3,
            0.64
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.3
        },
        {
          "type": "particles",
          "anchor": "path",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "path-motes",
          "count": 8,
          "moteOffset": 20,
          "lagDelay": 0.05,
          "size": 0.07,
          "sizeSize": 0.07,
          "alpha": 0.95,
          "orient": "trajectory",
          "orientationSpread": 0.12,
          "orientationOffset": -0.37699111843077515,
          "scatter": 0.4,
          "scatterRate": 2,
          "materials": [
            {
              "texture": "glow",
              "blend": "add"
            }
          ],
          "afterglowEvery": 1,
          "afterglowFixedRadius": 0.05,
          "afterglowAlpha": 0.3157894736842105,
          "afterglowColor": "#f67485",
          "curves": {
            "scatter": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  1,
                  0.22000000000000003
                ]
              ],
              "interpolation": "linear"
            },
            "pathProgress": {
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
            }
          },
          "location": "path",
          "time": [
            0.3,
            0.64
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.3
        },
        {
          "type": "fog",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "mode": "orbit-motes",
          "color": "#160406",
          "texture": "smoke",
          "blend": "normal",
          "extent": [
            0.4611,
            0.4611
          ],
          "count": 92,
          "spinRate": 2,
          "moteOffset": 0,
          "radialRange": [
            0.72,
            1.04
          ],
          "radialPower": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.82
                ],
                [
                  0.62,
                  0.82
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "extentSpace": "diagonal",
          "batch": 0,
          "time": [
            0.62,
            1.0
          ]
        },
        {
          "type": "fog",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "mode": "orbit-motes",
          "color": "#ee0827",
          "texture": "plasma",
          "blend": "add",
          "extent": [
            0.4505,
            0.4505
          ],
          "count": 90,
          "spinRate": -1.8,
          "moteOffset": 80,
          "radialRange": [
            0.72,
            1.04
          ],
          "radialPower": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.48
                ],
                [
                  0.62,
                  0.48
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "extentSpace": "diagonal",
          "batch": 0,
          "time": [
            0.62,
            1.0
          ]
        },
        {
          "type": "ring",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#c8142c",
          "width": 1.5,
          "noise": 0.037,
          "strokeProfile": "halo",
          "geometry": "superellipse",
          "pad": 0.04,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.854
                ],
                [
                  0.62,
                  0.854
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "radius": 1,
          "widthSpace": "pixel",
          "batch": 0,
          "time": [
            0.62,
            1.0
          ]
        },
        {
          "type": "ring",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 17,
          "intrinsicAlpha": true,
          "color": "#c8142c",
          "width": 0.7,
          "noise": 0.037,
          "strokeProfile": "halo",
          "geometry": "superellipse",
          "pad": 0.105,
          "noiseClock": -1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.427
                ],
                [
                  0.62,
                  0.427
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "radius": 1,
          "widthSpace": "pixel",
          "batch": 0,
          "time": [
            0.62,
            1.0
          ]
        },
        {
          "type": "ring",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#c8142c",
          "width": 0.02,
          "noise": 0.08,
          "strokeProfile": "halo",
          "radiusSpace": "diagonal",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.32
                ],
                [
                  0.62,
                  0.32
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "radius": 0.4982,
          "batch": 0,
          "time": [
            0.62,
            1.0
          ]
        },
        {
          "type": "particles",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#ee0827",
          "count": 94,
          "vortex": 2.5,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.67
                ],
                [
                  0.62,
                  0.67
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "radiusSpace": "diagonal",
          "radius": 0.6572,
          "batch": 0,
          "time": [
            0.62,
            1.0
          ]
        },
        {
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f72238",
          "texture": "plasma",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.88
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
                  0.33
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
                  2
                ]
              ],
              "interpolation": "linear"
            }
          },
          "variant": 1,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 1,
          "clockSpace": "life"
        },
        {
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f72238",
          "texture": "glow",
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
              "exponent": 4
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.05
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "linear"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 1,
          "clockSpace": "life"
        },
        {
          "type": "ring",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f72238",
          "width": 1,
          "noise": 0.18,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.72
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
                  0.168
                ],
                [
                  1,
                  0.9520000000000001
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4.8
                ],
                [
                  1,
                  1.8
                ]
              ],
              "interpolation": "linear"
            }
          },
          "widthSpace": "pixel",
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 1,
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#f72238",
          "count": 64,
          "vortex": 0.9,
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
          },
          "radius": 1.12,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 1,
          "clockSpace": "life"
        },
        {
          "type": "card",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 1,
          "playbackDuration": {
            "maxMs": 140,
            "maxRatio": 1
          },
          "holdEnd": true,
          "endAtEffectEnd": false,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.62
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
          "type": "shake",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 1,
          "playbackDuration": {
            "maxMs": 140,
            "maxRatio": 1
          },
          "holdEnd": true,
          "strength": [
            0.024,
            0
          ],
          "frequencyHz": [
            17.507043740108486,
            0.1
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
      "name": "ymir-aura",
      "label": "ユミル：神秘のオーラ（リロール） · C062",
      "ms": 1600,
      "color": "#8fdcff",
      "light": "#f0fbff",
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
        "atMs": 560,
        "cueMs": 560
      },
      "composites": [],
      "sourceCode": "C062",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#0e2a4a",
          "texture": "smoke",
          "blend": "normal",
          "radius": 0.95,
          "time": [
            0,
            0.85
          ],
          "clockSpace": "life",
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
                  0.6,
                  0.315
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
          "color": "#b9e8ff",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.78,
          "time": [
            0,
            0.92
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2,
                  0.55
                ],
                [
                  0.75,
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
          "type": "glow",
          "color": "#297996",
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
          "color": "#a5d8ea",
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
          "color": "#94d2e8",
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
          "color": "#cceefb",
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
          "color": "#94d2e8",
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
          "color": "#87c8e0",
          "light": "#ecf9fd",
          "shadow": "#20566a",
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
              "color": "#a5d8ea",
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
          "color": "#69b9d6",
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
          "color": "#f1fafe",
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
          "color": "#e2f6fd",
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
          "motion": "radial-drag",
          "color": "#dbf3fc",
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
            0.32,
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
          "seedOffset": 31,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#c9b8ff",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.28,
            0.9
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.7
                ],
                [
                  0.6,
                  0.48999999999999994
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
          "seedOffset": 32,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#a8ecff",
          "width": 1.0,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.36,
            1.0
          ],
          "clockSpace": "life",
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
                  0.6,
                  0.42
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
          "seedOffset": 33,
          "type": "particles",
          "motion": "rise",
          "count": 16,
          "phaseRate": [
            1.3,
            0.7
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            1.0,
            -0.45
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.045,
          "sizeSize": 0.027,
          "sizePhase": -0.04,
          "color": "#d8f4ff",
          "time": [
            0.25,
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
              "color": "#d8f4ff",
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "flare",
          "color": "#eef9ff",
          "blend": "add",
          "offset": [
            0.0,
            -0.42
          ],
          "time": [
            0.42,
            0.72
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
                  0.03
                ],
                [
                  0.4,
                  0.16
                ],
                [
                  1,
                  0.064
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
        }
      ]
    },
    {
      "name": "grimalkin-glint",
      "label": "グリマルキン：煌めき（あとX戦） · C095",
      "ms": 900,
      "color": "#e8c8ff",
      "light": "#fff8ff",
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
      "composites": [],
      "sourceCode": "C095",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#b98aff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.55,
          "time": [
            0.05,
            0.75
          ],
          "clockSpace": "life",
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
          "color": "#fff0c8",
          "texture": "glow",
          "blend": "add",
          "radius": 0.3,
          "time": [
            0.08,
            0.4
          ],
          "clockSpace": "life",
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
                  0.385
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
          "type": "shape",
          "shape": "flare",
          "color": "#fff4d8",
          "blend": "add",
          "offset": [
            -0.26,
            -0.34
          ],
          "time": [
            0.05,
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
                  0.03
                ],
                [
                  0.4,
                  0.34
                ],
                [
                  1,
                  0.136
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
          "type": "shape",
          "shape": "flare",
          "color": "#f4e6ff",
          "blend": "add",
          "offset": [
            0.3,
            -0.12
          ],
          "time": [
            0.2,
            0.72
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
                  0.03
                ],
                [
                  0.4,
                  0.27
                ],
                [
                  1,
                  0.10800000000000001
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
          "type": "shape",
          "shape": "flare",
          "color": "#fff4d8",
          "blend": "add",
          "offset": [
            -0.08,
            0.32
          ],
          "time": [
            0.35,
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
                  0.03
                ],
                [
                  0.4,
                  0.22
                ],
                [
                  1,
                  0.08800000000000001
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 42,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#f0d8ff",
          "width": 1.4,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.05,
            0.5
          ],
          "clockSpace": "life",
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
                  0.6,
                  0.42
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 41,
          "type": "particles",
          "motion": "rise",
          "count": 10,
          "phaseRate": [
            1.3,
            0.7
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            0.75,
            0.05
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.04,
          "sizeSize": 0.024,
          "sizePhase": -0.04,
          "color": "#f0dcff",
          "time": [
            0.1,
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
              "color": "#f0dcff",
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
      "name": "grimalkin-pillar",
      "label": "グリマルキン：光の柱（エンチャント強化） · C095",
      "ms": 1800,
      "color": "#ffd77a",
      "light": "#fffbe8",
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
        "atMs": 620,
        "cueMs": 620
      },
      "composites": [],
      "sourceCode": "C095",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "time": [
            0.0,
            0.32
          ],
          "type": "glow",
          "color": "#2a1648",
          "texture": "smoke",
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
                  0.5
                ],
                [
                  1,
                  0.8
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
          "time": [
            0.0,
            0.32
          ],
          "type": "glow",
          "color": "#b48aff",
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
                  0.3,
                  0.75
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
                  0.35
                ],
                [
                  0.8,
                  0.5
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
          "time": [
            0.0,
            0.32
          ],
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#c8a0ff",
          "light": "#fff5d8",
          "shadow": "#3a2f10",
          "radius": 0.5,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.3,
                  0.4
                ],
                [
                  0.8,
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
                  0.6
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.55
                ],
                [
                  0.75,
                  0.48
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
          "time": [
            0.224,
            0.44
          ],
          "type": "glow",
          "color": "#ffd970",
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
          "time": [
            0.224,
            0.44
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffd970",
          "count": 18,
          "radius": 0.9,
          "afterglow": true,
          "glint": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  0.2,
                  1
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
          "blend": "normal",
          "time": [
            0.256,
            0.76
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.25,
              "#ffeab0",
              0.8
            ],
            [
              0.55,
              "#ffc830",
              0.45
            ],
            [
              1,
              "#5a4408",
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
                  0.12,
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
                  0.3
                ],
                [
                  1,
                  1
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
          "count": 16,
          "phaseRate": [
            1.6,
            0.8
          ],
          "riseX": [
            0.05,
            0.95
          ],
          "riseY": [
            1,
            -0.4
          ],
          "sway": 0.02,
          "swayFrequency": 6,
          "size": 0.08,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#ffd560",
          "time": [
            0.28,
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
                  0.1,
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
              "texture": "plasma",
              "color": "#ffc830",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#ffeab0",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "time": [
            0.24,
            0.68
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
                  1.7
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "scale": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.2,
                  1.1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shake",
          "time": [
            0.24,
            0.4
          ],
          "holdEnd": true,
          "strength": [
            0.035,
            0.02
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffcf5a",
          "texture": "glow",
          "blend": "add",
          "radius": 1.0,
          "aspect": [
            0.9450000000000001,
            2.604
          ],
          "offset": [
            0,
            -1.8599999999999999
          ],
          "time": [
            0.3,
            0.95
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.4275
                ],
                [
                  0.6,
                  0.342
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
                  0.16,
                  1.0
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
          "color": "#ffcf5a",
          "texture": "glow",
          "blend": "add",
          "radius": 1.0,
          "aspect": [
            0.47250000000000003,
            2.604
          ],
          "offset": [
            0,
            -1.8599999999999999
          ],
          "time": [
            0.3,
            0.95
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.76
                ],
                [
                  0.6,
                  0.6080000000000001
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
                  0.16,
                  1.0
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
          "color": "#fffdf0",
          "texture": "glow",
          "blend": "add",
          "radius": 1.0,
          "aspect": [
            0.168,
            2.604
          ],
          "offset": [
            0,
            -1.8599999999999999
          ],
          "time": [
            0.3,
            0.95
          ],
          "clockSpace": "life",
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
                  0.6,
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
                  0.6
                ],
                [
                  0.16,
                  1.0
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
          "color": "#fff6d8",
          "texture": "glow",
          "blend": "add",
          "radius": 0.7,
          "time": [
            0.3,
            0.55
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  1.0
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
          "type": "card",
          "time": [
            0.3,
            0.62
          ],
          "clockSpace": "life",
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.85
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
          "type": "shape",
          "shape": "flare",
          "color": "#ffffff",
          "blend": "add",
          "offset": [
            -0.3,
            -0.5
          ],
          "time": [
            0.36,
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
                  0.3,
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
                  0.03
                ],
                [
                  0.4,
                  0.2
                ],
                [
                  1,
                  0.08000000000000002
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
          "type": "shape",
          "shape": "flare",
          "color": "#fff0c0",
          "blend": "add",
          "offset": [
            0.32,
            -0.2
          ],
          "time": [
            0.44,
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
                  0.03
                ],
                [
                  0.4,
                  0.16
                ],
                [
                  1,
                  0.064
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
          "type": "shape",
          "shape": "flare",
          "color": "#f0e0ff",
          "blend": "add",
          "offset": [
            -0.18,
            0.25
          ],
          "time": [
            0.52,
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
                  0.03
                ],
                [
                  0.4,
                  0.13
                ],
                [
                  1,
                  0.052000000000000005
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
          "seedOffset": 51,
          "type": "particles",
          "motion": "rise",
          "count": 22,
          "phaseRate": [
            1.3,
            0.7
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            1.1,
            -0.9
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.055,
          "sizeSize": 0.033,
          "sizePhase": -0.04,
          "color": "#ffe7a0",
          "time": [
            0.32,
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
              "color": "#ffe7a0",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fffaf0",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    },
    {
      "name": "reward-blessing",
      "label": "報酬への祝福（報酬とトレーダーの強化） · C114/C008",
      "ms": 1500,
      "color": "#7fe0b8",
      "light": "#f4fff8",
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
        "atMs": 700,
        "cueMs": 700
      },
      "composites": [],
      "sourceCode": "C114",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#58e7b3",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.62,
          "offset": [
            0,
            -0.18
          ],
          "time": [
            0.05,
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
                  0.25,
                  0.8
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
              "exponent": 1.5
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.85
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#58e7b3",
          "light": "#c8f7e6",
          "shadow": "#1b5f46",
          "blend": "normal",
          "radius": 0.9,
          "offset": [
            0,
            -0.18
          ],
          "time": [
            0.08,
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
                  0.25,
                  0.8
                ],
                [
                  0.85,
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
                  -1.6
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.05
                ],
                [
                  1,
                  0.55
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
          "type": "particles",
          "motion": "orbit",
          "count": 12,
          "countScale": "none",
          "orbit": 0.55,
          "offset": [
            0,
            -0.18
          ],
          "orbitVelocity": 0.2,
          "angleSpeed": 2,
          "time": [
            0,
            0.6
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.3
              ],
              [
                1,
                0.02
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
          "materials": [
            {
              "shape": "coin",
              "radiusAbsolute": 0.08,
              "rotationScale": 1,
              "color": "#64c7a3"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.05,
              "rotationScale": 1,
              "blend": "add",
              "color": "#acf3d9"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#4ae5ac",
          "texture": "plasma",
          "blend": "add",
          "offset": [
            0,
            -0.18
          ],
          "time": [
            0.2,
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
                  0.7,
                  0.95
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
                  0.08
                ],
                [
                  1,
                  0.36
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
          "type": "glow",
          "blend": "normal",
          "offset": [
            0,
            -0.18
          ],
          "time": [
            0.58,
            0.9
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.25,
              "#cff8e9",
              0.9
            ],
            [
              0.55,
              "#58e7b3",
              0.5
            ],
            [
              1,
              "#125039",
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
                  0.35
                ],
                [
                  1,
                  1.15
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "halo-ray",
          "color": "#f5e6ba",
          "blend": "add",
          "offset": [
            0,
            -0.18
          ],
          "time": [
            0.58,
            0.88
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
          "type": "ring",
          "color": "#baf5df",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.05,
          "strokeProfile": "halo",
          "offset": [
            0,
            -0.18
          ],
          "time": [
            0.6,
            0.92
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
                  0.15
                ],
                [
                  1,
                  0.9
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
          "type": "shape",
          "shape": "orb",
          "color": "#e7c358",
          "light": "#fbf5e4",
          "shadow": "#7b641f",
          "offset": [
            0,
            -0.18
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
                  0
                ],
                [
                  0.12,
                  1
                ],
                [
                  0.75,
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
                  0.05
                ],
                [
                  0.2,
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
                  0.2
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
          "color": "#ffffff",
          "blend": "add",
          "offset": [
            0.06,
            -0.3
          ],
          "time": [
            0.66,
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
                  0.3,
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
                  0.05
                ],
                [
                  0.4,
                  0.22
                ],
                [
                  1,
                  0.1
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
          "type": "particles",
          "motion": "rise",
          "count": 10,
          "phaseRate": [
            1.2,
            0.6
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            0.85,
            -0.1
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.05,
          "sizeSize": 0.03,
          "sizePhase": -0.04,
          "color": "#f0da99",
          "time": [
            0.6,
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
              "color": "#e7c358",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#f9f0d6",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "time": [
            0.55,
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
                  1
                ],
                [
                  0.2,
                  1.5
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
          "seedOffset": 61,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 7,
          "emission": "circle",
          "radius": 0.2,
          "sizeRange": [
            0.07,
            0.1
          ],
          "speed": [
            0.55,
            0.95
          ],
          "direction": [
            4.3,
            5.1
          ],
          "gravity": [
            0,
            -0.9
          ],
          "drag": 0.4,
          "spin": [
            -2,
            2
          ],
          "lifeMs": [
            700,
            1000
          ],
          "delayMs": [
            0,
            220
          ],
          "shape": "coin",
          "color": "#ffd25a",
          "light": "#fff6c8",
          "shadow": "#8a5a10",
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
          "seedOffset": 62,
          "type": "particles",
          "motion": "rise",
          "count": 14,
          "phaseRate": [
            1.3,
            0.7
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            0.8,
            -1.6
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.04,
          "sizeSize": 0.024,
          "sizePhase": -0.04,
          "color": "#c8ffe4",
          "time": [
            0.48,
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
              "color": "#c8ffe4",
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
      "name": "revival-ring",
      "label": "復活の指輪 · R018",
      "ms": 1500,
      "color": "#ffc89a",
      "light": "#fff6ee",
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
        "atMs": 660,
        "cueMs": 660
      },
      "composites": [],
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 71,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#ffe3b0",
          "width": 2.6,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0,
            0.62
          ],
          "clockSpace": "life",
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
                  0.6,
                  0.6649999999999999
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
                  0.34
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "offset": [
            0,
            -0.62
          ],
          "aspect": [
            1,
            0.32
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 72,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#ffb070",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.04,
            0.62
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.7
                ],
                [
                  0.6,
                  0.48999999999999994
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
                  0.38
                ],
                [
                  1,
                  0.34
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "offset": [
            0,
            -0.62
          ],
          "aspect": [
            1,
            0.32
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#fcc295",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.62,
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
                  1.4
                ]
              ],
              "interpolation": "linear"
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#fcc295",
          "light": "#fef2e9",
          "shadow": "#5a3112",
          "blend": "normal",
          "radius": 0.9,
          "time": [
            0.05,
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
                  0.2,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.1
                ],
                [
                  1,
                  0.5
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
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
          "orbit": 0.55,
          "orbitVelocity": 0.15,
          "angleSpeed": 1.4,
          "color": "#fef2e9",
          "time": [
            0.05,
            0.6
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.3
              ],
              [
                1,
                0.05
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.3
          },
          "radialDelay": 0.3,
          "radialLife": 0.7,
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
              "radiusAbsolute": 0.07,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#fcc295"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "rotationScale": 1,
              "blend": "add",
              "color": "#fef2e9"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "halo-ray",
          "color": "#fef2e9",
          "blend": "add",
          "time": [
            0.45,
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
                  0.7
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
                  0.25
                ],
                [
                  0.3,
                  0.55
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
          "type": "ring",
          "color": "#fcc295",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "time": [
            0.5,
            0.9
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
                  0.2
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
                  5
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
          "blend": "normal",
          "time": [
            0.48,
            0.92
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.9
            ],
            [
              0.25,
              "#fef2e9",
              0.75
            ],
            [
              0.6,
              "#fcc295",
              0.35
            ],
            [
              1,
              "#5a3112",
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
                  0.12,
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
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "aspect": [
            0.42,
            2.2
          ],
          "offset": [
            0,
            -0.15
          ],
          "time": [
            0.45,
            1
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.25,
              "#fee5d2",
              0.8
            ],
            [
              0.6,
              "#fba96b",
              0.35
            ],
            [
              1,
              "#5a3112",
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
                  0.12,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.15
                ],
                [
                  0.3,
                  0.42
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
          "type": "glow",
          "color": "#fddcc2",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            -0.52
          ],
          "aspect": [
            1,
            0.45
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
                  0.2,
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
          "type": "shape",
          "shape": "orb",
          "color": "#fef2e9",
          "light": "#ffffff",
          "shadow": "#fcc295",
          "offset": [
            0,
            0.02
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
                  0
                ],
                [
                  0.12,
                  1
                ],
                [
                  0.82,
                  0.92
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
                  0.3,
                  0.07
                ],
                [
                  1,
                  0.06
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
          "count": 4,
          "emission": "circle",
          "radius": 0.15,
          "sizeRange": [
            0.06,
            0.09
          ],
          "speed": [
            0.25,
            0.55
          ],
          "direction": [
            3.9,
            5.5
          ],
          "gravity": [
            0,
            -0.35
          ],
          "drag": 1.2,
          "spin": [
            -1.2,
            1.2
          ],
          "lifeMs": [
            600,
            900
          ],
          "delayMs": [
            40,
            160
          ],
          "shape": "feather",
          "color": "#fddcc2",
          "light": "#ffffff",
          "shadow": "#a05a24",
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
            1.2,
            0.6
          ],
          "riseX": [
            0.08,
            0.92
          ],
          "riseY": [
            0.9,
            0.1
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.05,
          "sizeSize": 0.03,
          "sizePhase": -0.04,
          "color": "#fef2e9",
          "time": [
            0.58,
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
              "color": "#fcc295",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fef2e9",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "time": [
            0.55,
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
                  1
                ],
                [
                  0.25,
                  1.55
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
          "type": "glow",
          "color": "#ffc08a",
          "texture": "glow",
          "blend": "add",
          "radius": 1.0,
          "aspect": [
            0.765,
            2.065
          ],
          "offset": [
            0,
            -1.3875
          ],
          "time": [
            0.36,
            0.9
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.3825
                ],
                [
                  0.6,
                  0.30600000000000005
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
                  0.16,
                  1.0
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
          "color": "#ffc08a",
          "texture": "glow",
          "blend": "add",
          "radius": 1.0,
          "aspect": [
            0.3825,
            2.065
          ],
          "offset": [
            0,
            -1.3875
          ],
          "time": [
            0.36,
            0.9
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.68
                ],
                [
                  0.6,
                  0.544
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
                  0.16,
                  1.0
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
          "color": "#fff8f0",
          "texture": "glow",
          "blend": "add",
          "radius": 1.0,
          "aspect": [
            0.136,
            2.065
          ],
          "offset": [
            0,
            -1.3875
          ],
          "time": [
            0.36,
            0.9
          ],
          "clockSpace": "life",
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
                  0.6,
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
                  0.6
                ],
                [
                  0.16,
                  1.0
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
          "type": "card",
          "time": [
            0.0,
            0.62
          ],
          "clockSpace": "life",
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
            "brightness": {
              "keys": [
                [
                  0,
                  0.82
                ],
                [
                  0.7,
                  0.85
                ],
                [
                  0.85,
                  1.7
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
      "name": "stealth-veil",
      "label": "隠密：迷彩",
      "ms": 1500,
      "color": "#a9b8a0",
      "light": "#eef4ea",
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
        "atMs": 560,
        "cueMs": 560
      },
      "composites": [],
      "layers": [
        {
          "type": "card",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "batch": 0,
          "curves": {
            "opacity": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.22,
                  0.18
                ],
                [
                  0.62,
                  0.22
                ],
                [
                  0.86,
                  0.55
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
          "type": "fog",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "mode": "orbit-motes",
          "color": "#afb4ac",
          "texture": "smoke",
          "blend": "normal",
          "extent": [
            0.65,
            0.65
          ],
          "count": 112,
          "spinRate": 1.2,
          "moteOffset": 0,
          "radialRange": [
            0,
            1
          ],
          "radialPower": 0.5,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.22,
                  0.89
                ],
                [
                  0.65,
                  0.89
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "scale": 1.35,
          "extentSpace": "bounds",
          "batch": 0
        },
        {
          "type": "fog",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "mode": "orbit-motes",
          "color": "#c9cec6",
          "texture": "plasma",
          "blend": "add",
          "extent": [
            0.533,
            0.533
          ],
          "count": 38,
          "spinRate": -1.8,
          "moteOffset": 80,
          "radialRange": [
            0,
            1
          ],
          "radialPower": 0.5,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.22,
                  0.13
                ],
                [
                  0.65,
                  0.13
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "extentSpace": "bounds",
          "batch": 0
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#cbd6c5",
          "count": 62,
          "vortex": 1.3,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.44
                ],
                [
                  1,
                  0.44
                ]
              ],
              "interpolation": "linear"
            }
          },
          "time": [
            0.54,
            1
          ],
          "batch": 0,
          "radius": 0.8
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.1,
            0.9
          ],
          "clockSpace": "life",
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
                  0.4,
                  0.75
                ],
                [
                  1,
                  1
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
                  0.35
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
          "seedOffset": 81,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#d6e6cc",
          "width": 1.0,
          "widthSpace": "pixel",
          "noise": 0.12,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.2,
            0.85
          ],
          "clockSpace": "life",
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
                  0.6,
                  0.315
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
                  0.62
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.03
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#c4d6b8",
          "texture": "plasma",
          "blend": "add",
          "radius": 0.6,
          "time": [
            0.18,
            0.7
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.25
                ],
                [
                  0.6,
                  0.175
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
      "name": "guard-stance",
      "label": "防戦：構える盾",
      "ms": 1300,
      "color": "#c8b48a",
      "light": "#fff6e4",
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
        "atMs": 430,
        "cueMs": 430
      },
      "composites": [],
      "layers": [
        {
          "type": "flash",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "gradient": "radial",
          "geometry": "square",
          "gradientFrom": [
            0,
            0
          ],
          "gradientTo": [
            0,
            0
          ],
          "blend": "normal",
          "stops": [
            [
              0,
              "#ccb796",
              0
            ],
            [
              0.62,
              "#c6b7a0",
              0.1
            ],
            [
              0.9,
              "#d6c5ab",
              0.38
            ],
            [
              1,
              "#d6c5ab",
              0
            ]
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  0.035,
                  0.25
                ],
                [
                  0.255,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
            },
            "innerRadius": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.035,
                  0.05
                ],
                [
                  0.255,
                  0.2
                ],
                [
                  1,
                  0.2
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
            },
            "fillRadius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  0.035,
                  0.25
                ],
                [
                  0.255,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
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
                  0.4,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "batch": 0
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#cab491",
          "texture": "magic-circle",
          "directedRotation": true,
          "batch": 0,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.45
                ],
                [
                  0.4,
                  0.45
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.279
                ],
                [
                  0.035,
                  0.279
                ],
                [
                  0.255,
                  1.116
                ],
                [
                  1,
                  1.116
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
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
                  0.48
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "geometry": "grid",
          "gridExtent": 6,
          "gridSpacing": [
            0.15,
            0.173
          ],
          "gridOffset": [
            0,
            0.0866
          ],
          "cellRadius": 0.1,
          "cellSides": 6,
          "core": 0,
          "width": 0.5,
          "widthSpace": "pixel",
          "color": "#d3c0a3",
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.25
                ],
                [
                  0.035,
                  0.25
                ],
                [
                  0.255,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.16
                ],
                [
                  0.4,
                  0.16
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            }
          },
          "batch": 0
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#d8c7ae",
          "width": 0.03,
          "noise": 0.018,
          "strokeProfile": "halo",
          "arc": [
            -1,
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
                  0.08,
                  0.75
                ],
                [
                  0.4,
                  0.75
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.24
                ],
                [
                  0.035,
                  0.24
                ],
                [
                  0.255,
                  0.96
                ],
                [
                  1,
                  0.96
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
            }
          }
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#d4c2a7",
          "texture": "glow",
          "batch": 0,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.35
                ],
                [
                  0.4,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.175
                ],
                [
                  0.035,
                  0.175
                ],
                [
                  0.255,
                  0.7
                ],
                [
                  1,
                  0.7
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
            },
            "forwardOffset": {
              "keys": [
                [
                  0,
                  0.2
                ],
                [
                  0.035,
                  0.2
                ],
                [
                  0.255,
                  0.8
                ],
                [
                  1,
                  0.8
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
            }
          }
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#d5c3a8",
          "count": 28,
          "vortex": 1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.3
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.225
                ],
                [
                  0.035,
                  0.225
                ],
                [
                  0.255,
                  0.9
                ],
                [
                  1,
                  0.9
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "ease-out",
                "linear"
              ]
            }
          },
          "batch": 1
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#a59378",
          "texture": "plasma",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.88
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
                  0.33
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
                  2
                ]
              ],
              "interpolation": "linear"
            }
          },
          "variant": 1,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 2,
          "clockSpace": "life"
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#a59378",
          "texture": "glow",
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
              "exponent": 4
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.05
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "linear"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 2,
          "clockSpace": "life"
        },
        {
          "type": "ring",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#a59378",
          "width": 1,
          "noise": 0.18,
          "strokeProfile": "halo",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.72
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
                  0.168
                ],
                [
                  1,
                  0.9520000000000001
                ]
              ],
              "interpolation": "ease-out"
            },
            "width": {
              "keys": [
                [
                  0,
                  4.8
                ],
                [
                  1,
                  1.8
                ]
              ],
              "interpolation": "linear"
            }
          },
          "widthSpace": "pixel",
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 2,
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#a59378",
          "count": 64,
          "vortex": 0.9,
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
          },
          "radius": 1.12,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 2,
          "clockSpace": "life"
        },
        {
          "type": "card",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 2,
          "playbackDuration": {
            "maxMs": 140,
            "maxRatio": 1
          },
          "holdEnd": true,
          "endAtEffectEnd": false,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.62
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
            0.52,
            1.0
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
            0.52,
            1.0
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
            0.52,
            1.0
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
            0.52,
            1.0
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
            0.52,
            1.0
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
            0.52,
            1.0
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
            0.52,
            0.776
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
          "seedOffset": 92,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#b89a62",
          "width": 5.0,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.5,
          "geometry": "superellipse",
          "radius": 1,
          "time": [
            0.12,
            0.7
          ],
          "clockSpace": "life",
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
                  0.75
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "pad": {
              "keys": [
                [
                  0,
                  0.32
                ],
                [
                  0.32,
                  0.02
                ],
                [
                  1,
                  0.02
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
          "type": "shake",
          "time": [
            0.3,
            0.44
          ],
          "clockSpace": "life",
          "strength": [
            0.0,
            0.045
          ],
          "frequencyHz": [
            0.1,
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.3,
            0.6
          ],
          "clockSpace": "life",
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  0.78
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
          "seedOffset": 91,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#e8d6a8",
          "width": 2.6,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.3,
            0.75
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.65
                ],
                [
                  0.6,
                  0.45499999999999996
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
                  1.1
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "geometry": "superellipse",
          "pad": 0.02
        }
      ]
    },
    {
      "name": "alastor-brand",
      "label": "アラストル：呪印の付与 · C001",
      "ms": 1200,
      "color": "#ff6a3a",
      "light": "#fff0e6",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 540,
        "cueMs": 540
      },
      "composites": [],
      "sourceCode": "C001",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a0e05",
          "texture": "smoke",
          "radius": 0.7,
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
                  0.4,
                  0.95
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
                  -2.2
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
          "time": [
            0.02,
            0.4
          ],
          "stops": [
            [
              0,
              "#ffe1d8",
              0.9
            ],
            [
              0.3,
              "#ff6030",
              0.75
            ],
            [
              0.65,
              "#6b2009",
              0.35
            ],
            [
              1,
              "#1e0902",
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
                  1
                ],
                [
                  1,
                  0.3
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#ff784e",
          "light": "#ffbeaa",
          "shadow": "#6b2009",
          "blend": "normal",
          "radius": 0.6,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.4
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
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.06,
          "color": "#2a0e05",
          "segments": 22,
          "noise": 0.4,
          "core": 0,
          "time": [
            0.18,
            0.55
          ],
          "seedOffset": 0,
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
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.028,
          "color": "#ff784e",
          "segments": 22,
          "noise": 0.36,
          "core": 0.8,
          "time": [
            0.18,
            0.55
          ],
          "seedOffset": 4,
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
                  0.95
                ],
                [
                  0.7,
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
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.012,
          "color": "#ffe1d8",
          "segments": 22,
          "noise": 0.44,
          "core": 1,
          "time": [
            0.18,
            0.55
          ],
          "seedOffset": 9,
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
                  0.95
                ],
                [
                  0.7,
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#ff784e",
          "light": "#ffbeaa",
          "shadow": "#6b2009",
          "blend": "normal",
          "radius": 0.9,
          "time": [
            0.35,
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
                  -0.7
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.95
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.05,
          "color": "#ff784e",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
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
                  0.2,
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
          "type": "glow",
          "color": "#ffbeaa",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.45,
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 10,
          "phaseRate": [
            1.2,
            0.6
          ],
          "riseX": [
            0.06,
            0.94
          ],
          "riseY": [
            0.95,
            -0.15
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.06,
          "sizeSize": 0.04,
          "sizePhase": -0.05,
          "color": "#ff784e",
          "time": [
            0.45,
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
              "color": "#ff6030",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#ffe1d8",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.45,
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
                  1
                ],
                [
                  0.25,
                  1.45
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
          "type": "glow",
          "color": "#ff5a2a",
          "texture": "glow",
          "blend": "add",
          "radius": 0.5,
          "time": [
            0,
            0.45
          ],
          "clockSpace": "life",
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
                  0.42
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
          "seedOffset": 101,
          "type": "particles",
          "motion": "rise",
          "count": 10,
          "phaseRate": [
            1.3,
            0.7
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            0.9,
            -0.2
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.04,
          "sizeSize": 0.024,
          "sizePhase": -0.04,
          "color": "#ffb070",
          "time": [
            0.05,
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
              "texture": "plasma",
              "color": "#ffb070",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff0e0",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    },
    {
      "name": "erinyes-flame",
      "label": "エリニュス：復讐の火 · C002",
      "ms": 900,
      "color": "#ff3a7a",
      "light": "#ffe6f0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 470,
        "cueMs": 470
      },
      "composites": [],
      "sourceCode": "C002",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a0413",
          "texture": "smoke",
          "radius": 0.75,
          "time": [
            0,
            0.32
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.45,
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
          "type": "particles",
          "motion": "orbit",
          "count": 14,
          "countScale": "none",
          "orbit": 0.36,
          "orbitVelocity": 0.2,
          "angleSpeed": -1.8,
          "color": "#ff2a7f",
          "time": [
            0,
            0.26
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.6
              ],
              [
                1,
                0.08
              ]
            ],
            "interpolation": "power-in",
            "exponent": 1.4
          },
          "radialDelay": 0.35,
          "radialLife": 0.65,
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
              "radiusAbsolute": 0.17,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#ff1271"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.06,
              "aspect": [
                1.7,
                0.35
              ],
              "rotationScale": 1,
              "color": "#ff8bba",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ff066a",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0,
            0.24
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.55,
                  1
                ],
                [
                  1,
                  0.85
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
                  -3
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
          "time": [
            0.04,
            0.26
          ],
          "stops": [
            [
              0,
              "#ffb9d5",
              0.95
            ],
            [
              0.25,
              "#ff3083",
              0.85
            ],
            [
              0.55,
              "#df035b",
              0.55
            ],
            [
              0.85,
              "#590225",
              0.2
            ],
            [
              1,
              "#2a0212",
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
                  0.6,
                  1
                ],
                [
                  1,
                  0.4
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
                  0.85,
                  0.36
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
          "type": "shape",
          "shape": "flare",
          "color": "#ff67a4",
          "blend": "add",
          "time": [
            0.14,
            0.26
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
                  0.42
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
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2,
            0.52
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.78
                ],
                [
                  0.92,
                  0.78
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.725,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2,
            0.52
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.78
                ],
                [
                  0.92,
                  0.78
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.525,
          "texture": "plasma",
          "color": "#ff9ac3",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2055,
            0.5255
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.736
                ],
                [
                  0.92,
                  0.736
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.7069,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2055,
            0.5255
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.736
                ],
                [
                  0.92,
                  0.736
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.507,
          "texture": "plasma",
          "color": "#ff9ac3",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.211,
            0.531
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.692
                ],
                [
                  0.92,
                  0.692
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.6887,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.211,
            0.531
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.692
                ],
                [
                  0.92,
                  0.692
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4889,
          "texture": "plasma",
          "color": "#ff5e9e",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2165,
            0.5365
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.649
                ],
                [
                  0.92,
                  0.649
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.6706,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2165,
            0.5365
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.649
                ],
                [
                  0.92,
                  0.649
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4709,
          "texture": "plasma",
          "color": "#ff5e9e",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.222,
            0.542
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.605
                ],
                [
                  0.92,
                  0.605
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.6525,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.222,
            0.542
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.605
                ],
                [
                  0.92,
                  0.605
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4528,
          "texture": "plasma",
          "color": "#ff3083",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2275,
            0.5475
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.561
                ],
                [
                  0.92,
                  0.561
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.6344,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2275,
            0.5475
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.561
                ],
                [
                  0.92,
                  0.561
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4348,
          "texture": "plasma",
          "color": "#ff3083",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.233,
            0.553
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.517
                ],
                [
                  0.92,
                  0.517
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.6162,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.233,
            0.553
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.517
                ],
                [
                  0.92,
                  0.517
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4167,
          "texture": "plasma",
          "color": "#ff1573",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2385,
            0.5585
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.474
                ],
                [
                  0.92,
                  0.474
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.5981,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2385,
            0.5585
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.474
                ],
                [
                  0.92,
                  0.474
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.3987,
          "texture": "plasma",
          "color": "#ff1573",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.244,
            0.564
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.43
                ],
                [
                  0.92,
                  0.43
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.58,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.244,
            0.564
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.43
                ],
                [
                  0.92,
                  0.43
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.3806,
          "texture": "plasma",
          "color": "#ff0a6c",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2495,
            0.5695
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.386
                ],
                [
                  0.92,
                  0.386
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.5619,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2495,
            0.5695
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.386
                ],
                [
                  0.92,
                  0.386
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.3626,
          "texture": "plasma",
          "color": "#ff066a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.255,
            0.575
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.342
                ],
                [
                  0.92,
                  0.342
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.5437,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.255,
            0.575
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.342
                ],
                [
                  0.92,
                  0.342
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.3445,
          "texture": "plasma",
          "color": "#ff066a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2605,
            0.5805
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.299
                ],
                [
                  0.92,
                  0.299
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.5256,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2605,
            0.5805
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.299
                ],
                [
                  0.92,
                  0.299
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.3265,
          "texture": "plasma",
          "color": "#df035b",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.266,
            0.586
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.255
                ],
                [
                  0.92,
                  0.255
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.5075,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.266,
            0.586
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.255
                ],
                [
                  0.92,
                  0.255
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.3084,
          "texture": "plasma",
          "color": "#df035b",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2715,
            0.5915
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.211
                ],
                [
                  0.92,
                  0.211
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4894,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2715,
            0.5915
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.211
                ],
                [
                  0.92,
                  0.211
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2904,
          "texture": "plasma",
          "color": "#bf014d",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.277,
            0.597
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.167
                ],
                [
                  0.92,
                  0.167
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4713,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.277,
            0.597
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.167
                ],
                [
                  0.92,
                  0.167
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2723,
          "texture": "plasma",
          "color": "#bf014d",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2825,
            0.6025
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.124
                ],
                [
                  0.92,
                  0.124
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.4531,
          "texture": "smoke",
          "color": "#2a0413"
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2825,
            0.6025
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
              "exponent": 1.5
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.124
                ],
                [
                  0.92,
                  0.124
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2543,
          "texture": "plasma",
          "color": "#99013e",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.28,
          "time": [
            0.2,
            0.52
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
              "exponent": 1.5
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
                  0.92,
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
          "blend": "normal",
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.25,
              "#ff9ac3",
              0.98
            ],
            [
              0.5,
              "#ff217a",
              0.85
            ],
            [
              0.8,
              "#c70050",
              0.4
            ],
            [
              1,
              "#3a0118",
              0
            ]
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#ff3a89",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.52,
            0.86
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.5
                ],
                [
                  1,
                  1.25
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
          "color": "#ff066a",
          "texture": "plasma",
          "blend": "add",
          "variant": 2,
          "time": [
            0.52,
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
                  0.4,
                  0.9
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
                  0.35
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
                  1.6
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
          "color": "#ff1271",
          "texture": "plasma",
          "blend": "add",
          "variant": 0,
          "time": [
            0.54,
            0.9
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
              "exponent": 1.3
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
          "type": "glow",
          "color": "#2a0413",
          "texture": "smoke",
          "time": [
            0.56,
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
                  0.25,
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
                  0.45
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
                  -0.9
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
          "blend": "normal",
          "time": [
            0.52,
            0.86
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.18,
              "#ff9ac3",
              0.98
            ],
            [
              0.42,
              "#ff1b76",
              0.9
            ],
            [
              0.7,
              "#d10255",
              0.55
            ],
            [
              1,
              "#3a0118",
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
                  0.45,
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
                  0.25
                ],
                [
                  1,
                  0.95
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
          "color": "#ff5e9e",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.18,
          "strokeProfile": "halo",
          "time": [
            0.52,
            0.84
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
                  0.15
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
                  7
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 34,
          "sizeRange": [
            0.05,
            0.1
          ],
          "speed": [
            0.8,
            1.6
          ],
          "drag": 2,
          "gravity": [
            0,
            0.9
          ],
          "lifeMs": [
            380,
            700
          ],
          "delayMs": [
            0,
            60
          ],
          "texture": "plasma",
          "color": "#ff3083",
          "emissionArc": [
            0,
            6.283
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
                  1.6
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
            0.52,
            0.68
          ],
          "holdEnd": true,
          "strength": [
            0.035,
            0.018
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
      "name": "echidna-wave",
      "label": "エキドナ：毒蛇の波 · C004",
      "ms": 1200,
      "color": "#7fe08a",
      "light": "#f0fff0",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "opponents",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 0,
        "cueMs": 0
      },
      "composites": [],
      "sourceCode": "C004",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#1a3a1a",
          "texture": "smoke",
          "blend": "normal",
          "radius": 0.8,
          "time": [
            0,
            0.5
          ],
          "clockSpace": "life",
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
          "color": "#9cff9a",
          "texture": "glow",
          "blend": "add",
          "radius": 0.6,
          "time": [
            0,
            0.35
          ],
          "clockSpace": "life",
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
                  0.6,
                  0.5599999999999999
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
          "color": "#42e458",
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
          "color": "#f3dafd",
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
          "color": "#7eff8f",
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
          "color": "#f3dafd",
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
          "color": "#7eff8f",
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
          "color": "#f3dafd",
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
          "color": "#7eff8f",
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
          "color": "#c463ee",
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
          "color": "#5bf670",
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
          "color": "#a3edad",
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
              "color": "#bde8c3",
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 110,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#b8ffb0",
          "width": 3.2,
          "widthSpace": "pixel",
          "noise": 0.06,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0,
            0.6
          ],
          "clockSpace": "life",
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
                  0.6,
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
                  0.3
                ],
                [
                  1,
                  3.6
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 111,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#d6a8ff",
          "width": 2.4,
          "widthSpace": "pixel",
          "noise": 0.06,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.1,
            0.7
          ],
          "clockSpace": "life",
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
                  0.6,
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
                  0.3
                ],
                [
                  1,
                  3.6
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 112,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#8cffa0",
          "width": 1.8,
          "widthSpace": "pixel",
          "noise": 0.06,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.2,
            0.8
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.12,
                  0.7
                ],
                [
                  0.6,
                  0.48999999999999994
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
                  3.6
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#a8ff90",
          "texture": "glow",
          "blend": "add",
          "radius": 0.55,
          "time": [
            0.3,
            0.75
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.7
                ],
                [
                  0.6,
                  0.48999999999999994
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
          "type": "glow",
          "color": "#c890ff",
          "texture": "plasma",
          "blend": "add",
          "radius": 0.4,
          "time": [
            0.34,
            0.8
          ],
          "clockSpace": "life",
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
        }
      ]
    },
    {
      "name": "atlas-burden",
      "label": "アトラス：重荷の分配 · C005",
      "ms": 1000,
      "color": "#e0b060",
      "light": "#fff4dc",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 520,
        "cueMs": 520
      },
      "composites": [],
      "sourceCode": "C005",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#5a3a14",
          "texture": "smoke",
          "blend": "normal",
          "radius": 0.7,
          "time": [
            0,
            0.45
          ],
          "clockSpace": "life",
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
          "color": "#21190c",
          "texture": "smoke",
          "radius": 0.7,
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
                  0.4,
                  0.95
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
                  -2.2
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
          "time": [
            0.02,
            0.4
          ],
          "stops": [
            [
              0,
              "#f9eede",
              0.9
            ],
            [
              0.3,
              "#de9f42",
              0.75
            ],
            [
              0.65,
              "#533d1b",
              0.35
            ],
            [
              1,
              "#171107",
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
                  1
                ],
                [
                  1,
                  0.3
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#e2ac5a",
          "light": "#efd1a3",
          "shadow": "#533d1b",
          "blend": "normal",
          "radius": 0.6,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.4
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
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.06,
          "color": "#21190c",
          "segments": 22,
          "noise": 0.4,
          "core": 0,
          "time": [
            0.18,
            0.55
          ],
          "seedOffset": 0,
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
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.028,
          "color": "#e2ac5a",
          "segments": 22,
          "noise": 0.36,
          "core": 0.8,
          "time": [
            0.18,
            0.55
          ],
          "seedOffset": 4,
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
                  0.95
                ],
                [
                  0.7,
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
          "type": "beam",
          "anchor": "path",
          "basis": "unit",
          "geometry": "filament",
          "width": 0.012,
          "color": "#f9eede",
          "segments": 22,
          "noise": 0.44,
          "core": 1,
          "time": [
            0.18,
            0.55
          ],
          "seedOffset": 9,
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
                  0.95
                ],
                [
                  0.7,
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#e2ac5a",
          "light": "#efd1a3",
          "shadow": "#533d1b",
          "blend": "normal",
          "radius": 0.9,
          "time": [
            0.35,
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
                  -0.7
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.95
                ],
                [
                  1,
                  0.45
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.05,
          "color": "#e2ac5a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
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
                  0.2,
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
          "type": "glow",
          "color": "#efd1a3",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.45,
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 10,
          "phaseRate": [
            1.2,
            0.6
          ],
          "riseX": [
            0.06,
            0.94
          ],
          "riseY": [
            0.95,
            -0.15
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.06,
          "sizeSize": 0.04,
          "sizePhase": -0.05,
          "color": "#e2ac5a",
          "time": [
            0.45,
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
              "color": "#de9f42",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#f9eede",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.45,
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
                  1
                ],
                [
                  0.25,
                  1.45
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
      "name": "thunderbird-charge",
      "label": "サンダーバード：雷の充填 · C052",
      "ms": 1300,
      "color": "#ffe060",
      "light": "#fffbe0",
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
      "composites": [],
      "sourceCode": "C052",
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a2614",
          "texture": "smoke",
          "radius": 2.6,
          "offset": [
            0,
            -1.5
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
                  0.18,
                  0.95
                ],
                [
                  0.8,
                  0.9
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
          "type": "glow",
          "color": "#504926",
          "texture": "smoke",
          "radius": 1.9,
          "offset": [
            0.6,
            -1.7
          ],
          "variant": 1,
          "time": [
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
                  0.2,
                  0.85
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
          "type": "glow",
          "color": "#ffea80",
          "texture": "plasma",
          "blend": "add",
          "radius": 1.6,
          "offset": [
            0,
            -1.6
          ],
          "variant": 2,
          "time": [
            0.1,
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
                  0.22,
                  0.25
                ],
                [
                  0.3,
                  0.9
                ],
                [
                  0.4,
                  0.2
                ],
                [
                  0.5,
                  0.85
                ],
                [
                  0.6,
                  0.15
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
                  -0.8
                ]
              ],
              "interpolation": "linear"
            }
          }
        },
        {
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "geometry": "filament",
          "points": [
            [
              -0.04999999999999999,
              -6.6
            ],
            [
              0,
              0
            ]
          ],
          "noise": 1.1,
          "segments": 13,
          "filamentClockRate": 0,
          "strokeProfile": "halo",
          "width": 0.07,
          "color": "#fff1ac",
          "core": 1,
          "time": [
            0.28,
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
                  0.03,
                  1
                ],
                [
                  0.1,
                  0.3
                ],
                [
                  0.16,
                  1
                ],
                [
                  0.32,
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
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "geometry": "filament",
          "points": [
            [
              0.2,
              -6.6
            ],
            [
              0,
              0
            ]
          ],
          "noise": 0.9,
          "segments": 11,
          "filamentClockRate": 0,
          "strokeProfile": "halo",
          "width": 0.035,
          "color": "#fff7d0",
          "core": 0.7,
          "time": [
            0.28500000000000003,
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
                  0.04,
                  0.75
                ],
                [
                  0.12,
                  0.2
                ],
                [
                  0.18,
                  0.675
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
          "geometry": "filament",
          "points": [
            [
              0.45,
              -6.6
            ],
            [
              0,
              0
            ]
          ],
          "noise": 1.3,
          "segments": 9,
          "filamentClockRate": 0,
          "strokeProfile": "halo",
          "width": 0.025,
          "color": "#fff4c0",
          "core": 0.7,
          "time": [
            0.28500000000000003,
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
                  0.04,
                  0.55
                ],
                [
                  0.12,
                  0.2
                ],
                [
                  0.18,
                  0.49500000000000005
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
          "points": [
            [
              0,
              0
            ],
            [
              -0.221,
              -0.088
            ],
            [
              -0.385,
              -0.167
            ],
            [
              -0.397,
              -0.175
            ],
            [
              -0.525,
              -0.235
            ],
            [
              -0.553,
              -0.272
            ]
          ],
          "width": 0.018,
          "color": "#fffcec",
          "blend": "add",
          "core": 1,
          "time": [
            0.28,
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
                  1
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  0.55,
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
          "anchor": "source",
          "basis": "unit",
          "points": [
            [
              0,
              0
            ],
            [
              0.204,
              -0.12
            ],
            [
              0.411,
              -0.165
            ],
            [
              0.454,
              -0.188
            ],
            [
              0.513,
              -0.212
            ],
            [
              0.574,
              -0.254
            ]
          ],
          "width": 0.018,
          "color": "#fffcec",
          "blend": "add",
          "core": 1,
          "time": [
            0.28,
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
                  1
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  0.55,
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
          "anchor": "source",
          "basis": "unit",
          "points": [
            [
              0,
              0
            ],
            [
              0.1,
              0.068
            ],
            [
              0.218,
              0.314
            ],
            [
              0.367,
              0.362
            ],
            [
              0.369,
              0.459
            ],
            [
              0.466,
              0.531
            ]
          ],
          "width": 0.018,
          "color": "#fffcec",
          "blend": "add",
          "core": 1,
          "time": [
            0.28,
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
                  1
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  0.55,
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
          "blend": "normal",
          "time": [
            0.28,
            0.52
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.18,
              "#fffcec",
              0.95
            ],
            [
              0.45,
              "#ffe97c",
              0.55
            ],
            [
              1,
              "#605520",
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
                  0.03,
                  1
                ],
                [
                  0.1,
                  0.5
                ],
                [
                  0.16,
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
                  0.3
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
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 18,
          "sizeRange": [
            0.02,
            0.045
          ],
          "speed": [
            1,
            2
          ],
          "drag": 2.6,
          "gravity": [
            0,
            1
          ],
          "lifeMs": [
            160,
            360
          ],
          "delayMs": [
            0,
            30
          ],
          "texture": "glow",
          "color": "#fffcec",
          "emissionArc": [
            3.3,
            6.1
          ],
          "time": [
            0.28,
            0.52
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
          "type": "glow",
          "color": "#fff4c0",
          "texture": "glow",
          "blend": "add",
          "radius": 2.6,
          "time": [
            0.28,
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
                  0.5
                ],
                [
                  0.35,
                  0.15
                ],
                [
                  0.5,
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
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "geometry": "filament",
          "points": [
            [
              -0.5,
              -6.6
            ],
            [
              0,
              0
            ]
          ],
          "noise": 1.1,
          "segments": 13,
          "filamentClockRate": 0,
          "strokeProfile": "halo",
          "width": 0.07,
          "color": "#fff1ac",
          "core": 1,
          "time": [
            0.5,
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
                  0.03,
                  1
                ],
                [
                  0.1,
                  0.3
                ],
                [
                  0.16,
                  1
                ],
                [
                  0.32,
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
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "geometry": "filament",
          "points": [
            [
              -0.25,
              -6.6
            ],
            [
              0,
              0
            ]
          ],
          "noise": 0.9,
          "segments": 11,
          "filamentClockRate": 0,
          "strokeProfile": "halo",
          "width": 0.035,
          "color": "#fff7d0",
          "core": 0.7,
          "time": [
            0.505,
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
                  0.04,
                  0.75
                ],
                [
                  0.12,
                  0.2
                ],
                [
                  0.18,
                  0.675
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
          "geometry": "filament",
          "points": [
            [
              0,
              -6.6
            ],
            [
              0,
              0
            ]
          ],
          "noise": 1.3,
          "segments": 9,
          "filamentClockRate": 0,
          "strokeProfile": "halo",
          "width": 0.025,
          "color": "#fff4c0",
          "core": 0.7,
          "time": [
            0.505,
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
                  0.04,
                  0.55
                ],
                [
                  0.12,
                  0.2
                ],
                [
                  0.18,
                  0.49500000000000005
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
          "points": [
            [
              0,
              0
            ],
            [
              -0.082,
              -0.075
            ],
            [
              -0.259,
              -0.155
            ],
            [
              -0.466,
              -0.21
            ],
            [
              -0.489,
              -0.248
            ],
            [
              -0.553,
              -0.272
            ]
          ],
          "width": 0.018,
          "color": "#fffcec",
          "blend": "add",
          "core": 1,
          "time": [
            0.5,
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
                  1
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  0.55,
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
          "anchor": "source",
          "basis": "unit",
          "points": [
            [
              0,
              0
            ],
            [
              0.12,
              -0.026
            ],
            [
              0.214,
              -0.079
            ],
            [
              0.303,
              -0.103
            ],
            [
              0.552,
              -0.225
            ],
            [
              0.574,
              -0.254
            ]
          ],
          "width": 0.018,
          "color": "#fffcec",
          "blend": "add",
          "core": 1,
          "time": [
            0.5,
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
                  1
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  0.55,
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
          "anchor": "source",
          "basis": "unit",
          "points": [
            [
              0,
              0
            ],
            [
              -0.061,
              0.025
            ],
            [
              -0.037,
              0.06
            ],
            [
              0.016,
              0.11
            ],
            [
              0.11,
              0.185
            ],
            [
              0.466,
              0.531
            ]
          ],
          "width": 0.018,
          "color": "#fffcec",
          "blend": "add",
          "core": 1,
          "time": [
            0.5,
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
                  1
                ],
                [
                  0.4,
                  0.3
                ],
                [
                  0.55,
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
          "blend": "normal",
          "time": [
            0.5,
            0.76
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.18,
              "#fffcec",
              0.95
            ],
            [
              0.45,
              "#ffe97c",
              0.55
            ],
            [
              1,
              "#605520",
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
                  0.03,
                  1
                ],
                [
                  0.1,
                  0.5
                ],
                [
                  0.16,
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
                  0.3
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
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 18,
          "sizeRange": [
            0.02,
            0.045
          ],
          "speed": [
            1,
            2
          ],
          "drag": 2.6,
          "gravity": [
            0,
            1
          ],
          "lifeMs": [
            160,
            360
          ],
          "delayMs": [
            0,
            30
          ],
          "texture": "glow",
          "color": "#fffcec",
          "emissionArc": [
            3.3,
            6.1
          ],
          "time": [
            0.5,
            0.76
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
          "type": "glow",
          "color": "#fff4c0",
          "texture": "glow",
          "blend": "add",
          "radius": 2.6,
          "time": [
            0.5,
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
                  0.5
                ],
                [
                  0.35,
                  0.15
                ],
                [
                  0.5,
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
          "time": [
            0.28,
            0.8
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
                  0.04,
                  2
                ],
                [
                  0.35,
                  1.1
                ],
                [
                  0.42,
                  1.9
                ],
                [
                  1,
                  1
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
                  0.04,
                  0.35
                ],
                [
                  0.35,
                  0.9
                ],
                [
                  0.42,
                  0.45
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
          "type": "shake",
          "time": [
            0.28,
            0.78
          ],
          "holdEnd": true,
          "strength": [
            0.035,
            0.035
          ],
          "frequencyHz": [
            26,
            22
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.45,
                  0.3
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#fff6b0",
          "texture": "glow",
          "blend": "add",
          "radius": 0.6,
          "time": [
            0.32,
            0.7
          ],
          "clockSpace": "life",
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
                  0.6,
                  0.5599999999999999
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
            0.32,
            0.5
          ],
          "clockSpace": "life",
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
        }
      ]
    },
    {
      "name": "kele-blood-nova",
      "label": "ケール：血の衝撃 · C105",
      "ms": 1500,
      "color": "#e02040",
      "light": "#ffe0e4",
      "playback": {
        "maxMs": 30000,
        "speedMin": 0.01,
        "speedMax": 100,
        "baseSize": 1
      },
      "defaultTargets": "opponents",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "cueMs": 700,
        "atMs": 700,
        "distance": {
          "range": "viewport",
          "curve": {
            "keys": [
              [
                0.035,
                0
              ],
              [
                0.325,
                1
              ]
            ],
            "interpolation": "smooth"
          },
          "inverseIterations": 16
        }
      },
      "composites": [],
      "sourceCode": "C105",
      "layers": [
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
            0.0225,
            0.405
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
            0.18,
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
            0.0225,
            0.36
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
          "anchor": "source",
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
            0.18,
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
            0.18,
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
            0.234,
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
            0.144,
            0.2925
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
            0.045,
            0.3825
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
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f7a7ad",
          "texture": "magic-circle",
          "directedRotation": true,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.5,
                  0.45
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "sine-out",
                "sine-in"
              ]
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.2728
                ],
                [
                  1,
                  0.434
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
              "interpolation": "linear"
            }
          },
          "time": [
            0.3,
            0.342
          ],
          "batch": 0,
          "clockSpace": "life"
        },
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f7a7ad",
          "texture": "plasma",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.5,
                  0.65
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "sine-out",
                "sine-in"
              ]
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.1
                ],
                [
                  1,
                  0.3
                ]
              ],
              "interpolation": "linear"
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
          },
          "variant": 0,
          "time": [
            0.3,
            0.342
          ],
          "batch": 0,
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#f7a7ad",
          "count": 42,
          "vortex": -1,
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.5,
                  0.65
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "sine-out",
                "sine-in"
              ]
            },
            "progress": {
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
          },
          "afterglow": false,
          "radius": 0.6,
          "time": [
            0.3,
            0.342
          ],
          "batch": 0,
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "fan-volume",
          "count": 260,
          "reverse": true,
          "radiusSpace": "reach",
          "materials": [
            {
              "texture": "plasma",
              "color": "#f7a7ad",
              "alphaScale": 0.11200000000000002,
              "alphaSize": 0.28,
              "radiusScale": 0.95,
              "rotationSpeed": 3
            },
            {
              "texture": "glow",
              "color": "#f7a7ad",
              "every": 3,
              "radius": 0.015,
              "radiusSize": 0.026,
              "radiusScale": 3.2,
              "alphaScale": 0.3,
              "alphaSize": 0.45,
              "rotationScale": 0,
              "variant": 0,
              "angularFade": false
            }
          ],
          "afterglowEvery": 3,
          "afterglowFixedRadius": 0.015,
          "sizeSize": 0.026,
          "afterglowRadius": 2.2,
          "afterglowAlpha": 0.25,
          "afterglowColor": "#f7a7ad",
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.035,
                  0
                ],
                [
                  0.325,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "smooth",
                "linear"
              ],
              "domain": "effect"
            },
            "alpha": {
              "keys": [
                [
                  0,
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
            }
          },
          "time": [
            0.3245,
            1.0
          ],
          "clockOffset": 0.3245,
          "batch": 1
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "arc-grid",
          "gridRows": 3,
          "spacing": 0.18,
          "stepsMin": 24,
          "stepsMax": 160,
          "rowOffset": 0.16,
          "radialFloorPx": 1,
          "noiseType": "fractal",
          "noiseRows": [
            1,
            0
          ],
          "noiseSeedRow": 1,
          "radialNoise": 0.02,
          "radiusSpace": "reach",
          "angularExponent": 0.9,
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.035,
                  0
                ],
                [
                  0.325,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "smooth",
                "linear"
              ],
              "domain": "effect"
            },
            "alpha": {
              "keys": [
                [
                  0,
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
            }
          },
          "materials": [
            {
              "texture": "glow",
              "color": "#f7a7ad",
              "rowRadii": [
                0.2,
                0.14,
                0.14
              ],
              "rowAlpha": [
                0.34,
                0.14,
                0.14
              ],
              "rotationScale": 0,
              "variant": 0
            }
          ],
          "time": [
            0.3245,
            1.0
          ],
          "clockOffset": 0.3245,
          "batch": 1
        },
        {
          "type": "particles",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "arc-grid",
          "count": 58,
          "noiseType": "fractal",
          "noiseRows": [
            0,
            0
          ],
          "radialNoise": 0.023,
          "size": 0.12,
          "sizeNoise": 0.2,
          "radiusSpace": "reach",
          "angularExponent": 0.9,
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.035,
                  0
                ],
                [
                  0.325,
                  1
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "linear",
                "smooth",
                "linear"
              ],
              "domain": "effect"
            },
            "alpha": {
              "keys": [
                [
                  0,
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
            }
          },
          "materials": [
            {
              "texture": "plasma",
              "color": "#f7a7ad",
              "alphaScale": 0.26,
              "rotationSpeed": 5
            }
          ],
          "time": [
            0.3245,
            1.0
          ],
          "clockOffset": 0.3245,
          "batch": 1
        },
        {
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f7a7ad",
          "texture": "plasma",
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
                  0.216
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
                  2
                ]
              ],
              "interpolation": "linear"
            }
          },
          "variant": 1,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 2,
          "clockSpace": "life"
        },
        {
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f7a7ad",
          "texture": "glow",
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
              "exponent": 4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.648
                ],
                [
                  1,
                  0.36
                ]
              ],
              "interpolation": "linear"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 2,
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "radial-drag",
          "color": "#f7a7ad",
          "count": 40,
          "vortex": 0.6,
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
          },
          "radius": 0.72,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "batch": 2,
          "clockSpace": "life"
        },
        {
          "type": "card",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 2,
          "playbackDuration": {
            "maxMs": 140,
            "maxRatio": 1
          },
          "holdEnd": true,
          "endAtEffectEnd": false,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "brightness": {
              "keys": [
                [
                  0,
                  1.62
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
          "type": "shake",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 2,
          "playbackDuration": {
            "maxMs": 140,
            "maxRatio": 1
          },
          "holdEnd": true,
          "strength": [
            0.024,
            0
          ],
          "frequencyHz": [
            17.507043740108486,
            0.1
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
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff6a7a",
          "texture": "glow",
          "blend": "add",
          "radius": 0.5,
          "time": [
            0.4,
            0.8
          ],
          "clockSpace": "life",
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
                  0.42
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
          "type": "glow",
          "color": "#fff0f2",
          "texture": "glow",
          "blend": "add",
          "radius": 0.3,
          "time": [
            0.42,
            0.62
          ],
          "clockSpace": "life",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.18,
                  0.7
                ],
                [
                  0.6,
                  0.48999999999999994
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
    }
  ]
});
