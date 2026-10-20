/* 2026-10-17 未設定だった演出の新規制作（Claude直接）。既存の定義・共通部品は変更しない。
 * 第4弾（2026-10-17）：レムレース・不死の指輪・鬼神の指輪・生命／共鳴／複製の力・威圧の指輪・魔力の指輪。
 * 第3弾（2026-10-17）：苦行の指輪（R012）・錬成（E030）・ハイドラ（C055）・苦悶の刻印（E078）・受難の刻印（E077）。
 * 竜の契約（E008）・逆上（E032）・嵐の指輪（R023）・巻物の使用（I003/I004/I005/I011/I012）・指輪の開戦効果（R001〜R005/R032/R019/R031/R015/R041/R042）・封印されしもの（E057）。
 * 生成元：scratchpad の gen_vfx_1017.py（手で直す時はこのJSONを直接編集してよい）。 */
VbFxDefs.register({
  "schemaVersion": 2,
  "effects": [
    {
      "name": "dragon-pact",
      "label": "竜の契約 · E008",
      "sourceCode": "E008",
      "ms": 1000,
      "color": "#ff6a14",
      "light": "#ffe2a0",
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
        "atMs": 520,
        "cueMs": 520
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a0806",
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
          "color": "#ff9a3a",
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
              "color": "#ff7a20"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.06,
              "aspect": [
                1.7,
                0.35
              ],
              "rotationScale": 1,
              "color": "#ffe2a0",
              "blend": "add"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ff6a14",
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
              "#fff6d0",
              0.95
            ],
            [
              0.25,
              "#ffb040",
              0.85
            ],
            [
              0.55,
              "#e0480e",
              0.55
            ],
            [
              0.85,
              "#5a1206",
              0.2
            ],
            [
              1,
              "#2a0804",
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
          "color": "#ffd77a",
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
          "color": "#2a0c06"
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
          "color": "#fff2b0",
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
          "color": "#2a0c06"
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
          "color": "#fff2b0",
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
          "color": "#2a0c06"
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
          "color": "#ffd070",
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
          "color": "#2a0c06"
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
          "color": "#ffd070",
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
          "color": "#2a0c06"
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
          "color": "#ffb040",
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
          "color": "#2a0c06"
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
          "color": "#ffb040",
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
          "color": "#2a0c06"
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
          "color": "#ff8a24",
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
          "color": "#2a0c06"
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
          "color": "#ff8a24",
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
          "color": "#2a0c06"
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
          "color": "#ff6a18",
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
          "color": "#2a0c06"
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
          "color": "#ff5014",
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
          "color": "#2a0c06"
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
          "color": "#ff5014",
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
          "color": "#2a0c06"
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
          "color": "#e0400e",
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
          "color": "#2a0c06"
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
          "color": "#e0400e",
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
          "color": "#2a0c06"
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
          "color": "#c0300a",
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
          "color": "#2a0c06"
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
          "color": "#c0300a",
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
          "color": "#2a0c06"
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
          "color": "#9a2008",
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
              "#fff0b0",
              0.98
            ],
            [
              0.5,
              "#ffa030",
              0.85
            ],
            [
              0.8,
              "#c8300a",
              0.4
            ],
            [
              1,
              "#3a0804",
              0
            ]
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#ffb04a",
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
          "color": "#ff5a14",
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
                  1.0
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
          "color": "#ff8a20",
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
          "color": "#2a0a06",
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
              "#fff0b0",
              0.98
            ],
            [
              0.42,
              "#ff9a2a",
              0.9
            ],
            [
              0.7,
              "#d2380c",
              0.55
            ],
            [
              1,
              "#3a0804",
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
          "color": "#ffc070",
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
          "drag": 2.0,
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
          "color": "#ffa040",
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
      "name": "rage-shards",
      "label": "逆上 · E032",
      "sourceCode": "E032",
      "ms": 820,
      "color": "#ff2a2a",
      "light": "#ffd0c0",
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
        "atMs": 377,
        "cueMs": 377
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0,
            0.24
          ],
          "stops": [
            [
              0,
              "#ffe0d0",
              0.9
            ],
            [
              0.3,
              "#ff4a3a",
              0.75
            ],
            [
              0.65,
              "#a0101a",
              0.4
            ],
            [
              1,
              "#3a0408",
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
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ff3a30",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.1,
          "strokeProfile": "halo",
          "time": [
            0,
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
                  0.25,
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "width": {
              "keys": [
                [
                  0,
                  6
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
          "type": "shape",
          "shape": "crack-rays",
          "blend": "add",
          "color": "#ff6a50",
          "stroke": 0.035,
          "time": [
            0.02,
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
          "type": "card",
          "time": [
            0,
            0.24
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
                  0.35,
                  1.35
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
                  0.35,
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
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.16,
            0.46
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
              "exponent": 1.3
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
          "radius": 0.231,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1622,
            0.4622
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.748
                ],
                [
                  0.92,
                  0.748
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2252,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1644,
            0.4644
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.716
                ],
                [
                  0.92,
                  0.716
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2195,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1666,
            0.4666
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.685
                ],
                [
                  0.92,
                  0.685
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2137,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1688,
            0.4688
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.653
                ],
                [
                  0.92,
                  0.653
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2079,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.171,
            0.471
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.621
                ],
                [
                  0.92,
                  0.621
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2021,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1732,
            0.4732
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.589
                ],
                [
                  0.92,
                  0.589
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1964,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1754,
            0.4754
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.557
                ],
                [
                  0.92,
                  0.557
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1906,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1776,
            0.4776
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.525
                ],
                [
                  0.92,
                  0.525
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1848,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1798,
            0.4798
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.494
                ],
                [
                  0.92,
                  0.494
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.179,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.182,
            0.482
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.462
                ],
                [
                  0.92,
                  0.462
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1733,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1842,
            0.4842
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
              "exponent": 1.3
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
          "radius": 0.1675,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1864,
            0.4864
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.398
                ],
                [
                  0.92,
                  0.398
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1617,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1886,
            0.4886
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.366
                ],
                [
                  0.92,
                  0.366
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1559,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1908,
            0.4908
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.335
                ],
                [
                  0.92,
                  0.335
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1502,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.193,
            0.493
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.303
                ],
                [
                  0.92,
                  0.303
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1444,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1952,
            0.4952
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.271
                ],
                [
                  0.92,
                  0.271
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1386,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1974,
            0.4974
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.239
                ],
                [
                  0.92,
                  0.239
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1328,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.1996,
            0.4996
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.207
                ],
                [
                  0.92,
                  0.207
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1271,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.2018,
            0.5018
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.175
                ],
                [
                  0.92,
                  0.175
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1213,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.204,
            0.504
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.144
                ],
                [
                  0.92,
                  0.144
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1155,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.0,
          "time": [
            0.2062,
            0.5062
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.112
                ],
                [
                  0.92,
                  0.112
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1097,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.185,
            0.485
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
              "exponent": 1.3
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
          "radius": 0.231,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.1872,
            0.4872
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.748
                ],
                [
                  0.92,
                  0.748
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2252,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.1894,
            0.4894
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.716
                ],
                [
                  0.92,
                  0.716
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2195,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.1916,
            0.4916
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.685
                ],
                [
                  0.92,
                  0.685
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2137,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.1938,
            0.4938
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.653
                ],
                [
                  0.92,
                  0.653
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2079,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.196,
            0.496
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.621
                ],
                [
                  0.92,
                  0.621
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2021,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.1982,
            0.4982
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.589
                ],
                [
                  0.92,
                  0.589
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1964,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2004,
            0.5004
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.557
                ],
                [
                  0.92,
                  0.557
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1906,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2026,
            0.5026
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.525
                ],
                [
                  0.92,
                  0.525
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1848,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2048,
            0.5048
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.494
                ],
                [
                  0.92,
                  0.494
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.179,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.207,
            0.507
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.462
                ],
                [
                  0.92,
                  0.462
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1733,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2092,
            0.5092
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
              "exponent": 1.3
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
          "radius": 0.1675,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2114,
            0.5114
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.398
                ],
                [
                  0.92,
                  0.398
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1617,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2136,
            0.5136
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.366
                ],
                [
                  0.92,
                  0.366
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1559,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2158,
            0.5158
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.335
                ],
                [
                  0.92,
                  0.335
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1502,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.218,
            0.518
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.303
                ],
                [
                  0.92,
                  0.303
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1444,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2202,
            0.5202
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.271
                ],
                [
                  0.92,
                  0.271
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1386,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2224,
            0.5224
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.239
                ],
                [
                  0.92,
                  0.239
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1328,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2246,
            0.5246
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.207
                ],
                [
                  0.92,
                  0.207
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1271,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2268,
            0.5268
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.175
                ],
                [
                  0.92,
                  0.175
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1213,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.229,
            0.529
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.144
                ],
                [
                  0.92,
                  0.144
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1155,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.34,
          "time": [
            0.2312,
            0.5312
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.112
                ],
                [
                  0.92,
                  0.112
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1097,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.21,
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
              "interpolation": "power-in",
              "exponent": 1.3
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
          "radius": 0.231,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2122,
            0.5122
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.748
                ],
                [
                  0.92,
                  0.748
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2252,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2144,
            0.5144
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.716
                ],
                [
                  0.92,
                  0.716
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2195,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2166,
            0.5166
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.685
                ],
                [
                  0.92,
                  0.685
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2137,
          "texture": "plasma",
          "color": "#ffe8e0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2188,
            0.5188
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.653
                ],
                [
                  0.92,
                  0.653
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2079,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.221,
            0.521
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.621
                ],
                [
                  0.92,
                  0.621
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2021,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2232,
            0.5232
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.589
                ],
                [
                  0.92,
                  0.589
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1964,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2254,
            0.5254
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.557
                ],
                [
                  0.92,
                  0.557
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1906,
          "texture": "plasma",
          "color": "#ff6a5a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2276,
            0.5276
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.525
                ],
                [
                  0.92,
                  0.525
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1848,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2298,
            0.5298
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.494
                ],
                [
                  0.92,
                  0.494
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.179,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.232,
            0.532
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.462
                ],
                [
                  0.92,
                  0.462
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1733,
          "texture": "plasma",
          "color": "#ff3a2a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2342,
            0.5342
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
              "exponent": 1.3
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
          "radius": 0.1675,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2364,
            0.5364
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.398
                ],
                [
                  0.92,
                  0.398
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1617,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2386,
            0.5386
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.366
                ],
                [
                  0.92,
                  0.366
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1559,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2408,
            0.5408
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.335
                ],
                [
                  0.92,
                  0.335
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1502,
          "texture": "plasma",
          "color": "#f02020",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.243,
            0.543
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.303
                ],
                [
                  0.92,
                  0.303
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1444,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2452,
            0.5452
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.271
                ],
                [
                  0.92,
                  0.271
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1386,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2474,
            0.5474
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.239
                ],
                [
                  0.92,
                  0.239
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1328,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2496,
            0.5496
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.207
                ],
                [
                  0.92,
                  0.207
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1271,
          "texture": "plasma",
          "color": "#d81418",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2518,
            0.5518
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.175
                ],
                [
                  0.92,
                  0.175
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1213,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.254,
            0.554
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.144
                ],
                [
                  0.92,
                  0.144
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1155,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": -0.34,
          "time": [
            0.2562,
            0.5562
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
              "exponent": 1.3
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.112
                ],
                [
                  0.92,
                  0.112
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1097,
          "texture": "plasma",
          "color": "#c00c14",
          "blend": "add",
          "variant": 0
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0.46,
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
              "#ffc8b8",
              0.95
            ],
            [
              0.45,
              "#ff3a2a",
              0.8
            ],
            [
              0.75,
              "#9a0a14",
              0.4
            ],
            [
              1,
              "#3a0408",
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "shape",
          "shape": "crack-rays",
          "blend": "add",
          "color": "#ffa070",
          "stroke": 0.025,
          "time": [
            0.48,
            0.72
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
                  0.3
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 24,
          "sizeRange": [
            0.04,
            0.08
          ],
          "speed": [
            0.8,
            1.5
          ],
          "drag": 2.2,
          "gravity": [
            0,
            0.7
          ],
          "lifeMs": [
            300,
            600
          ],
          "delayMs": [
            0,
            50
          ],
          "texture": "plasma",
          "color": "#ff4030",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.46,
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
            0.46,
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
            0.46,
            0.62
          ],
          "holdEnd": true,
          "strength": [
            0.035,
            0.016
          ],
          "frequencyHz": [
            24,
            18
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
      "name": "storm-ring",
      "label": "嵐の指輪 · R023",
      "ms": 1500,
      "color": "#9a8cff",
      "light": "#f4f0ff",
      "playback": {
        "maxMs": 8000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "explicit",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 420,
        "cueMs": 420
      },
      "layers": [
        {
          "anchor": "enemies",
          "basis": "unit",
          "type": "glow",
          "color": "#16142a",
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
          "anchor": "enemies",
          "basis": "unit",
          "type": "glow",
          "color": "#2a2650",
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
          "anchor": "enemies",
          "basis": "unit",
          "type": "glow",
          "color": "#8a80ff",
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
          "anchor": "each-target",
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
          "color": "#b8acff",
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
          "anchor": "each-target",
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
          "color": "#d8d0ff",
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
          "anchor": "each-target",
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
          "color": "#c8c0ff",
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
          "anchor": "each-target",
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
          "color": "#f0ecff",
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
          "anchor": "each-target",
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
          "color": "#f0ecff",
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
          "anchor": "each-target",
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
          "color": "#f0ecff",
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
          "anchor": "each-target",
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
              "#f0ecff",
              0.95
            ],
            [
              0.45,
              "#8a7cff",
              0.55
            ],
            [
              1,
              "#2a2060",
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
          "anchor": "each-target",
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
            1.0,
            2.0
          ],
          "drag": 2.6,
          "gravity": [
            0,
            1.0
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
          "color": "#f0ecff",
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
          "anchor": "enemies",
          "basis": "unit",
          "type": "glow",
          "color": "#c8c0ff",
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
          "anchor": "each-target",
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
          "color": "#b8acff",
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
          "anchor": "each-target",
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
          "color": "#d8d0ff",
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
          "anchor": "each-target",
          "basis": "unit",
          "geometry": "filament",
          "points": [
            [
              0.0,
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
          "color": "#c8c0ff",
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
          "anchor": "each-target",
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
          "color": "#f0ecff",
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
          "anchor": "each-target",
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
          "color": "#f0ecff",
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
          "anchor": "each-target",
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
          "color": "#f0ecff",
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
          "anchor": "each-target",
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
              "#f0ecff",
              0.95
            ],
            [
              0.45,
              "#8a7cff",
              0.55
            ],
            [
              1,
              "#2a2060",
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
          "anchor": "each-target",
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
            1.0,
            2.0
          ],
          "drag": 2.6,
          "gravity": [
            0,
            1.0
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
          "color": "#f0ecff",
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
          "anchor": "enemies",
          "basis": "unit",
          "type": "glow",
          "color": "#c8c0ff",
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
          "anchor": "each-target",
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
                  2.0
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
          "anchor": "each-target",
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
        }
      ]
    },
    {
      "name": "scroll-shield",
      "label": "盾の巻物 · I003",
      "ms": 1400,
      "color": "#7ac8ff",
      "light": "#e8f6ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
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
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#7ac8ff",
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
          "color": "#7ac8ff",
          "light": "#e8f6ff",
          "shadow": "#1a3a5a",
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
          "color": "#e8f6ff",
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
              "color": "#7ac8ff"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "rotationScale": 1,
              "blend": "add",
              "color": "#e8f6ff"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "halo-ray",
          "color": "#fff1c4",
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
          "color": "#ffc75a",
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
              "#fff1c4",
              0.75
            ],
            [
              0.6,
              "#ffc75a",
              0.35
            ],
            [
              1,
              "#5a3a0e",
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
          "type": "particles",
          "motion": "orbit",
          "count": 6,
          "countScale": "none",
          "orbit": 0.26,
          "orbitVelocity": 0,
          "angleSpeed": 0.35,
          "directedSpin": true,
          "color": "#ffc75a",
          "time": [
            0.45,
            1
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.6
              ],
              [
                0.3,
                1
              ],
              [
                1,
                1
              ]
            ],
            "interpolation": "ease-out"
          },
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
            }
          },
          "materials": [
            {
              "shape": "faceted-needle-short",
              "radiusAbsolute": 0.13,
              "rotationScale": 1,
              "color": "#ffc75a"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.07,
              "blend": "add",
              "color": "#fff1c4"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#ffc75a",
          "light": "#fff1c4",
          "shadow": "#5a3a0e",
          "radius": 0.22,
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
                  0.2,
                  0.85
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
            "rotation": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  1,
                  -0.5
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
          "geometry": "card",
          "pad": 0,
          "color": "#ffc75a",
          "width": 4,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.7,
          "time": [
            0.55,
            0.98
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
          "color": "#fff1c4",
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
              "color": "#ffc75a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff1c4",
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
        }
      ]
    },
    {
      "name": "scroll-revive",
      "label": "幻視の巻物 · I004",
      "ms": 1400,
      "color": "#ffe08a",
      "light": "#fffbe8",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
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
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ffe08a",
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
          "color": "#ffe08a",
          "light": "#fffbe8",
          "shadow": "#5a4210",
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
          "color": "#fffbe8",
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
              "color": "#ffe08a"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "rotationScale": 1,
              "blend": "add",
              "color": "#fffbe8"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "halo-ray",
          "color": "#fffbe8",
          "blend": "add",
          "time": [
            0.45,
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
          "color": "#ffe08a",
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
              "#fffbe8",
              0.75
            ],
            [
              0.6,
              "#ffe08a",
              0.35
            ],
            [
              1,
              "#5a4210",
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
            1.0
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.25,
              "#fff4c8",
              0.8
            ],
            [
              0.6,
              "#ffd060",
              0.35
            ],
            [
              1,
              "#5a4210",
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
          "type": "ring",
          "geometry": "ellipse",
          "aspect": [
            1,
            0.3
          ],
          "radius": 0.24,
          "offset": [
            0,
            -0.52
          ],
          "color": "#c89a30",
          "width": 7,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0,
          "time": [
            0.5,
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
                  0.2,
                  1
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
            "radius": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  0.3,
                  0.25
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
          "type": "ring",
          "geometry": "ellipse",
          "aspect": [
            1,
            0.3
          ],
          "radius": 0.24,
          "offset": [
            0,
            -0.52
          ],
          "color": "#fff0b8",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.5,
            1.0
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
                  0.2,
                  1
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
            "radius": {
              "keys": [
                [
                  0,
                  0.12
                ],
                [
                  0.3,
                  0.25
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
          "type": "glow",
          "color": "#fff0b8",
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
          "color": "#fffbe8",
          "light": "#ffffff",
          "shadow": "#ffe08a",
          "offset": [
            0,
            0.02
          ],
          "time": [
            0.45,
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
          "color": "#fff0b8",
          "light": "#ffffff",
          "shadow": "#a07820",
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
          "color": "#fffbe8",
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
              "color": "#ffe08a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fffbe8",
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
        }
      ]
    },
    {
      "name": "scroll-giant",
      "label": "巨大化の巻物 · I005",
      "ms": 1400,
      "color": "#ff9a4a",
      "light": "#fff0d8",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
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
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ff9a4a",
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
          "color": "#ff9a4a",
          "light": "#fff0d8",
          "shadow": "#5a2a0a",
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
          "color": "#fff0d8",
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
              "color": "#ff9a4a"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "rotationScale": 1,
              "blend": "add",
              "color": "#fff0d8"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "halo-ray",
          "color": "#fff0d8",
          "blend": "add",
          "time": [
            0.45,
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
          "color": "#ff9a4a",
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
              "#fff0d8",
              0.75
            ],
            [
              0.6,
              "#ff9a4a",
              0.35
            ],
            [
              1,
              "#5a2a0a",
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
          "type": "particles",
          "motion": "rise",
          "count": 10,
          "phaseRate": [
            1.8,
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
          "size": 0.09,
          "sizeSize": 0.04,
          "sizePhase": -0.04,
          "color": "#ff9a4a",
          "time": [
            0.46,
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
              "texture": "glow",
              "color": "#ff9a4a",
              "blend": "add",
              "aspect": [
                0.28,
                1.9
              ],
              "rotationScale": 0
            },
            {
              "texture": "glow",
              "color": "#fff0d8",
              "radiusScale": 0.45,
              "aspect": [
                0.25,
                1.6
              ],
              "blend": "add",
              "rotationScale": 0
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0.45,
            1.0
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.2,
              "#fff0d8",
              0.85
            ],
            [
              0.5,
              "#ff9a4a",
              0.5
            ],
            [
              1,
              "#5a2a0a",
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
                  0.3,
                  0.55
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
          "type": "ring",
          "color": "#ff9a4a",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.05,
          "strokeProfile": "halo",
          "core": 0.25,
          "time": [
            0.48,
            0.85
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
                  0.25
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
          "type": "card",
          "time": [
            0.48,
            0.9
          ],
          "holdEnd": true,
          "filterOrder": [
            "brightness"
          ],
          "curves": {
            "scale": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  1.12
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "ease-out"
            },
            "brightness": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.3,
                  1.3
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
          "color": "#fff0d8",
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
              "color": "#ff9a4a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff0d8",
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
        }
      ]
    },
    {
      "name": "scroll-mana",
      "label": "魔力の巻物 · I011",
      "ms": 1400,
      "color": "#6ae0ff",
      "light": "#e8fdff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 760,
        "cueMs": 760
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2f8fb8",
          "texture": "glow",
          "time": [
            0,
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
                  1
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
          "type": "beam",
          "geometry": "spiral",
          "strokeProfile": "taper",
          "angleJitter": 0.25,
          "radialBias": 0.75,
          "radialSize": 0.5,
          "polarWave": 0.1,
          "polarFrequency": 4,
          "polarRate": 6,
          "segments": 16,
          "reverse": true,
          "headRamp": [
            0.12,
            0.55
          ],
          "copies": 7,
          "moteOffset": 70,
          "width": 0.05,
          "softness": 0.02,
          "polarTurn": 1.8,
          "color": "#6ae0ff",
          "time": [
            0,
            0.58
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
                  1.35
                ],
                [
                  1,
                  0.12
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
          "type": "beam",
          "geometry": "spiral",
          "strokeProfile": "taper",
          "angleJitter": 0.25,
          "radialBias": 0.75,
          "radialSize": 0.5,
          "polarWave": 0.1,
          "polarFrequency": 4,
          "polarRate": 6,
          "segments": 16,
          "reverse": true,
          "headRamp": [
            0.12,
            0.55
          ],
          "copies": 5,
          "moteOffset": 31,
          "width": 0.02,
          "softness": 0.008,
          "polarTurn": 2.2,
          "color": "#e8fdff",
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
                  0.2,
                  0.9
                ],
                [
                  0.85,
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
                  1.2
                ],
                [
                  1,
                  0.1
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
          "type": "particles",
          "motion": "radial-drag",
          "color": "#bff4ff",
          "count": 46,
          "vortex": -2.4,
          "radius": 1,
          "time": [
            0,
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
                  0.75
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
              "interpolation": "linear"
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "color": "#6ae0ff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.08,
          "strokeProfile": "halo",
          "time": [
            0.1,
            0.58
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
                  0.5
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.95
                ],
                [
                  1,
                  0.16
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
            },
            "width": {
              "keys": [
                [
                  0,
                  1.5
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
          "type": "glow",
          "blend": "normal",
          "time": [
            0.54,
            0.96
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.25,
              "#e8fdff",
              0.8
            ],
            [
              0.6,
              "#6ae0ff",
              0.35
            ],
            [
              1,
              "#0a3a4a",
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
                  0.5,
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
          "type": "card",
          "time": [
            0.54,
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
                  0.15,
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
          "type": "ring",
          "geometry": "card",
          "pad": 0,
          "color": "#6ae0ff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.54,
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
            },
            "pad": {
              "keys": [
                [
                  0,
                  0.06
                ],
                [
                  1,
                  0
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
            0.9,
            0.1
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.055,
          "sizeSize": 0.03,
          "sizePhase": -0.04,
          "color": "#e8fdff",
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
                  0.2,
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
              "color": "#6ae0ff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#e8fdff",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    },
    {
      "name": "scroll-guts",
      "label": "鼓舞の旗 · I012",
      "ms": 1400,
      "color": "#ff5a5a",
      "light": "#ffe8e0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
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
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ff5a5a",
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
          "color": "#ff5a5a",
          "light": "#ffe8e0",
          "shadow": "#5a0a14",
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
          "color": "#ffe8e0",
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
              "color": "#ff5a5a"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.04,
              "rotationScale": 1,
              "blend": "add",
              "color": "#ffe8e0"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "halo-ray",
          "color": "#ffe8e0",
          "blend": "add",
          "time": [
            0.45,
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
          "color": "#ff5a5a",
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
              "#ffe8e0",
              0.75
            ],
            [
              0.6,
              "#ff5a5a",
              0.35
            ],
            [
              1,
              "#5a0a14",
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
          "color": "#ff5a5a",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0.45,
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
                  0.2,
                  0.85
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#ff4a4a",
          "light": "#ffe0d0",
          "shadow": "#5a0a14",
          "radius": 0.3,
          "time": [
            0.45,
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
          "type": "glow",
          "blend": "normal",
          "aspect": [
            0.55,
            1.45
          ],
          "time": [
            0.45,
            1.0
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.2,
              "#fff0c0",
              0.95
            ],
            [
              0.45,
              "#ff7a30",
              0.8
            ],
            [
              0.75,
              "#d0201a",
              0.4
            ],
            [
              1,
              "#3a0408",
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
                  0.08
                ],
                [
                  0.25,
                  0.28
                ],
                [
                  1,
                  0.25
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
          "color": "#ffffff",
          "blend": "add",
          "time": [
            0.5,
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
                  0.35,
                  0.36
                ],
                [
                  1,
                  0.14
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
          "type": "particles",
          "motion": "rise",
          "count": 14,
          "phaseRate": [
            1.4,
            0.7
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            0.95,
            -0.2
          ],
          "sway": 0.03,
          "swayFrequency": 6,
          "size": 0.05,
          "sizeSize": 0.03,
          "sizePhase": -0.04,
          "color": "#ff8a40",
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
              "color": "#ff6a30",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#ffe0b0",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
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
          "color": "#ffe8e0",
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
              "color": "#ff5a5a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#ffe8e0",
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
        }
      ]
    },
    {
      "name": "ring-eye-red",
      "label": "赤い瞳の指輪 · R001",
      "ms": 1100,
      "color": "#ff4a3a",
      "light": "#ffd8d0",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ff4a3a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.04,
            0.59
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#ffd8d0",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.16,
            0.71
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "texture": "glow",
          "color": "#ff4a3a",
          "blend": "add",
          "aspect": [
            0.658,
            1
          ],
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
                  0.25,
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
                  0.5
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#ffd8d0",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            0
          ],
          "time": [
            0.1,
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
                  0.45
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 16,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#ff4a3a",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 11,
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
              "color": "#ff4a3a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#ffd8d0",
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
            0.12,
            0.6
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
                  0.3,
                  1.4
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
      "name": "ring-eye-blue",
      "label": "青い瞳の指輪 · R002",
      "ms": 1100,
      "color": "#4a9aff",
      "light": "#d8ecff",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#4a9aff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.04,
            0.59
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#d8ecff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.16,
            0.71
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "texture": "glow",
          "color": "#4a9aff",
          "blend": "add",
          "aspect": [
            0.658,
            1
          ],
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
                  0.25,
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
                  0.5
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#d8ecff",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            0
          ],
          "time": [
            0.1,
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
                  0.45
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 16,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#4a9aff",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 11,
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
              "color": "#4a9aff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#d8ecff",
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
            0.12,
            0.6
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
                  0.3,
                  1.4
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
      "name": "ring-eye-green",
      "label": "緑の瞳の指輪 · R003",
      "ms": 1100,
      "color": "#4ad86a",
      "light": "#dcffe4",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#4ad86a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.04,
            0.59
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#dcffe4",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.16,
            0.71
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "texture": "glow",
          "color": "#4ad86a",
          "blend": "add",
          "aspect": [
            0.658,
            1
          ],
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
                  0.25,
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
                  0.5
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#dcffe4",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            0
          ],
          "time": [
            0.1,
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
                  0.45
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 16,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#4ad86a",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 11,
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
              "color": "#4ad86a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#dcffe4",
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
            0.12,
            0.6
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
                  0.3,
                  1.4
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
      "name": "ring-eye-yellow",
      "label": "黄の瞳の指輪 · R004",
      "ms": 1100,
      "color": "#ffd040",
      "light": "#fff6d0",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ffd040",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.04,
            0.59
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#fff6d0",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.16,
            0.71
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "texture": "glow",
          "color": "#ffd040",
          "blend": "add",
          "aspect": [
            0.658,
            1
          ],
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
                  0.25,
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
                  0.5
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#fff6d0",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            0
          ],
          "time": [
            0.1,
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
                  0.45
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 16,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#ffd040",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 11,
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
              "color": "#ffd040",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff6d0",
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
            0.12,
            0.6
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
                  0.3,
                  1.4
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
      "name": "ring-eye-purple",
      "label": "紫の瞳の指輪 · R005",
      "ms": 1100,
      "color": "#b060ff",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#b060ff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.04,
            0.59
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#f0e0ff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.16,
            0.71
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "texture": "glow",
          "color": "#b060ff",
          "blend": "add",
          "aspect": [
            0.658,
            1
          ],
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
                  0.25,
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
                  0.5
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#f0e0ff",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            0
          ],
          "time": [
            0.1,
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
                  0.45
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 16,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#b060ff",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 11,
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
              "color": "#b060ff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#f0e0ff",
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
            0.12,
            0.6
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
                  0.3,
                  1.4
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
      "name": "ring-eye-rainbow",
      "label": "虹の瞳の指輪 · R032",
      "ms": 1100,
      "color": "#ff5a4a",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ff5a4a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.04,
            0.59
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#ffd040",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.14,
            0.69
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#4ad86a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.24,
            0.79
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#4a9aff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.34,
            0.89
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#b060ff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.44,
            0.99
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "texture": "glow",
          "color": "#f4f0ff",
          "blend": "add",
          "aspect": [
            0.658,
            1
          ],
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
                  0.25,
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
                  0.5
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#ffffff",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            0
          ],
          "time": [
            0.1,
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
                  0.45
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 5,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#ff5a4a",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 11,
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
              "color": "#ff5a4a",
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 5,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#ffd040",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 12,
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
              "color": "#ffd040",
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 5,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#4ad86a",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 13,
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
              "color": "#4ad86a",
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 5,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#4a9aff",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 14,
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
              "color": "#4a9aff",
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 5,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#b060ff",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 15,
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
              "color": "#b060ff",
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.12,
            0.6
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
                  0.3,
                  1.4
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
      "name": "paladin-ring",
      "label": "聖騎士の指輪 · R019",
      "ms": 1200,
      "color": "#ffd870",
      "light": "#fffbe8",
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
        "atMs": 360,
        "cueMs": 360
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ffe08a",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "time": [
            0.0,
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
            "width": {
              "keys": [
                [
                  0,
                  2
                ],
                [
                  0.25,
                  7
                ],
                [
                  1,
                  1.5
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
          "blend": "normal",
          "time": [
            0.0,
            0.55
          ],
          "stops": [
            [
              0,
              "#fffbe8",
              0.7
            ],
            [
              0.3,
              "#ffd870",
              0.5
            ],
            [
              0.7,
              "#a07010",
              0.2
            ],
            [
              1,
              "#3a2a08",
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
                  0.25,
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
                  0.25
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
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.1,
          "color": "#ffe08a",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "time": [
            0.22,
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
                  1
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "width": {
              "keys": [
                [
                  0,
                  2
                ],
                [
                  0.25,
                  7
                ],
                [
                  1,
                  1.5
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
          "blend": "normal",
          "time": [
            0.22,
            0.8
          ],
          "stops": [
            [
              0,
              "#fffbe8",
              0.7
            ],
            [
              0.3,
              "#ffd870",
              0.5
            ],
            [
              0.7,
              "#a07010",
              0.2
            ],
            [
              1,
              "#3a2a08",
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
                  0.25,
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
                  0.35
                ],
                [
                  1,
                  0.72
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#ffd870",
          "light": "#fffbe8",
          "shadow": "#6a4a10",
          "time": [
            0.25,
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
                  1
                ],
                [
                  0.75,
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
                  0.1
                ],
                [
                  0.3,
                  0.24
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 10,
          "phaseRate": [
            1.1,
            0.5
          ],
          "riseX": [
            0.08,
            0.92
          ],
          "riseY": [
            0.95,
            -0.1
          ],
          "sway": 0.02,
          "swayFrequency": 4,
          "size": 0.05,
          "sizeSize": 0.03,
          "sizePhase": -0.04,
          "color": "#ffe08a",
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
              "color": "#ffd060",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fffbe8",
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
            0.2,
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
                  0.3,
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
      "name": "speed-ring",
      "label": "神速の指輪 · R031",
      "ms": 1000,
      "color": "#fff2c0",
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
        "atMs": 380,
        "cueMs": 380
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#c99a3a",
          "texture": "glow",
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
                  0.3,
                  0.45
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.15
                ],
                [
                  1,
                  0.62
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.3
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "beam",
          "geometry": "radial",
          "segments": 2,
          "ribbonSeedFromCopy": true,
          "strokeProfile": "ribbon",
          "clockSpace": "life",
          "copies": 30,
          "moteOffset": 300,
          "angleJitter": 0.5,
          "width": 0.012,
          "color": "#ffe7a8",
          "time": [
            0.04,
            0.46
          ],
          "radiusSize": 0.18,
          "innerRadius": 0.72,
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  1.25
                ],
                [
                  1,
                  0.82
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
                  0.2,
                  0.75
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
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "beam",
          "geometry": "radial",
          "segments": 2,
          "ribbonSeedFromCopy": true,
          "strokeProfile": "ribbon",
          "clockSpace": "life",
          "copies": 14,
          "moteOffset": 760,
          "angleJitter": 0.7,
          "width": 0.022,
          "color": "#ffd56a",
          "time": [
            0.08,
            0.46
          ],
          "radiusSize": 0.2,
          "innerRadius": 0.78,
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  1.2
                ],
                [
                  1,
                  0.8
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
                  0.25,
                  0.35
                ],
                [
                  0.75,
                  0.25
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
          "geometry": "card",
          "color": "#ffe39a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.3,
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
                  0.2,
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
            "pad": {
              "keys": [
                [
                  0,
                  0.16
                ],
                [
                  1,
                  0
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
          "blend": "normal",
          "time": [
            0.36,
            0.8
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.85
            ],
            [
              0.3,
              "#fff0b0",
              0.6
            ],
            [
              0.7,
              "#d0a040",
              0.2
            ],
            [
              1,
              "#4a3a10",
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
                  0.25
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
          "motion": "rise",
          "count": 8,
          "phaseRate": [
            1.4,
            0.6
          ],
          "riseX": [
            0.1,
            0.9
          ],
          "riseY": [
            0.85,
            0.15
          ],
          "sway": 0.02,
          "swayFrequency": 5,
          "size": 0.04,
          "sizeSize": 0.02,
          "sizePhase": -0.04,
          "color": "#fff2c0",
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
                  0.2,
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
              "color": "#ffd56a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff2c0",
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
            0.3,
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
                  0.15,
                  1.6
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "y": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.2,
                  -0.12
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "ease-out"
            },
            "scale": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.2,
                  1.08
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        }
      ]
    },
    {
      "name": "toughness-ring",
      "label": "強靭の指輪 · R015",
      "ms": 1100,
      "color": "#5ae08a",
      "light": "#e8fff0",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#5ae08a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.04,
            0.59
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.06,
          "color": "#e8fff0",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.16,
            0.71
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "shape",
          "shape": "petal-seal",
          "color": "#5ae08a",
          "light": "#e8fff0",
          "shadow": "#0a4a2a",
          "offset": [
            0,
            -0.42
          ],
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.3,
                  0.15
                ],
                [
                  1,
                  0.12
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
          "color": "#e8fff0",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0,
            -0.42
          ],
          "time": [
            0.1,
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
                  1,
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
                  0.32
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
          "count": 16,
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
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#5ae08a",
          "time": [
            0.12,
            1
          ],
          "seedOffset": 11,
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
              "color": "#5ae08a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#e8fff0",
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
            0.12,
            0.6
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
                  0.3,
                  1.4
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
      "name": "curse-ring",
      "label": "呪いの指輪・憎悪の指輪 · R041/R042",
      "ms": 1200,
      "color": "#9a40e0",
      "light": "#e0c0ff",
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
        "atMs": 360,
        "cueMs": 360
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#1a0626",
          "texture": "smoke",
          "radius": 0.7,
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
                  0.25,
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
          "color": "#9a40e0",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.55,
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
                  0.25,
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
                  0.75
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
          "type": "particles",
          "motion": "orbit",
          "count": 10,
          "countScale": "none",
          "orbit": 0.45,
          "orbitVelocity": 0.15,
          "angleSpeed": -1.4,
          "color": "#c080ff",
          "time": [
            0.05,
            0.75
          ],
          "radialCurve": {
            "keys": [
              [
                0,
                1.2
              ],
              [
                1,
                0.1
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
              "texture": "smoke",
              "radiusAbsolute": 0.12,
              "rotationScale": 1,
              "color": "#3a0a5a"
            },
            {
              "texture": "plasma",
              "radiusAbsolute": 0.06,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#b060ff"
            }
          ]
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.2,
            0.85
          ],
          "holdEnd": true,
          "filterOrder": [
            "brightness",
            "saturation",
            "hue"
          ],
          "curves": {
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
                  0.3,
                  0.6
                ],
                [
                  1,
                  1
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
                  0.3,
                  25
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
      "name": "sealed-power",
      "label": "封印されしもの · E057",
      "sourceCode": "E057",
      "ms": 1200,
      "color": "#ffd060",
      "light": "#fff0b0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 400,
        "cueMs": 400
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "time": [
            0,
            0.4
          ],
          "type": "glow",
          "color": "#1a103a",
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
            0,
            0.4
          ],
          "type": "glow",
          "color": "#8a6aff",
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
            0,
            0.4
          ],
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#8a6aff",
          "light": "#e0d8ff",
          "shadow": "#1a103a",
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
            0.28,
            0.55
          ],
          "type": "glow",
          "color": "#ffd870",
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
            0.28,
            0.55
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ffd870",
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 18,
          "sizeRange": [
            0.04,
            0.08
          ],
          "speed": [
            0.8,
            1.5
          ],
          "drag": 2.2,
          "gravity": [
            0,
            0.8
          ],
          "lifeMs": [
            300,
            600
          ],
          "delayMs": [
            0,
            40
          ],
          "shape": "rough-polygon",
          "color": "#8a6aff",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.3,
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
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0.32,
            0.95
          ],
          "stops": [
            [
              0,
              "#ffffff",
              0.95
            ],
            [
              0.25,
              "#fff0b0",
              0.8
            ],
            [
              0.55,
              "#ffb030",
              0.45
            ],
            [
              1,
              "#5a3a08",
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
            1.0,
            -0.4
          ],
          "sway": 0.02,
          "swayFrequency": 6,
          "size": 0.08,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#ffd060",
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
              "color": "#ffb030",
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
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "time": [
            0.3,
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
            0.3,
            0.5
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
        }
      ]
    },
    {
      "name": "void-mastery",
      "label": "ヴォイド・ウォーカー · C093",
      "sourceCode": "C093",
      "ms": 1200,
      "color": "#b060ff",
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
        "atMs": 540,
        "cueMs": 540
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#1a0830",
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
              "#f0e0ff",
              0.9
            ],
            [
              0.3,
              "#a050ff",
              0.75
            ],
            [
              0.65,
              "#3a0a6a",
              0.35
            ],
            [
              1,
              "#10041e",
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
          "color": "#b060ff",
          "light": "#e8d0ff",
          "shadow": "#3a0a6a",
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
          "color": "#1a0830",
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
          "color": "#b060ff",
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
          "color": "#f0e0ff",
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
          "color": "#b060ff",
          "light": "#e8d0ff",
          "shadow": "#3a0a6a",
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
          "color": "#b060ff",
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
          "color": "#e8d0ff",
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
          "color": "#b060ff",
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
              "color": "#a050ff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#f0e0ff",
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
      "name": "keyword-grant",
      "label": "キーワードの付与（開戦） · EN044/EN047",
      "ms": 1200,
      "color": "#ffd060",
      "light": "#fff6d8",
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
        "atMs": 540,
        "cueMs": 540
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a1c08",
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
              "#fff6d8",
              0.9
            ],
            [
              0.3,
              "#ffc040",
              0.75
            ],
            [
              0.65,
              "#6a4a10",
              0.35
            ],
            [
              1,
              "#1e1404",
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
          "color": "#ffd060",
          "light": "#fff0c0",
          "shadow": "#6a4a10",
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
          "color": "#2a1c08",
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
          "color": "#ffd060",
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
          "color": "#fff6d8",
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
          "color": "#ffd060",
          "light": "#fff0c0",
          "shadow": "#6a4a10",
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
          "color": "#ffd060",
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
          "color": "#fff0c0",
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
          "color": "#ffd060",
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
              "color": "#ffc040",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff6d8",
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
      "name": "fate-sever",
      "label": "刻を織る者“ウルズ・ラグナ” · EN075",
      "ms": 1600,
      "color": "#e8d8a0",
      "light": "#fffbe8",
      "playback": {
        "maxMs": 8000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 760,
        "cueMs": 760
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0,
            0.5
          ],
          "stops": [
            [
              0,
              "#fff8e0",
              0.8
            ],
            [
              0.3,
              "#d8c890",
              0.6
            ],
            [
              0.7,
              "#5a5040",
              0.3
            ],
            [
              1,
              "#1a1810",
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
                  0.4,
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#e8d8a0",
          "light": "#fffbe8",
          "shadow": "#4a4030",
          "blend": "normal",
          "radius": 1.2,
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
                  0.95
                ],
                [
                  0.85,
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
                  6.0
                ]
              ],
              "interpolation": "power-in",
              "exponent": 2.2
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.8
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
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "geometry": "radial",
          "copies": 1,
          "segments": 2,
          "moteOffset": 100,
          "strokeProfile": "ribbon",
          "width": 0.05,
          "color": "#fffbe8",
          "clockSpace": "life",
          "time": [
            0.05,
            0.48
          ],
          "rotation": 0,
          "curves": {
            "radius": {
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
            },
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
                  0.6
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
          "geometry": "radial",
          "copies": 1,
          "segments": 2,
          "moteOffset": 101,
          "strokeProfile": "ribbon",
          "width": 0.030000000000000002,
          "color": "#fffbe8",
          "clockSpace": "life",
          "time": [
            0.05,
            0.48
          ],
          "rotation": 0,
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0.6000000000000001
                ],
                [
                  1,
                  0.6000000000000001
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
                  0.2,
                  0.9
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
          "time": [
            0.46,
            0.72
          ],
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
                  0.5
                ],
                [
                  1,
                  1.5
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
            0.46,
            0.72
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#fff4d0",
          "count": 18,
          "radius": 1.5,
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
            0.46,
            0.7
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.3,
              "#fff4d0",
              0.8
            ],
            [
              0.7,
              "#a09060",
              0.3
            ],
            [
              1,
              "#2a2418",
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
              "exponent": 1.5
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.4
                ],
                [
                  1,
                  1.4
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
          "count": 26,
          "sizeRange": [
            0.05,
            0.11
          ],
          "speed": [
            1.0,
            2.2
          ],
          "drag": 1.6,
          "gravity": [
            0,
            0.7
          ],
          "lifeMs": [
            450,
            900
          ],
          "delayMs": [
            0,
            40
          ],
          "texture": "plasma",
          "color": "#f0e0b0",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.46,
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
          "type": "flash",
          "anchor": "source",
          "basis": "unit",
          "seedOffset": 0,
          "intrinsicAlpha": true,
          "gradient": "radial",
          "geometry": "square",
          "radiusSpace": "reach",
          "minRadiusPx": 1,
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
              "#1a1814",
              0.5
            ],
            [
              0.7,
              "#24201a",
              0.42
            ],
            [
              1,
              "#3a3428",
              0.3
            ]
          ],
          "curves": {
            "radius": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.48,
                  0
                ],
                [
                  0.55,
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
            "fillRadius": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.48,
                  0
                ],
                [
                  0.55,
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
                  0.85,
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
            0.48,
            1
          ],
          "clockOffset": 0.48,
          "batch": 1
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "card",
          "time": [
            0.4,
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
                  0.2,
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
      "name": "penance-ring",
      "label": "苦行の指輪 · R012",
      "ms": 1000,
      "color": "#c01a24",
      "light": "#ffd8d0",
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
        "atMs": 460,
        "cueMs": 460
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#3a0610",
          "texture": "smoke",
          "radius": 0.6,
          "time": [
            0,
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
                  0.5,
                  0.9
                ],
                [
                  1,
                  0.2
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
          "type": "ring",
          "color": "#4a040c",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.16,
          "strokeProfile": "halo",
          "core": 0,
          "seedOffset": 3,
          "time": [
            0.0,
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
                  0.3,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.78
                ],
                [
                  1,
                  0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.8
            },
            "width": {
              "keys": [
                [
                  0,
                  10
                ],
                [
                  1,
                  14
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
          "type": "ring",
          "color": "#d0202a",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.2,
          "strokeProfile": "halo",
          "core": 0.5,
          "seedOffset": 3,
          "time": [
            0.0,
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
                  0.3,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.78
                ],
                [
                  1,
                  0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.8
            },
            "width": {
              "keys": [
                [
                  0,
                  3
                ],
                [
                  1,
                  5
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
                  -0.7
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
          "color": "#ffb0a0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.2,
          "strokeProfile": "halo",
          "core": 1,
          "seedOffset": 3,
          "time": [
            0.0,
            0.5
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
                  0.3,
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.78
                ],
                [
                  1,
                  0.42
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.8
            },
            "width": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  1,
                  1.6
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
                  -0.7
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
            0.1,
            0.46
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
                  1,
                  0.82
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
          "shape": "crack-rays",
          "blend": "add",
          "color": "#ff5a50",
          "stroke": 0.035,
          "time": [
            0.46,
            0.72
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
                  0.25
                ],
                [
                  1,
                  0.58
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
          "blend": "normal",
          "time": [
            0.46,
            0.8
          ],
          "stops": [
            [
              0,
              "#ffe0d8",
              0.95
            ],
            [
              0.22,
              "#ff3a30",
              0.85
            ],
            [
              0.55,
              "#8a0a14",
              0.45
            ],
            [
              1,
              "#2a0408",
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
                  0.22
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 8,
          "sizeRange": [
            0.09,
            0.13
          ],
          "speed": [
            0.55,
            1.0
          ],
          "drag": 1.4,
          "gravity": [
            0,
            2.0
          ],
          "lifeMs": [
            420,
            700
          ],
          "delayMs": [
            0,
            50
          ],
          "shape": "blood-drop",
          "color": "#c0141e",
          "light": "#ff8a80",
          "shadow": "#4a0408",
          "emissionArc": [
            3.6,
            5.8
          ],
          "time": [
            0.46,
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
              "interpolation": "smooth"
            }
          }
        },
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "card",
          "time": [
            0.46,
            0.74
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
                  1.5
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "power-out",
              "exponent": 2
            },
            "saturation": {
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
            0.46,
            0.62
          ],
          "holdEnd": true,
          "strength": [
            0.035,
            0.016
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
      "name": "alchemy",
      "label": "錬成 · E030",
      "sourceCode": "E030",
      "ms": 1300,
      "color": "#ffc040",
      "light": "#fff4c8",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 780,
        "cueMs": 780
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ffc040",
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
          "color": "#ffc040",
          "light": "#fff2c0",
          "shadow": "#6a4a10",
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
          "angleSpeed": 2.0,
          "time": [
            0.0,
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
              "color": "#d8b453"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.05,
              "rotationScale": 1,
              "blend": "add",
              "color": "#ffe8a0"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#ffb030",
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
              "#fff4c8",
              0.9
            ],
            [
              0.55,
              "#ffc040",
              0.5
            ],
            [
              1,
              "#5a3a08",
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
          "color": "#fff0b0",
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
          "color": "#fff0b0",
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
          "color": "#ffc040",
          "light": "#fff8e0",
          "shadow": "#8a5a10",
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
          "color": "#ffe08a",
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
              "color": "#ffc040",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff6d0",
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
        }
      ]
    },
    {
      "name": "hydra-reward",
      "label": "ハイドラ · C055",
      "sourceCode": "C055",
      "ms": 1300,
      "color": "#4ad86a",
      "light": "#e8ffe0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
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
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0,
            0.55
          ],
          "stops": [
            [
              0,
              "#e8ffe0",
              0.85
            ],
            [
              0.3,
              "#4ad86a",
              0.65
            ],
            [
              0.7,
              "#0a4a1a",
              0.3
            ],
            [
              1,
              "#041a08",
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
                  0.4,
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
                  0.25
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
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#5ae08a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.0,
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
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1,
            0.44
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
                  0.85,
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
          "radius": 0.3,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1022,
            0.4422
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.819
                ],
                [
                  0.85,
                  0.819
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2931,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1044,
            0.4444
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.787
                ],
                [
                  0.85,
                  0.787
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2862,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1066,
            0.4466
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.756
                ],
                [
                  0.85,
                  0.756
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2794,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1088,
            0.4488
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.725
                ],
                [
                  0.85,
                  0.725
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2725,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.111,
            0.451
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.694
                ],
                [
                  0.85,
                  0.694
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2656,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1132,
            0.4532
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.662
                ],
                [
                  0.85,
                  0.662
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2587,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1154,
            0.4554
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.631
                ],
                [
                  0.85,
                  0.631
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2519,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1176,
            0.4576
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
          },
          "radius": 0.245,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1198,
            0.4598
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.569
                ],
                [
                  0.85,
                  0.569
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2381,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.122,
            0.462
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.537
                ],
                [
                  0.85,
                  0.537
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2312,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1242,
            0.4642
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.506
                ],
                [
                  0.85,
                  0.506
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2244,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1264,
            0.4664
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.475
                ],
                [
                  0.85,
                  0.475
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2175,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1286,
            0.4686
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.444
                ],
                [
                  0.85,
                  0.444
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2106,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1308,
            0.4708
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.412
                ],
                [
                  0.85,
                  0.412
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2038,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.133,
            0.473
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.381
                ],
                [
                  0.85,
                  0.381
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1969,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1352,
            0.4752
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
                  0.85,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.19,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1374,
            0.4774
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.319
                ],
                [
                  0.85,
                  0.319
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1831,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1396,
            0.4796
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.287
                ],
                [
                  0.85,
                  0.287
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1762,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1418,
            0.4818
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.256
                ],
                [
                  0.85,
                  0.256
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1694,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.144,
            0.484
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.225
                ],
                [
                  0.85,
                  0.225
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1625,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1462,
            0.4862
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.194
                ],
                [
                  0.85,
                  0.194
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1556,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1484,
            0.4884
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.163
                ],
                [
                  0.85,
                  0.163
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1487,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            -0.1275,
            0.1
          ],
          "toOffset": [
            -0.85,
            -1.2
          ],
          "bend": 0.45,
          "time": [
            0.1506,
            0.4906
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.131
                ],
                [
                  0.85,
                  0.131
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1419,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 2
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#c8ffd8",
          "texture": "glow",
          "blend": "add",
          "offset": [
            -0.85,
            -1.2
          ],
          "time": [
            0.42,
            0.79
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
                  0.1
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
          "shape": "crystal",
          "color": "#5ae08a",
          "light": "#f0fff4",
          "shadow": "#0a4a2a",
          "offset": [
            -0.85,
            -1.2
          ],
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
                  0.24
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
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.16,
            0.5
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
                  0.85,
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
          "radius": 0.3,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1622,
            0.5022
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.819
                ],
                [
                  0.85,
                  0.819
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2931,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1644,
            0.5044
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.787
                ],
                [
                  0.85,
                  0.787
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2862,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1666,
            0.5066
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.756
                ],
                [
                  0.85,
                  0.756
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2794,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1688,
            0.5088
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.725
                ],
                [
                  0.85,
                  0.725
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2725,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.171,
            0.511
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.694
                ],
                [
                  0.85,
                  0.694
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2656,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1732,
            0.5132
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.662
                ],
                [
                  0.85,
                  0.662
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2587,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1754,
            0.5154
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.631
                ],
                [
                  0.85,
                  0.631
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2519,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1776,
            0.5176
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
          },
          "radius": 0.245,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1798,
            0.5198
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.569
                ],
                [
                  0.85,
                  0.569
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2381,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.182,
            0.522
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.537
                ],
                [
                  0.85,
                  0.537
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2312,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1842,
            0.5242
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.506
                ],
                [
                  0.85,
                  0.506
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2244,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1864,
            0.5264
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.475
                ],
                [
                  0.85,
                  0.475
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2175,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1886,
            0.5286
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.444
                ],
                [
                  0.85,
                  0.444
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2106,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1908,
            0.5308
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.412
                ],
                [
                  0.85,
                  0.412
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2038,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.193,
            0.533
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.381
                ],
                [
                  0.85,
                  0.381
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1969,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1952,
            0.5352
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
                  0.85,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.19,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1974,
            0.5374
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.319
                ],
                [
                  0.85,
                  0.319
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1831,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.1996,
            0.5396
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.287
                ],
                [
                  0.85,
                  0.287
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1762,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.2018,
            0.5418
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.256
                ],
                [
                  0.85,
                  0.256
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1694,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.204,
            0.544
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.225
                ],
                [
                  0.85,
                  0.225
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1625,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.2062,
            0.5462
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.194
                ],
                [
                  0.85,
                  0.194
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1556,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.2084,
            0.5484
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.163
                ],
                [
                  0.85,
                  0.163
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1487,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.0,
            0.1
          ],
          "toOffset": [
            0.0,
            -1.5
          ],
          "bend": 0.0,
          "time": [
            0.2106,
            0.5506
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.131
                ],
                [
                  0.85,
                  0.131
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1419,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 2
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#c8ffd8",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0.0,
            -1.5
          ],
          "time": [
            0.48,
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
                  1,
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
          "shape": "crystal",
          "color": "#5ae08a",
          "light": "#f0fff4",
          "shadow": "#0a4a2a",
          "offset": [
            0.0,
            -1.5
          ],
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
                  0.24
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
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.22,
            0.56
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
                  0.85,
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
          "radius": 0.3,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2222,
            0.5622
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.819
                ],
                [
                  0.85,
                  0.819
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2931,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2244,
            0.5644
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.787
                ],
                [
                  0.85,
                  0.787
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2862,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2266,
            0.5666
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.756
                ],
                [
                  0.85,
                  0.756
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2794,
          "texture": "plasma",
          "color": "#f0fff4",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2288,
            0.5688
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.725
                ],
                [
                  0.85,
                  0.725
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2725,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.231,
            0.571
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.694
                ],
                [
                  0.85,
                  0.694
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2656,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2332,
            0.5732
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.662
                ],
                [
                  0.85,
                  0.662
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2587,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2354,
            0.5754
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.631
                ],
                [
                  0.85,
                  0.631
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2519,
          "texture": "plasma",
          "color": "#a0ffc0",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2376,
            0.5776
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
          },
          "radius": 0.245,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2398,
            0.5798
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.569
                ],
                [
                  0.85,
                  0.569
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2381,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.242,
            0.582
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.537
                ],
                [
                  0.85,
                  0.537
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2312,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2442,
            0.5842
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.506
                ],
                [
                  0.85,
                  0.506
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2244,
          "texture": "plasma",
          "color": "#5ae08a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2464,
            0.5864
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.475
                ],
                [
                  0.85,
                  0.475
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2175,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2486,
            0.5886
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.444
                ],
                [
                  0.85,
                  0.444
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2106,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2508,
            0.5908
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.412
                ],
                [
                  0.85,
                  0.412
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2038,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.253,
            0.593
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.381
                ],
                [
                  0.85,
                  0.381
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1969,
          "texture": "plasma",
          "color": "#3ac86a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2552,
            0.5952
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
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
                  0.85,
                  0.35
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.19,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2574,
            0.5974
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.319
                ],
                [
                  0.85,
                  0.319
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1831,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2596,
            0.5996
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.287
                ],
                [
                  0.85,
                  0.287
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1762,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2618,
            0.6018
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.256
                ],
                [
                  0.85,
                  0.256
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1694,
          "texture": "plasma",
          "color": "#22a050",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.264,
            0.604
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.225
                ],
                [
                  0.85,
                  0.225
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1625,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2662,
            0.6062
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.194
                ],
                [
                  0.85,
                  0.194
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1556,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2684,
            0.6084
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.163
                ],
                [
                  0.85,
                  0.163
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1487,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "source",
          "fromOffset": [
            0.1275,
            0.1
          ],
          "toOffset": [
            0.85,
            -1.2
          ],
          "bend": -0.45,
          "time": [
            0.2706,
            0.6106
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
              "interpolation": "power-out",
              "exponent": 1.25
            },
            "alpha": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.08,
                  0.131
                ],
                [
                  0.85,
                  0.131
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1419,
          "texture": "plasma",
          "color": "#147a3a",
          "blend": "add",
          "variant": 2
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#c8ffd8",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0.85,
            -1.2
          ],
          "time": [
            0.54,
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
                  0.1
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
          "shape": "crystal",
          "color": "#5ae08a",
          "light": "#f0fff4",
          "shadow": "#0a4a2a",
          "offset": [
            0.85,
            -1.2
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
                  0.24
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
          "type": "shape",
          "shape": "flare",
          "color": "#fff6c0",
          "blend": "add",
          "offset": [
            0,
            -1.5
          ],
          "time": [
            0.6,
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
                  0.08
                ],
                [
                  0.4,
                  0.4
                ],
                [
                  1,
                  0.15
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
          "type": "particles",
          "motion": "rise",
          "count": 14,
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
            -0.5
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.07,
          "sizeSize": 0.05,
          "sizePhase": -0.05,
          "color": "#4ad86a",
          "time": [
            0.2,
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
              "color": "#3ac85a",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#e8ffe0",
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
            0.05,
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
                  1
                ],
                [
                  0.3,
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
      "name": "gold-loss",
      "label": "苦悶の刻印 · E078",
      "sourceCode": "E078",
      "ms": 1100,
      "color": "#8a7a50",
      "light": "#c8b880",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 200,
        "cueMs": 200
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#1e0a24",
          "texture": "smoke",
          "radius": 0.75,
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
                  0.25,
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
          "type": "shape",
          "shape": "rune-wheel",
          "color": "#8a2ab0",
          "light": "#e0b0ff",
          "shadow": "#1a0626",
          "blend": "normal",
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
                  0.45
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
          "type": "shape",
          "shape": "crack-rays",
          "blend": "add",
          "color": "#c070ff",
          "stroke": 0.03,
          "time": [
            0.08,
            0.42
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
                  0.52
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
          "count": 12,
          "emission": "circle",
          "radius": 0.12,
          "sizeRange": [
            0.13,
            0.17
          ],
          "speed": [
            0.7,
            1.2
          ],
          "direction": [
            4.3,
            5.1
          ],
          "gravity": [
            0,
            2.8
          ],
          "drag": 0.3,
          "spin": [
            -2.4,
            2.4
          ],
          "lifeMs": [
            650,
            900
          ],
          "delayMs": [
            0,
            90
          ],
          "shape": "coin",
          "color": "#d8b453",
          "light": "#f4e3a5",
          "shadow": "#8e6e30",
          "time": [
            0.12,
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
                  1
                ],
                [
                  0.55,
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 16,
          "sizeRange": [
            0.12,
            0.2
          ],
          "speed": [
            0.15,
            0.4
          ],
          "direction": [
            1.2,
            1.9
          ],
          "gravity": [
            0,
            0.3
          ],
          "drag": 1.2,
          "lifeMs": [
            600,
            900
          ],
          "delayMs": [
            280,
            480
          ],
          "texture": "smoke",
          "color": "#2a1a30",
          "emissionArc": [
            0,
            6.283
          ],
          "offset": [
            0,
            0.35
          ],
          "time": [
            0.2,
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
          "type": "card",
          "time": [
            0.05,
            0.9
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
                  0.3,
                  0.7
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
                  0.3,
                  0.3
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
      "name": "suffering-brand",
      "label": "受難の刻印 · E077",
      "sourceCode": "E077",
      "ms": 1100,
      "color": "#d02040",
      "light": "#ffc0c8",
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
        "atMs": 570,
        "cueMs": 570
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#20040e",
          "texture": "smoke",
          "radius": 0.8,
          "time": [
            0,
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
          "type": "glow",
          "color": "#c02040",
          "texture": "magic-circle",
          "blend": "add",
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
                  -1.4
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.45
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
          "blend": "normal",
          "time": [
            0.02,
            0.4
          ],
          "stops": [
            [
              0,
              "#ffd0d8",
              0.85
            ],
            [
              0.25,
              "#e02848",
              0.7
            ],
            [
              0.6,
              "#6a0818",
              0.35
            ],
            [
              1,
              "#20040e",
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
                  0.4
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
          "time": [
            0.14,
            0.4
          ],
          "type": "glow",
          "color": "#ff4a68",
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
                  0.25
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
          "time": [
            0.14,
            0.4
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ff4a68",
          "count": 18,
          "radius": 0.6,
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
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.24,
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
              "exponent": 1.4
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
          "radius": 0.252,
          "texture": "plasma",
          "color": "#ffd0d8",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2416,
            0.5216
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
                  0.08,
                  0.755
                ],
                [
                  0.92,
                  0.755
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2471,
          "texture": "plasma",
          "color": "#ffd0d8",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2432,
            0.5232
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
                  0.08,
                  0.73
                ],
                [
                  0.92,
                  0.73
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2421,
          "texture": "plasma",
          "color": "#ffd0d8",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2448,
            0.5248
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
                  0.08,
                  0.705
                ],
                [
                  0.92,
                  0.705
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2372,
          "texture": "plasma",
          "color": "#ffd0d8",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2464,
            0.5264
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
                  0.08,
                  0.68
                ],
                [
                  0.92,
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
          "radius": 0.2322,
          "texture": "plasma",
          "color": "#ffd0d8",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.248,
            0.528
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
                  0.08,
                  0.655
                ],
                [
                  0.92,
                  0.655
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2273,
          "texture": "plasma",
          "color": "#ff4a68",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2496,
            0.5296
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
                  0.08,
                  0.63
                ],
                [
                  0.92,
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
          "radius": 0.2223,
          "texture": "plasma",
          "color": "#ff4a68",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2512,
            0.5312
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
          "radius": 0.2174,
          "texture": "plasma",
          "color": "#ff4a68",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2528,
            0.5328
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
                  0.08,
                  0.58
                ],
                [
                  0.92,
                  0.58
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2124,
          "texture": "plasma",
          "color": "#ff4a68",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2544,
            0.5344
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
                  0.08,
                  0.555
                ],
                [
                  0.92,
                  0.555
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2075,
          "texture": "plasma",
          "color": "#ff4a68",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.256,
            0.536
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
                  0.08,
                  0.53
                ],
                [
                  0.92,
                  0.53
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.2025,
          "texture": "plasma",
          "color": "#d82040",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2576,
            0.5376
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
                  0.08,
                  0.505
                ],
                [
                  0.92,
                  0.505
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1976,
          "texture": "plasma",
          "color": "#d82040",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2592,
            0.5392
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
                  0.08,
                  0.48
                ],
                [
                  0.92,
                  0.48
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1926,
          "texture": "plasma",
          "color": "#d82040",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2608,
            0.5408
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
                  0.08,
                  0.455
                ],
                [
                  0.92,
                  0.455
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1877,
          "texture": "plasma",
          "color": "#d82040",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2624,
            0.5424
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
          "radius": 0.1827,
          "texture": "plasma",
          "color": "#a01030",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.264,
            0.544
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
                  0.08,
                  0.405
                ],
                [
                  0.92,
                  0.405
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1778,
          "texture": "plasma",
          "color": "#a01030",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2656,
            0.5456
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
                  0.08,
                  0.38
                ],
                [
                  0.92,
                  0.38
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1728,
          "texture": "plasma",
          "color": "#a01030",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2672,
            0.5472
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
                  0.08,
                  0.355
                ],
                [
                  0.92,
                  0.355
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1679,
          "texture": "plasma",
          "color": "#a01030",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2688,
            0.5488
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
                  0.08,
                  0.33
                ],
                [
                  0.92,
                  0.33
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1629,
          "texture": "plasma",
          "color": "#a01030",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2704,
            0.5504
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
                  0.08,
                  0.305
                ],
                [
                  0.92,
                  0.305
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.158,
          "texture": "plasma",
          "color": "#6a0820",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.272,
            0.552
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
                  0.08,
                  0.28
                ],
                [
                  0.92,
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
          "radius": 0.153,
          "texture": "plasma",
          "color": "#6a0820",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2736,
            0.5536
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
          "radius": 0.1481,
          "texture": "plasma",
          "color": "#6a0820",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2752,
            0.5552
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
                  0.08,
                  0.23
                ],
                [
                  0.92,
                  0.23
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1431,
          "texture": "plasma",
          "color": "#6a0820",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2768,
            0.5568
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
                  0.08,
                  0.205
                ],
                [
                  0.92,
                  0.205
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1382,
          "texture": "plasma",
          "color": "#6a0820",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2784,
            0.5584
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
                  0.08,
                  0.18
                ],
                [
                  0.92,
                  0.18
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1332,
          "texture": "plasma",
          "color": "#3a0410",
          "blend": "add",
          "variant": 0
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.28,
            0.56
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
                  0.08,
                  0.155
                ],
                [
                  0.92,
                  0.155
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1283,
          "texture": "plasma",
          "color": "#3a0410",
          "blend": "add",
          "variant": 1
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2816,
            0.5616
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
                  0.08,
                  0.13
                ],
                [
                  0.92,
                  0.13
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1233,
          "texture": "plasma",
          "color": "#3a0410",
          "blend": "add",
          "variant": 2
        },
        {
          "type": "projectile",
          "anchor": "path",
          "basis": "unit",
          "from": "source",
          "to": "target",
          "bend": 0.22,
          "time": [
            0.2832,
            0.5632
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
                  0.08,
                  0.105
                ],
                [
                  0.92,
                  0.105
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "smooth"
            }
          },
          "radius": 0.1183,
          "texture": "plasma",
          "color": "#3a0410",
          "blend": "add",
          "variant": 0
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
              "#ffd0d8",
              0.9
            ],
            [
              0.22,
              "#e02848",
              0.8
            ],
            [
              0.55,
              "#6a0818",
              0.4
            ],
            [
              1,
              "#20040e",
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
                  0.22
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
          "anchor": "each-target",
          "basis": "unit",
          "time": [
            0.52,
            0.76
          ],
          "type": "glow",
          "color": "#ff6a80",
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
                  0.25
                ],
                [
                  1,
                  0.58
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
            0.76
          ],
          "type": "particles",
          "motion": "radial-drag",
          "color": "#ff6a80",
          "count": 18,
          "radius": 0.58,
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#20040e",
          "texture": "smoke",
          "radius": 0.55,
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
          "type": "card",
          "time": [
            0.52,
            0.86
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
                  1.4
                ],
                [
                  0.3,
                  0.78
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
                  1.4
                ],
                [
                  0.3,
                  0.65
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
            0.52,
            0.68
          ],
          "holdEnd": true,
          "strength": [
            0.035,
            0.016
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
      "name": "soul-recall",
      "label": "レムレース · C031",
      "sourceCode": "C031",
      "ms": 1100,
      "color": "#6ac8ff",
      "light": "#f0faff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 480,
        "cueMs": 480
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#0a1a2a",
          "texture": "smoke",
          "radius": 0.75,
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
                  0.3,
                  0.85
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
          "type": "glow",
          "color": "#6ac8ff",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.9,
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
                  0.25,
                  0.85
                ],
                [
                  0.8,
                  0.65
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
                  -1.4
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.6
                ],
                [
                  1,
                  1.05
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
          "motion": "orbit",
          "count": 18,
          "countScale": "none",
          "orbit": 0.8,
          "orbitVelocity": 0.15,
          "angleSpeed": 1.6,
          "color": "#c8ecff",
          "time": [
            0.05,
            0.55
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
            "exponent": 1.4
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
              "radiusAbsolute": 0.13,
              "rotationScale": 1.5,
              "blend": "add",
              "color": "#6ac8ff"
            },
            {
              "texture": "glow",
              "radiusAbsolute": 0.07,
              "rotationScale": 1,
              "blend": "add",
              "color": "#f0faff"
            }
          ]
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "aspect": [
            0.7,
            1.5
          ],
          "time": [
            0.35,
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
              "#c8ecff",
              0.85
            ],
            [
              0.6,
              "#3a8ac8",
              0.4
            ],
            [
              1,
              "#0a1a2a",
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
              "interpolation": "power-out",
              "exponent": 1.2
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "color": "#a8dcff",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.08,
          "strokeProfile": "halo",
          "time": [
            0.4,
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
                  0.95
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
          "type": "particles",
          "motion": "rise",
          "count": 14,
          "phaseRate": [
            1.2,
            0.6
          ],
          "riseX": [
            0.06,
            0.94
          ],
          "riseY": [
            1.0,
            -0.6
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.07,
          "sizeSize": 0.042,
          "sizePhase": -0.05,
          "color": "#6ac8ff",
          "time": [
            0.35,
            1
          ],
          "seedOffset": 4,
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
              "color": "#6ac8ff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#f0faff",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    },
    {
      "name": "undying-ring",
      "label": "不死の指輪 · R017",
      "ms": 1200,
      "color": "#5ae0c0",
      "light": "#f0fff8",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 560,
        "cueMs": 560
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#08201c",
          "texture": "smoke",
          "radius": 1.3,
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
                  0.9
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
          "type": "glow",
          "color": "#5ae0c0",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 1.1,
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
                  0.25,
                  0.8
                ],
                [
                  0.8,
                  0.65
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
                  1.0
                ]
              ],
              "interpolation": "linear"
            },
            "radius": {
              "keys": [
                [
                  0,
                  0.7
                ],
                [
                  1,
                  1.2
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
          "color": "#9af0d8",
          "light": "#f0fff8",
          "shadow": "#0a3a30",
          "blend": "normal",
          "radius": 1.0,
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
                  0.42
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
            },
            "radius": {
              "keys": [
                [
                  0,
                  1.3
                ],
                [
                  1,
                  0.8
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
          "type": "glow",
          "blend": "normal",
          "offset": [
            -0.75,
            -0.2
          ],
          "aspect": [
            0.4,
            2.2
          ],
          "time": [
            0.35,
            0.85
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.25,
              "#e8fff6",
              0.85
            ],
            [
              0.6,
              "#5ad0b0",
              0.35
            ],
            [
              1,
              "#0a3a30",
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
                  0.3
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
          "type": "glow",
          "color": "#c8fff0",
          "texture": "glow",
          "blend": "add",
          "offset": [
            -0.75,
            0.3
          ],
          "time": [
            0.35,
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
          "offset": [
            0.0,
            -0.2
          ],
          "aspect": [
            0.4,
            2.2
          ],
          "time": [
            0.41,
            0.9099999999999999
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.25,
              "#e8fff6",
              0.85
            ],
            [
              0.6,
              "#5ad0b0",
              0.35
            ],
            [
              1,
              "#0a3a30",
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
                  0.3
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
          "type": "glow",
          "color": "#c8fff0",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0.0,
            0.3
          ],
          "time": [
            0.41,
            0.81
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
          "offset": [
            0.75,
            -0.2
          ],
          "aspect": [
            0.4,
            2.2
          ],
          "time": [
            0.47,
            0.97
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.25,
              "#e8fff6",
              0.85
            ],
            [
              0.6,
              "#5ad0b0",
              0.35
            ],
            [
              1,
              "#0a3a30",
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
                  0.3
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
          "type": "glow",
          "color": "#c8fff0",
          "texture": "glow",
          "blend": "add",
          "offset": [
            0.75,
            0.3
          ],
          "time": [
            0.47,
            0.87
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
          "type": "particles",
          "motion": "rise",
          "count": 18,
          "phaseRate": [
            1.2,
            0.6
          ],
          "riseX": [
            0.06,
            0.94
          ],
          "riseY": [
            1.2,
            -0.8
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.07,
          "sizeSize": 0.042,
          "sizePhase": -0.05,
          "color": "#9af0d8",
          "time": [
            0.3,
            1
          ],
          "seedOffset": 7,
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
              "color": "#9af0d8",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#f0fff8",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    },
    {
      "name": "oni-ring",
      "label": "鬼神の指輪 · R020",
      "ms": 1000,
      "color": "#ff6a14",
      "light": "#fff0b0",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 460,
        "cueMs": 460
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "glow",
          "color": "#2a0604",
          "texture": "smoke",
          "radius": 1.1,
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
                  0.9
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
          "type": "glow",
          "color": "#ff4a1a",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.95,
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
                  0.25,
                  0.85
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
                  0.5
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
          "type": "glow",
          "color": "#ff6a14",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0.1,
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
                  0.6,
                  0.95
                ],
                [
                  1,
                  0.7
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
                  0.55
                ]
              ],
              "interpolation": "power-in",
              "exponent": 1.4
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
          "aspect": [
            0.6,
            1.8
          ],
          "time": [
            0.45,
            0.95
          ],
          "stops": [
            [
              0,
              "#ffffff",
              1
            ],
            [
              0.2,
              "#fff0b0",
              0.95
            ],
            [
              0.45,
              "#ff9a2a",
              0.8
            ],
            [
              0.75,
              "#c8300a",
              0.4
            ],
            [
              1,
              "#3a0804",
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
                  0.25
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
          "type": "ring",
          "color": "#ffc070",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.15,
          "strokeProfile": "halo",
          "time": [
            0.46,
            0.85
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
                  0.25
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
                  8
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 30,
          "sizeRange": [
            0.05,
            0.1
          ],
          "speed": [
            0.8,
            1.8
          ],
          "drag": 1.8,
          "gravity": [
            0,
            -0.4
          ],
          "lifeMs": [
            400,
            800
          ],
          "delayMs": [
            0,
            60
          ],
          "texture": "plasma",
          "color": "#ffa040",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.46,
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
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "rise",
          "count": 14,
          "phaseRate": [
            1.2,
            0.6
          ],
          "riseX": [
            0.06,
            0.94
          ],
          "riseY": [
            1.1,
            -0.7
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.07,
          "sizeSize": 0.042,
          "sizePhase": -0.05,
          "color": "#ff7a2a",
          "time": [
            0.4,
            1
          ],
          "seedOffset": 9,
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
              "color": "#ff7a2a",
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
          "anchor": "source",
          "basis": "unit",
          "type": "shake",
          "time": [
            0.46,
            0.62
          ],
          "holdEnd": true,
          "strength": [
            0.03,
            0.016
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
      "name": "map-life",
      "label": "生命の力（魔導板）",
      "ms": 1100,
      "color": "#ff7aa8",
      "light": "#fff0f6",
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
        "atMs": 330,
        "cueMs": 330
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0,
            0.42
          ],
          "stops": [
            [
              0,
              "#fff0f6",
              0.8
            ],
            [
              0.3,
              "#ff7aa8",
              0.6
            ],
            [
              0.7,
              "#8a1a48",
              0.25
            ],
            [
              1,
              "#2a0614",
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
                  0.25,
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ff7aa8",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.02,
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
                  0.2,
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
          "type": "glow",
          "blend": "normal",
          "time": [
            0.28,
            0.7
          ],
          "stops": [
            [
              0,
              "#fff0f6",
              0.8
            ],
            [
              0.3,
              "#ff7aa8",
              0.6
            ],
            [
              0.7,
              "#8a1a48",
              0.25
            ],
            [
              1,
              "#2a0614",
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
                  0.25,
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
                  0.35
                ],
                [
                  1,
                  0.7999999999999999
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
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.09,
          "color": "#ff7aa8",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.30000000000000004,
            0.73
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
          "type": "shape",
          "shape": "petal-seal",
          "color": "#ff7aa8",
          "light": "#fff0f6",
          "shadow": "#7a1a44",
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
                  1
                ],
                [
                  0.75,
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
                  0.1
                ],
                [
                  0.3,
                  0.26
                ],
                [
                  1,
                  0.23
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
          "count": 12,
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
            -0.4
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.06,
          "sizeSize": 0.036,
          "sizePhase": -0.05,
          "color": "#ff7aa8",
          "time": [
            0.15,
            1
          ],
          "seedOffset": 12,
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
              "color": "#ff7aa8",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff0f6",
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
            0.05,
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
                  0.15,
                  1.35
                ],
                [
                  0.4,
                  1.1
                ],
                [
                  0.55,
                  1.4
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
      "name": "map-resonance",
      "label": "共鳴の力（魔導板）",
      "ms": 1150,
      "color": "#ffe08a",
      "light": "#fff6d8",
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
        "atMs": 400,
        "cueMs": 400
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "blend": "normal",
          "time": [
            0.05,
            0.55
          ],
          "stops": [
            [
              0,
              "#fffbe8",
              0.85
            ],
            [
              0.3,
              "#ffe08a",
              0.6
            ],
            [
              0.7,
              "#8a6a10",
              0.2
            ],
            [
              1,
              "#2a2004",
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
                  0.2
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#ffe8a0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.03,
          "strokeProfile": "halo",
          "time": [
            0.15,
            0.55
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#ffe8a0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.03,
          "strokeProfile": "halo",
          "time": [
            0.3,
            0.7
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "color": "#ffe8a0",
          "width": 1,
          "widthSpace": "pixel",
          "noise": 0.03,
          "strokeProfile": "halo",
          "time": [
            0.45,
            0.8500000000000001
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
          "anchor": "each-target",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#ffe08a",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
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
          "type": "glow",
          "color": "#fff6d8",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.35,
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
            -0.4
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.06,
          "sizeSize": 0.036,
          "sizePhase": -0.05,
          "color": "#ffd060",
          "time": [
            0.35,
            1
          ],
          "seedOffset": 15,
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
              "color": "#ffd060",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#fff6d8",
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
            0.35,
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
                  1.4
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
      "name": "map-duplicate",
      "label": "複製の力（魔導板）",
      "ms": 1000,
      "color": "#b8e8ff",
      "light": "#ffffff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
      },
      "defaultTargets": "source",
      "loop": false,
      "underStatus": false,
      "stackable": false,
      "impact": {
        "atMs": 400,
        "cueMs": 400
      },
      "layers": [
        {
          "anchor": "source",
          "basis": "unit",
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.04,
          "color": "#b8e8ff",
          "width": 3,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.6,
          "time": [
            0.0,
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
                  0.2,
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
          "type": "ring",
          "geometry": "superellipse",
          "radius": 1,
          "pad": 0.1,
          "color": "#ffffff",
          "width": 2,
          "widthSpace": "pixel",
          "noise": 0.02,
          "strokeProfile": "halo",
          "core": 0.8,
          "time": [
            0.12,
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
                  0.2,
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
          "type": "beam",
          "anchor": "source",
          "basis": "unit",
          "geometry": "filament",
          "strokeProfile": "ribbon",
          "points": [
            [
              -0.1,
              1.1
            ],
            [
              1.1,
              -0.1
            ]
          ],
          "pointSpace": "bounds",
          "noise": 0.02,
          "width": 0.22,
          "segments": 12,
          "color": "#e8f8ff",
          "blend": "add",
          "clip": "card",
          "time": [
            0.1,
            0.42
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 16,
          "sizeRange": [
            0.04,
            0.08
          ],
          "speed": [
            0.6,
            1.3
          ],
          "drag": 2.0,
          "gravity": [
            0,
            0.3
          ],
          "lifeMs": [
            400,
            700
          ],
          "delayMs": [
            0,
            50
          ],
          "shape": "rough-polygon",
          "color": "#f4f8fc",
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
          "type": "shape",
          "shape": "flare",
          "color": "#ffffff",
          "blend": "add",
          "offset": [
            0.3,
            -0.45
          ],
          "time": [
            0.38,
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
                  0.05
                ],
                [
                  0.4,
                  0.28
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
          "type": "card",
          "time": [
            0.1,
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
                  1
                ],
                [
                  0.35,
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
        }
      ]
    },
    {
      "name": "intimidate-ring",
      "label": "威圧の指輪 · R016",
      "ms": 1500,
      "color": "#c02030",
      "light": "#ffc0c8",
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
        "atMs": 520,
        "cueMs": 520
      },
      "layers": [
        {
          "anchor": "each-target",
          "basis": "unit",
          "type": "glow",
          "color": "#1a0204",
          "texture": "smoke",
          "variant": 0,
          "time": [
            0.0,
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
                  0.35,
                  0.95
                ],
                [
                  0.8,
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
          "type": "glow",
          "color": "#4a0610",
          "texture": "smoke",
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
                  0.35,
                  0.7
                ],
                [
                  0.8,
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
                  0.8
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
                  -0.8
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
          "color": "#8a1020",
          "texture": "smoke",
          "variant": 2,
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
                  0.35,
                  0.45
                ],
                [
                  0.8,
                  0.36000000000000004
                ],
                [
                  1,
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
                  1.0
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
          "color": "#c02030",
          "texture": "plasma",
          "blend": "add",
          "variant": 1,
          "time": [
            0.15,
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
                  0.4,
                  0.35
                ],
                [
                  0.8,
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
                  0.6
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
                  -0.7
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
          "count": 12,
          "sizeRange": [
            0.12,
            0.2
          ],
          "speed": [
            0.15,
            0.35
          ],
          "direction": [
            1.3,
            1.85
          ],
          "gravity": [
            0,
            0.5
          ],
          "drag": 1.2,
          "lifeMs": [
            700,
            1000
          ],
          "delayMs": [
            0,
            400
          ],
          "texture": "smoke",
          "color": "#3a0408",
          "emissionArc": [
            0,
            6.283
          ],
          "offset": [
            0,
            -0.5
          ],
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
                  0.3,
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
            0.2,
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
                  0.35,
                  0.62
                ],
                [
                  0.8,
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
                  0.35,
                  0.5
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "smooth"
            },
            "y": {
              "keys": [
                [
                  0,
                  0
                ],
                [
                  0.35,
                  0.05
                ],
                [
                  1,
                  0
                ]
              ],
              "interpolation": "ease-out"
            },
            "scale": {
              "keys": [
                [
                  0,
                  1
                ],
                [
                  0.35,
                  0.95
                ],
                [
                  1,
                  1
                ]
              ],
              "interpolation": "ease-out"
            }
          }
        }
      ]
    },
    {
      "name": "magic-ring-mana",
      "label": "魔力の指輪 · R013",
      "ms": 900,
      "color": "#5a8aff",
      "light": "#f0f4ff",
      "playback": {
        "maxMs": 6000,
        "speedMin": 0.4,
        "speedMax": 12
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
          "type": "glow",
          "color": "#5a8aff",
          "texture": "magic-circle",
          "blend": "add",
          "radius": 0.7,
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
                  0.25,
                  0.75
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
            }
          }
        },
        {
          "anchor": "source",
          "basis": "unit",
          "type": "shape",
          "shape": "crystal",
          "color": "#6a9aff",
          "light": "#f0f4ff",
          "shadow": "#1a2a6a",
          "time": [
            0.1,
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
                  0.2,
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
            "radius": {
              "keys": [
                [
                  0,
                  0.05
                ],
                [
                  0.3,
                  0.22
                ],
                [
                  1,
                  0.18
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
          "color": "#d8e4ff",
          "texture": "glow",
          "blend": "add",
          "time": [
            0.15,
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
                  0.1
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
          "type": "particles",
          "motion": "ballistic",
          "emit": "burst",
          "count": 14,
          "sizeRange": [
            0.04,
            0.08
          ],
          "speed": [
            0.6,
            1.3
          ],
          "drag": 2.0,
          "gravity": [
            0,
            -0.3
          ],
          "lifeMs": [
            400,
            700
          ],
          "delayMs": [
            80,
            160
          ],
          "shape": "faceted-polygon",
          "color": "#8ab0ff",
          "emissionArc": [
            0,
            6.283
          ],
          "time": [
            0.2,
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
            0.06,
            0.94
          ],
          "riseY": [
            1.0,
            -0.6
          ],
          "sway": 0.03,
          "swayFrequency": 5,
          "size": 0.06,
          "sizeSize": 0.036,
          "sizePhase": -0.05,
          "color": "#5a8aff",
          "time": [
            0.2,
            1
          ],
          "seedOffset": 18,
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
              "color": "#5a8aff",
              "blend": "add",
              "rotationScale": 1
            },
            {
              "texture": "glow",
              "color": "#f0f4ff",
              "radiusScale": 0.5,
              "blend": "add"
            }
          ]
        }
      ]
    }
  ]
});
