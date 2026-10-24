/* 2026-10-25 利用者指定の新しい演出（Claude 直接。利用者の確認待ち＝LAB で☆）。
 * ヘルナイトの剣戟と血の吸収・ユミルの神秘のオーラ・グリマルキンの煌めきと光の柱・報酬への祝福（ファミリア／ゴーレム）・復活の指輪・隠密・防戦。
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
    }
  ]
});
