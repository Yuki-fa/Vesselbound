/* 2026-10-23 VFX の全検査で新しく作った演出（Claude 直接。利用者の確認待ち＝LAB で☆）。
 * 残響の魔導師（EN013）・凍てつく亡霊（EN031）・起動の変身（C084／変身の巻物 I002）・インキュバスの起動（C109）・ヘルナイトの起動（C116）。
 * 土台：フロスト・スプライト／サイレンの波／常時の強化（いずれも FIX 済み）の層の組み方。生成元：scratchpad の gen_vfx_1023.py。 */
VbFxDefs.register({
  "schemaVersion": 2,
  "effects": [
    {
      "name": "frost-retaliate",
      "label": "凍てつく亡霊の反撃 · EN031",
      "ms": 950,
      "color": "#b9b0ff",
      "light": "#f3f0ff",
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
        "atMs": 590,
        "cueMs": 590
      },
      "composites": [
        {
          "batch": 3,
          "mode": "radial",
          "radius": 1.1,
          "blend": "normal"
        }
      ],
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#6f63b8",
          "texture": "smoke",
          "blend": "normal",
          "radius": 0.7,
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
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f6f1ff",
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
            0,
            0.09
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
          "color": "#f6f1ff",
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
            0,
            0.09
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
          "color": "#f6f1ff",
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
            0,
            0.09
          ],
          "batch": 0,
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "path",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "path-motes",
          "count": 10,
          "indexStart": 1,
          "reverse": true,
          "moteOffset": 300,
          "lagIndex": 0.02,
          "size": 0.12,
          "sizeIndex": 0.02,
          "alpha": 0.2,
          "opacityIndex": -0.018181818181818184,
          "orient": "mote",
          "orientationSpeed": 2,
          "color": "#d8c5f7",
          "materials": [
            {
              "texture": "smoke",
              "aspect": [
                1,
                1.3
              ]
            },
            {
              "texture": "glow",
              "color": "#ffffff",
              "every": 2,
              "radius": 0.045,
              "alphaScale": 3.5,
              "moteShift": [
                0.3,
                0.3
              ],
              "rotationScale": 0,
              "variant": 0
            }
          ],
          "location": "path",
          "time": [
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09,
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
          "color": "#a980f0",
          "texture": "glow",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.28
                ],
                [
                  1,
                  0.28
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
          "radius": 0.5,
          "location": "path",
          "time": [
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09
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
              "shape": "faceted-needle-long",
              "blend": "normal"
            }
          ],
          "afterglowEvery": 1,
          "afterglowFixedRadius": 0.05,
          "afterglowAlpha": 0.3157894736842105,
          "afterglowColor": "#c9abfd",
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
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09
        },
        {
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f1eafe",
          "texture": "glow",
          "batch": 2,
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
              "exponent": 4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0.6
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
          "clockSpace": "life",
          "pass": 2
        },
        {
          "type": "particles",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "orbit",
          "phaseDistribution": "uniform",
          "count": 16,
          "countScale": "none",
          "size": 0.28,
          "color": "#ede5fc",
          "materials": [
            {
              "texture": "smoke",
              "aspect": [
                1,
                1.4
              ],
              "blend": "normal"
            }
          ],
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.45
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "power-out",
              "exponent": 1.3
            },
            "orbit": {
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
            }
          },
          "batch": 3,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockSpace": "life",
          "pass": 2
        },
        {
          "type": "beam",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "geometry": "branch",
          "copies": 6,
          "rotation": 0.3,
          "radius": 0.55,
          "branchCount": 2,
          "branchSpacing": 0.33,
          "branchAngle": 0.7,
          "branchLength": 0.28,
          "branchWidth": 0.6666666666666667,
          "branchAlpha": 0.888888888888889,
          "width": 0.018,
          "color": "#c9abfd",
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
                  0
                ],
                [
                  0.35,
                  0.55
                ],
                [
                  1,
                  0.55
                ]
              ],
              "interpolation": "linear",
              "segments": [
                "ease-out",
                "linear"
              ]
            }
          },
          "batch": 4,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockSpace": "life",
          "pass": 2
        },
        {
          "type": "particles",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "orbit",
          "count": 12,
          "countScale": "none",
          "moteOffset": 320,
          "size": 0.035,
          "sizeSize": 0.045,
          "particleSpin": 3,
          "materials": [
            {
              "shape": "faceted-needle-short",
              "blend": "normal"
            }
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
              "exponent": 1.3
            },
            "orbit": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.15
                ]
              ],
              "interpolation": "ease-out"
            },
            "orbitVelocity": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  0.85
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "batch": 4,
          "at": "impact",
          "playbackDuration": {
            "maxMs": 550,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockSpace": "life",
          "pass": 2
        },
        {
          "type": "card",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 5,
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
          },
          "pass": 2
        },
        {
          "type": "shake",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 5,
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
          },
          "pass": 2
        }
      ]
    },
    {
      "name": "echo-bolt",
      "label": "残響の魔導弾 · EN013",
      "ms": 1050,
      "color": "#c58cff",
      "light": "#f6ecff",
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
        "atMs": 640,
        "cueMs": 640
      },
      "composites": [],
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#7a3fd0",
          "texture": "glow",
          "blend": "add",
          "radius": 0.55,
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
                  0.75
                ],
                [
                  0.6,
                  0.5249999999999999
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
          "color": "#e6d2ff",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.3,
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
            }
          },
          "directedRotation": true
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 1,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#d9bcff",
          "width": 1.5,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0,
            0.42
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
          "seedOffset": 2,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#a774f0",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.08,
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
                  0.75
                ],
                [
                  0.6,
                  0.5249999999999999
                ],
                [
                  1,
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
                  0.78
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
          "color": "#d9bcff",
          "width": 0.9,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.16,
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
                  0.12,
                  0.5499999999999999
                ],
                [
                  0.6,
                  0.38499999999999995
                ],
                [
                  1,
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
                  0.94
                ]
              ],
              "interpolation": "ease-out"
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
          "count": 10,
          "indexStart": 1,
          "reverse": true,
          "moteOffset": 300,
          "lagIndex": 0.02,
          "size": 0.12,
          "sizeIndex": 0.02,
          "alpha": 0.2,
          "opacityIndex": -0.018181818181818184,
          "orient": "mote",
          "orientationSpeed": 2,
          "color": "#f0dbf9",
          "materials": [
            {
              "texture": "glow",
              "blend": "add"
            }
          ],
          "location": "path",
          "time": [
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09,
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
          "color": "#d494f0",
          "texture": "glow",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.28
                ],
                [
                  1,
                  0.28
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
          "radius": 0.5,
          "location": "path",
          "time": [
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09
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
          "afterglowColor": "#ebc2fc",
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
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09
        },
        {
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f8eafe",
          "texture": "glow",
          "batch": 2,
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
              "exponent": 4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0.6
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
          "clockSpace": "life",
          "pass": 2
        },
        {
          "type": "card",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 5,
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
          },
          "pass": 2
        },
        {
          "type": "shake",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 5,
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
          },
          "pass": 2
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#a45cff",
          "texture": "glow",
          "blend": "add",
          "radius": 0.6,
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
                  0.85
                ],
                [
                  0.6,
                  0.595
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 480,
            "maxRatio": 1
          },
          "endAtEffectEnd": true
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 10,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#f4e6ff",
          "width": 2.4,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  1,
                  0.55
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 520,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockOffset": 0
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 11,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#c290ff",
          "width": 1.9,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
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
                  0.12
                ],
                [
                  1,
                  0.75
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 520,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockOffset": 0.08
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 12,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#f4e6ff",
          "width": 1.4,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
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
                  0.12
                ],
                [
                  1,
                  0.95
                ]
              ],
              "interpolation": "ease-out"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 520,
            "maxRatio": 1
          },
          "endAtEffectEnd": true,
          "clockOffset": 0.16
        }
      ]
    },
    {
      "name": "activation-transform",
      "label": "起動：変身 · C084/I002",
      "sourceCode": "C084",
      "ms": 1100,
      "color": "#7ff0c4",
      "light": "#effff8",
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
        "cueMs": 600
      },
      "layers": [
        {
          "type": "glow",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#f2fefa",
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
            0,
            0.55
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
          "color": "#f2fefa",
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
            0,
            0.55
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
          "color": "#f2fefa",
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
            0,
            0.55
          ],
          "batch": 0,
          "clockSpace": "life"
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2fbf8a",
          "texture": "glow",
          "blend": "add",
          "radius": 0.85,
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
          "seedOffset": 3,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "radial-drag",
          "color": "#c8ffe8",
          "count": 36,
          "vortex": -1.4,
          "radius": 0.95,
          "time": [
            0,
            0.56
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
                  0.9
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
          "radius": 0.62,
          "time": [
            0.5,
            0.82
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
          "seedOffset": 5,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#d6fff0",
          "width": 2.0,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.52,
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
                  0.18
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 6,
          "intrinsicAlpha": true,
          "type": "ring",
          "color": "#7ff0c4",
          "width": 1.2,
          "widthSpace": "pixel",
          "noise": 0.04,
          "noiseClock": 9,
          "strokeProfile": "halo",
          "core": 0.2,
          "time": [
            0.58,
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
                  0.1
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
          "time": [
            0.52,
            1
          ],
          "clockSpace": "life",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 16,
          "sizeRange": [
            0.03,
            0.055
          ],
          "speed": [
            0.5,
            1.1
          ],
          "drag": 2.2,
          "gravity": [
            0,
            -0.3
          ],
          "lifeMs": [
            420,
            700
          ],
          "texture": "glow",
          "color": "#e8fff6",
          "emissionArc": [
            0,
            6.283
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0.5,
            0.78
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
        }
      ]
    },
    {
      "name": "activation-empower",
      "label": "起動：強化と色の変化 · C109",
      "sourceCode": "C109",
      "ms": 1150,
      "color": "#ff8ac8",
      "light": "#fff0f8",
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
        "atMs": 470,
        "cueMs": 470
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#a01f60",
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
          "color": "#f09fc8",
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
          "color": "#f08cbe",
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
          "color": "#ffc8e3",
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
          "color": "#f08cbe",
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
          "color": "#e87fb4",
          "light": "#ffeaf4",
          "shadow": "#701a45",
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
              "color": "#f09fc8",
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
          "color": "#e05fa0",
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
          "color": "#fff0f8",
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
          "color": "#ffe0f0",
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
          "color": "#e87fb4",
          "light": "#ffeaf4",
          "shadow": "#701a45",
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
          "color": "#ffd8ec",
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
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 20,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.035,
            0.06
          ],
          "speed": [
            0.45,
            0.9
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.5
          ],
          "lifeMs": [
            500,
            800
          ],
          "texture": "glow",
          "color": "#ff6a6a",
          "emissionArc": [
            0,
            6.283
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 21,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.035,
            0.06
          ],
          "speed": [
            0.45,
            0.9
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.5
          ],
          "lifeMs": [
            500,
            800
          ],
          "texture": "glow",
          "color": "#6ab8ff",
          "emissionArc": [
            0,
            6.283
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 22,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.035,
            0.06
          ],
          "speed": [
            0.45,
            0.9
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.5
          ],
          "lifeMs": [
            500,
            800
          ],
          "texture": "glow",
          "color": "#6aff9a",
          "emissionArc": [
            0,
            6.283
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 23,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.035,
            0.06
          ],
          "speed": [
            0.45,
            0.9
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.5
          ],
          "lifeMs": [
            500,
            800
          ],
          "texture": "glow",
          "color": "#ffe36a",
          "emissionArc": [
            0,
            6.283
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 24,
          "intrinsicAlpha": true,
          "time": [
            0.42,
            1
          ],
          "clockSpace": "life",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 4,
          "sizeRange": [
            0.035,
            0.06
          ],
          "speed": [
            0.45,
            0.9
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.5
          ],
          "lifeMs": [
            500,
            800
          ],
          "texture": "glow",
          "color": "#c38aff",
          "emissionArc": [
            0,
            6.283
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ffd27a",
          "texture": "glow",
          "blend": "add",
          "radius": 0.5,
          "time": [
            0.38,
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
        }
      ]
    },
    {
      "name": "activation-devour",
      "label": "起動：破壊して取り込む · C116",
      "sourceCode": "C116",
      "ms": 1200,
      "color": "#d0304a",
      "light": "#ffd6dc",
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
        "atMs": 700,
        "cueMs": 700
      },
      "composites": [],
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#2a0610",
          "texture": "smoke",
          "blend": "normal",
          "radius": 0.8,
          "time": [
            0,
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
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#a01830",
          "texture": "glow",
          "blend": "add",
          "radius": 0.55,
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
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "card",
          "time": [
            0,
            0.5
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
                  0
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
                  1,
                  0.45
                ]
              ],
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 4,
          "intrinsicAlpha": true,
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 14,
          "sizeRange": [
            0.1,
            0.18
          ],
          "speed": [
            0.1,
            0.35
          ],
          "drag": 2,
          "gravity": [
            0,
            -0.5
          ],
          "lifeMs": [
            500,
            900
          ],
          "delayMs": [
            0,
            200
          ],
          "texture": "smoke",
          "color": "#2a0a22",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0,
            0.6
          ],
          "clockSpace": "life"
        },
        {
          "type": "particles",
          "anchor": "path",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "motion": "path-motes",
          "count": 10,
          "indexStart": 1,
          "reverse": true,
          "moteOffset": 300,
          "lagIndex": 0.02,
          "size": 0.12,
          "sizeIndex": 0.02,
          "alpha": 0.2,
          "opacityIndex": -0.018181818181818184,
          "orient": "mote",
          "orientationSpeed": 2,
          "color": "#ecb9d4",
          "materials": [
            {
              "texture": "glow",
              "blend": "add"
            }
          ],
          "location": "path",
          "time": [
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09,
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
          "color": "#de80b2",
          "texture": "glow",
          "curves": {
            "alpha": {
              "keys": [
                [
                  0,
                  0.28
                ],
                [
                  1,
                  0.28
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
          "radius": 0.5,
          "location": "path",
          "time": [
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09
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
          "afterglowColor": "#efa3cb",
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
            0.09,
            0.62
          ],
          "batch": 1,
          "pass": 1,
          "pathBend": 0.8,
          "endExclusive": true,
          "pathSampleStep": 0.015,
          "clockOffset": 0.09
        },
        {
          "type": "glow",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "color": "#fdebee",
          "texture": "glow",
          "batch": 2,
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
              "exponent": 4
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.9
                ],
                [
                  1,
                  0.6
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
          "clockSpace": "life",
          "pass": 2
        },
        {
          "type": "card",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 5,
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
          },
          "pass": 2
        },
        {
          "type": "shake",
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "at": "impact",
          "batch": 5,
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
          },
          "pass": 2
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "type": "glow",
          "color": "#ff4a5e",
          "texture": "glow",
          "blend": "add",
          "radius": 0.7,
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
                  0.75
                ],
                [
                  0.6,
                  0.5249999999999999
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "at": "impact",
          "playbackDuration": {
            "maxMs": 600,
            "maxRatio": 1
          },
          "endAtEffectEnd": true
        }
      ]
    }
  ]
});
