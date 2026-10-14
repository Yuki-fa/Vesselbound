/* 2026-10-12 利用者指定：21キャラの固有演出。共有眷属波はvariantsの入力値だけを替える。
 * 汎用図形・数値曲線・層のみ。旧82種の定義は変更しない。 */
// 2026-10-12指定・撮影第2回: 整数個数／脈動、背景の無い人型残像、柔らかい霧、蔓の成長と突進の命中同期。
// 2026-10-12指定・撮影第3回: 局所の霧の密度、座ったローブの輪郭、縦長の溶解と突進の表示順を修正。
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
   "ms": 1050,
   "color": "#319ff6",
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
    "atMs": 399.0,
    "cueMs": 399.0
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "rune-wheel",
     "radius": 0.58,
     "color": "#419dff",
     "time": [
      0,
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
     "stroke": 0.014,
     "offset": [
      0,
      0.43
     ]
    },
    {
     "type": "ring",
     "anchor": "source",
     "basis": "unit",
     "radius": 0.6,
     "width": 0.018,
     "color": "#49aaff",
     "time": [
      0.05,
      0.74
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
     "aspect": [
      1,
      0.36
     ],
     "offset": [
      0,
      0.43
     ]
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
     "radius": 0.1,
     "shape": "soul-wisp",
     "color": "#7bcaff",
     "light": "#f3fbff",
     "shadow": "#176baa",
     "bend": 0.12,
     "time": [
      0.12,
      0.8
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
      "length": 0.3,
      "width": 0.04,
      "color": "#7bcaff",
      "alpha": 0.6,
      "segments": 14
     },
     "copies": 3,
     "layout": "line",
     "spread": [
      0.17,
      0
     ]
    },
    {
     "type": "particles",
     "anchor": "source",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 32,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#94ddff",
     "texture": "glow",
     "time": [
      0.17,
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
     "emissionArc": [
      -1.95,
      -1.15
     ]
    }
   ]
  },
  {
   "name": "hecatoncheir",
   "label": "ヘカトンケイル",
   "sourceCode": "C020",
   "ms": 900,
   "color": "#45aaff",
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
    "atMs": 252.00000000000003,
    "cueMs": 252.00000000000003
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "rune-wheel",
     "radius": 0.35,
     "color": "#79caff",
     "time": [
      0,
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
     "stroke": 0.014,
     "offset": [
      0,
      0.3
     ]
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
     "radius": 0.08,
     "shape": "soul-wisp",
     "color": "#b1e2ff",
     "light": "#f3fbff",
     "shadow": "#176baa",
     "bend": 0.12,
     "time": [
      0.12,
      0.8
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
      "length": 0.3,
      "width": 0.04,
      "color": "#b1e2ff",
      "alpha": 0.6,
      "segments": 14
     }
    },
    {
     "type": "particles",
     "anchor": "source",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 16,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#8cd8ff",
     "texture": "glow",
     "time": [
      0.15,
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
     "emissionArc": [
      -2,
      -1.1
     ]
    }
   ]
  },
  {
   "name": "zombie",
   "label": "ゾンビ",
   "sourceCode": "C021",
   "ms": 1125,
   "color": "#99d9ec",
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
    "atMs": 495.0,
    "cueMs": 495.0
   },
   "layers": [
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
     "radius": 0.21,
     "shape": "soul-wisp",
     "color": "#c6f2f5",
     "light": "#f3fbff",
     "shadow": "#176baa",
     "bend": 0.12,
     "time": [
      0.06,
      0.83
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
      "length": 0.3,
      "width": 0.04,
      "color": "#c6f2f5",
      "alpha": 0.6,
      "segments": 14
     }
    },
    {
     "type": "glow",
     "anchor": "source",
     "basis": "unit",
     "radius": 0.15,
     "color": "#9bdffc",
     "texture": "glow",
     "time": [
      0.22,
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
     }
    },
    {
     "type": "particles",
     "anchor": "source",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 24,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#9ecfe6",
     "texture": "glow",
     "time": [
      0.16,
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
    }
   ]
  },
  {
   "name": "behemoth",
   "label": "ベヒーモス",
   "sourceCode": "C060",
   "ms": 1650,
   "color": "#d8f3ff",
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
    "atMs": 841.5,
    "cueMs": 841.5
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "rune-wheel",
     "radius": 0.82,
     "color": "#5dc5ff",
     "time": [
      0,
      0.56
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
     "stroke": 0.014
    },
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "orb",
     "radius": 0.17,
     "color": "#88dfff",
     "time": [
      0.1,
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
     "light": "#f1fcff",
     "shadow": "#162945"
    },
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "crystal",
     "radius": 0.23,
     "color": "#faffff",
     "light": "#ffffff",
     "shadow": "#4ba9df",
     "time": [
      0.08,
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
      "radius": {
       "keys": [
        [
         0,
         0.1
        ],
        [
         0.85,
         0.3
        ],
        [
         1,
         0.08
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
     "shape": "flare",
     "radius": 0.77,
     "color": "#e7faff",
     "time": [
      0.47,
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
     "aspect": [
      1,
      0.5
     ]
    },
    {
     "type": "ring",
     "anchor": "source",
     "basis": "unit",
     "radius": 0.3,
     "width": 0.018,
     "color": "#d2f4ff",
     "time": [
      0.49,
      0.89
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
     }
    },
    {
     "type": "particles",
     "anchor": "source",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 64,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#e7fcff",
     "texture": "glow",
     "time": [
      0.49,
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
    }
   ]
  },
  {
   "name": "sylph",
   "label": "シルフ",
   "sourceCode": "C064",
   "ms": 975,
   "color": "#6bcaff",
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
    "atMs": 351.0,
    "cueMs": 351.0
   },
   "layers": [
    {
     "type": "beam",
     "anchor": "source",
     "basis": "unit",
     "geometry": "spiral",
     "radius": 0.52,
     "polarTurn": 10.4,
     "polarWave": 0.22,
     "width": 0.022,
     "segments": 64,
     "color": "#a6e7ff",
     "time": [
      0,
      0.74
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
         0.12
        ],
        [
         0.55,
         0.58
        ],
        [
         1,
         0.23
        ]
       ],
       "interpolation": "smooth"
      }
     },
     "polarFrequency": 8,
     "polarRate": -18,
     "copies": 2,
     "copyAlpha": 0.65
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
     "radius": 0.1,
     "shape": "soul-wisp",
     "color": "#91d8ff",
     "light": "#f3fbff",
     "shadow": "#176baa",
     "bend": 0.12,
     "time": [
      0.22,
      0.84
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
      "length": 0.3,
      "width": 0.04,
      "color": "#91d8ff",
      "alpha": 0.6,
      "segments": 14
     }
    },
    {
     "type": "particles",
     "anchor": "source",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 22,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#9de4ff",
     "texture": "glow",
     "time": [
      0.14,
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
    "atMs": 780.0,
    "cueMs": 780.0
   },
   "layers": [
    {
     "type": "beam",
     "anchor": "each-target",
     "basis": "unit",
     "colorFrom": "anchor",
     "geometry": "filament",
     "strokeProfile": "halo",
     "width": 0.017,
     "noise": 0.025,
     "segments": 40,
     "core": 0.4,
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
     }
    },
    {
     "type": "projectile",
     "anchor": "path",
     "basis": "unit",
     "from": "target",
     "to": "source",
     "colorFrom": "anchor",
     "radius": 0.062,
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
      "length": 0.2,
      "width": 0.02,
      "alpha": 0.85,
      "segments": 16
     }
    },
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "orb",
     "radius": 0.073,
     "color": "#d6f4ff",
     "time": [
      0.4,
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
     "light": "#f1fcff",
     "shadow": "#162945",
     "copies": 5,
     "layout": "orbit",
     "orbit": 0.33,
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
     ]
    },
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "rune-wheel",
     "radius": 0.46,
     "color": "#8edcff",
     "time": [
      0.36,
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
     "stroke": 0.014
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
     "radius": 0.12,
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
      "length": 0.3,
      "width": 0.04,
      "color": "#b2e7ff",
      "alpha": 0.6,
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
   "color": "#d84972",
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
    "atMs": 648.0,
    "cueMs": 648.0
   },
   "layers": [
    {
     "type": "projectile",
     "anchor": "path",
     "basis": "unit",
     "from": "target",
     "to": "source",
     "radius": 0.105,
     "shape": "blood-drop",
     "color": "#bc244d",
     "light": "#fb929c",
     "shadow": "#370d2e",
     "bend": 0.48,
     "time": [
      0,
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
      "length": 0.19,
      "width": 0.04,
      "alpha": 0.6,
      "color": "#a03063",
      "segments": 15
     }
    },
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "orb",
     "radius": 0.17,
     "color": "#4fb4ff",
     "time": [
      0.48,
      0.83
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
     "light": "#f1fcff",
     "shadow": "#162945"
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
     "radius": 0.11,
     "shape": "soul-wisp",
     "color": "#91dcff",
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
      "length": 0.3,
      "width": 0.04,
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
   "color": "#622fa0",
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
    "atMs": 658.8,
    "cueMs": 658.8
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "orb",
     "radius": 0.14,
     "color": "#762bac",
     "time": [
      0,
      0.28
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
     "light": "#f1fcff",
     "shadow": "#162945"
    },
    {
     "type": "projectile",
     "anchor": "path",
     "basis": "unit",
     "from": "source",
     "to": "target",
     "shape": "orb",
     "radius": 0.19,
     "color": "#652485",
     "light": "#d19ced",
     "shadow": "#10091d",
     "bend": 0.34,
     "time": [
      0.1,
      0.61
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
      "length": 0.28,
      "width": 0.07,
      "color": "#682c95",
      "alpha": 0.8,
      "segments": 16
     }
    },
    {
     "type": "shape",
     "anchor": "each-target",
     "basis": "unit",
     "shape": "flare",
     "radius": 0.43,
     "color": "#b67ae3",
     "time": [
      0.56,
      0.78
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
     }
    },
    {
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 34,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#ac6bea",
     "texture": "glow",
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
    }
   ]
  },
  {
   "name": "phantom",
   "label": "ファントム（眷属強化）",
   "sourceCode": "C029",
   "ms": 3600,
   "color": "#80c8eb",
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
    "atMs": 828.0,
    "cueMs": 828.0
   },
   "layers": [
    {
     "type": "ring",
     "anchor": "source",
     "basis": "unit",
     "radius": 0.02,
     "radiusSpace": "width",
     "width": 0.04,
     "color": "#a4def4",
     "strokeProfile": "halo",
     "time": [
      0,
      0.4
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
         0.75
        ],
        [
         0.65,
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
     "noise": 0.055
    },
    {
     "type": "ring",
     "anchor": "source",
     "basis": "unit",
     "radius": 0.02,
     "radiusSpace": "width",
     "width": 0.032,
     "color": "#6dbada",
     "strokeProfile": "halo",
     "time": [
      0.055,
      0.455
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
         0.38
        ],
        [
         0.65,
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
     "noise": 0.055
    },
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "soul-wisp",
     "radius": 0.18,
     "color": "#9cd9ef",
     "light": "#f4fbff",
     "shadow": "#285b8b",
     "offset": [
      0,
      -0.1
     ],
     "time": [
      0,
      0.2
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
         0.7
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
      },
      "shiftY": {
       "keys": [
        [
         0,
         0.15
        ],
        [
         1,
         -0.35
        ]
       ],
       "interpolation": "smooth"
      }
     }
    },
    {
     "type": "shape",
     "anchor": "each-target",
     "basis": "unit",
     "shape": "soul-wisp",
     "radius": 0.14,
     "offset": [
      0.32,
      -0.5
     ],
     "color": "#74bcd9",
     "light": "#e7f7ff",
     "shadow": "#254f83",
     "time": [
      0.22,
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
         0.85
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
         -0.2
        ],
        [
         0.5,
         0.2
        ],
        [
         1,
         -0.1
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
          0.14
         ],
         [
          2,
          0.16
         ]
        ],
        "interpolation": "smooth"
       },
       "mode": "set"
      }
     ]
    },
    {
     "type": "ring",
     "anchor": "each-target",
     "basis": "unit",
     "radius": 0.195,
     "width": 0.022,
     "color": "#9ad9e8",
     "time": [
      0.24,
      0.9
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
     "offset": [
      0.32,
      -0.5
     ]
    },
    {
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 14,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#9ae5f4",
     "texture": "glow",
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
   "color": "#af53e1",
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
    "atMs": 903.0,
    "cueMs": 903.0
   },
   "layers": [
    {
     "type": "beam",
     "anchor": "path",
     "basis": "unit",
     "geometry": "filament",
     "width": 0.022,
     "color": "#923ece",
     "segments": 32,
     "noise": 0.12,
     "core": 0.4,
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
     "size": 0.035,
     "sizeSize": 0.025,
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
     "radius": 0.62,
     "width": 0.018,
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
    }
   ]
  },
  {
   "name": "gremlin",
   "label": "グレムリン",
   "sourceCode": "C083",
   "ms": 1350,
   "color": "#6b6273",
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
    "atMs": 756.0000000000001,
    "cueMs": 756.0000000000001
   },
   "layers": [
    {
     "type": "beam",
     "anchor": "path",
     "basis": "unit",
     "geometry": "filament",
     "width": 0.022,
     "color": "#544351",
     "segments": 32,
     "noise": 0.12,
     "core": 0.4,
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
     "type": "projectile",
     "anchor": "path",
     "basis": "unit",
     "shape": "gear-ring",
     "radius": 0.13,
     "color": "#65535b",
     "light": "#bfb2a8",
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
     "type": "fog",
     "anchor": "each-target",
     "basis": "unit",
     "mode": "cloud",
     "texture": "smoke",
     "radius": 0.23,
     "color": "#393241",
     "extent": [
      0.32,
      0.19
     ],
     "count": 28,
     "flow": [
      -0.06,
      -0.025
     ],
     "aspect": [
      1.2,
      0.8
     ],
     "noise": 0.06,
     "blend": "normal",
     "time": [
      0.42,
      0.94
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
         0.95
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
         0.2
        ],
        [
         0.5,
         0.25
        ],
        [
         1,
         0.16
        ]
       ],
       "interpolation": "smooth"
      }
     }
    },
    {
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 25,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#88737d",
     "texture": "glow",
     "time": [
      0.47,
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
     "type": "glow",
     "anchor": "each-target",
     "basis": "unit",
     "blend": "normal",
     "radius": 0.18,
     "color": "#393241",
     "stops": [
      [
       0,
       "#211d2d",
       0.82
      ],
      [
       0.32,
       "#504757",
       0.65
      ],
      [
       0.72,
       "#807381",
       0.2
      ],
      [
       1,
       "#393241",
       0
      ]
     ],
     "copies": 3,
     "layout": "line",
     "spread": [
      0.16,
      0.035
     ],
     "aspect": [
      1.25,
      0.83
     ],
     "time": [
      0.42,
      0.94
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
         0.88
        ],
        [
         0.6,
         0.82
        ],
        [
         1,
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
         0.45,
         0.23
        ],
        [
         1,
         0.13
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftX": {
       "keys": [
        [
         0,
         -0.035
        ],
        [
         1,
         0.035
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftY": {
       "keys": [
        [
         0,
         -0.06
        ],
        [
         1,
         0.04
        ]
       ],
       "interpolation": "smooth"
      },
      "rotation": {
       "keys": [
        [
         0,
         -0.15
        ],
        [
         1,
         0.12
        ]
       ],
       "interpolation": "smooth"
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
   "color": "#d65092",
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
    "atMs": 967.5,
    "cueMs": 967.5
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "petal-seal",
     "radius": 0.15,
     "color": "#b82f80",
     "light": "#ffbadf",
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
     "type": "projectile",
     "anchor": "path",
     "basis": "unit",
     "shape": "petal-seal",
     "radius": 0.15,
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
     "type": "ring",
     "anchor": "each-target",
     "basis": "unit",
     "radius": 0.24,
     "width": 0.028,
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
    }
   ]
  },
  {
   "name": "overlord",
   "label": "オーバーロード",
   "sourceCode": "C097",
   "ms": 2100,
   "color": "#b55aea",
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
    "atMs": 1344.0,
    "cueMs": 1344.0
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "robed-silhouette",
     "radius": 0.68,
     "aspect": [
      0.7,
      1
     ],
     "color": "#9751c4",
     "light": "#deabff",
     "shadow": "#351d4e",
     "blend": "normal",
     "time": [
      0.04,
      0.35
     ],
     "curves": {
      "shiftX": {
       "keys": [
        [
         0,
         0.14
        ],
        [
         1,
         -0.08
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftY": {
       "keys": [
        [
         0,
         0.15
        ],
        [
         1,
         0.075
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
         0.5
        ],
        [
         0.65,
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
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "robed-silhouette",
     "radius": 1.292,
     "aspect": [
      0.7,
      1
     ],
     "color": "#9e62d2",
     "light": "#eed4ff",
     "shadow": "#2f174b",
     "blend": "normal",
     "time": [
      0.18,
      0.7
     ],
     "curves": {
      "radius": {
       "keys": [
        [
         0,
         1.292
        ],
        [
         1,
         0.68
        ]
       ],
       "interpolation": "ease-out"
      },
      "shiftY": {
       "keys": [
        [
         0,
         -0.5
        ],
        [
         1,
         0.075
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
         0.58
        ],
        [
         0.65,
         0.58
        ],
        [
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
     "radius": 0.68,
     "width": 0.018,
     "color": "#b55ee9",
     "time": [
      0.52,
      0.93
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
     }
    },
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "flare",
     "radius": 0.41,
     "color": "#e8bbff",
     "time": [
      0.59,
      0.78
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
     "aspect": [
      1,
      0.44
     ]
    },
    {
     "type": "particles",
     "anchor": "source",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 46,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#bd79df",
     "texture": "glow",
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
    }
   ]
  },
  {
   "name": "minotaur",
   "label": "ミノタウロス",
   "sourceCode": "C009",
   "ms": 975,
   "color": "#fb473b",
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
    "atMs": 448.5,
    "cueMs": 82.875
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "flare",
     "radius": 0.65,
     "color": "#ff6660",
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
     "aspect": [
      1.4,
      0.55
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
     ]
    },
    {
     "type": "ring",
     "anchor": "source",
     "basis": "unit",
     "radius": 0.52,
     "width": 0.018,
     "color": "#ff6654",
     "time": [
      0,
      0.31
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
     ]
    },
    {
     "type": "beam",
     "anchor": "path",
     "basis": "unit",
     "geometry": "filament",
     "width": 0.022,
     "color": "#ee473d",
     "segments": 32,
     "noise": 0.02,
     "core": 0.4,
     "time": [
      0.28,
      0.61
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
     ]
    },
    {
     "type": "ring",
     "anchor": "each-target",
     "basis": "unit",
     "radius": 0.34,
     "width": 0.019,
     "color": "#fa6555",
     "time": [
      0.35,
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
     },
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
     ]
    },
    {
     "type": "particles",
     "anchor": "source",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 23,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#ff9a71",
     "texture": "glow",
     "time": [
      0.05,
      0.34
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
     ]
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
   "color": "#c75364",
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
    "atMs": 708.75,
    "cueMs": 708.75
   },
   "layers": [
    {
     "type": "card",
     "anchor": "source",
     "basis": "unit",
     "time": [
      0,
      0.55
     ],
     "dissolve": 0,
     "grid": 48,
     "curves": {
      "dissolve": {
       "keys": [
        [
         0,
         0
        ],
        [
         0.4,
         0.25
        ],
        [
         1,
         1
        ]
       ],
       "interpolation": "smooth"
      },
      "opacity": {
       "keys": [
        [
         0,
         1
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
      }
     },
     "dissolveFit": "stretch"
    },
    {
     "type": "fog",
     "anchor": "source",
     "basis": "unit",
     "mode": "cloud",
     "texture": "smoke",
     "radius": 0.2,
     "color": "#ab3653",
     "extent": [
      0.29,
      0.22
     ],
     "count": 36,
     "flow": [
      0,
      -0.06
     ],
     "aspect": [
      1.1,
      0.95
     ],
     "noise": 0.045,
     "blend": "normal",
     "time": [
      0,
      0.57
     ],
     "curves": {
      "alpha": {
       "keys": [
        [
         0,
         0
        ],
        [
         0.16,
         0.85
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
         0.2
        ],
        [
         1,
         0.11
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
     "motion": "ballistic",
     "emit": "burst",
     "count": 50,
     "sizeRange": [
      0.018,
      0.05
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#b65772",
     "texture": "glow",
     "time": [
      0.04,
      0.61
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
     "type": "shape",
     "anchor": "source",
     "basis": "unit",
     "shape": "blood-drop",
     "radius": 0.105,
     "color": "#ae254a",
     "light": "#e595a0",
     "shadow": "#411531",
     "copies": 3,
     "layout": "line",
     "spread": [
      0.29,
      0
     ],
     "time": [
      0.39,
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
      "shiftY": {
       "keys": [
        [
         0,
         0
        ],
        [
         1,
         0.45
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
         0.5,
         0.11
        ],
        [
         1,
         0.04
        ]
       ],
       "interpolation": "smooth"
      }
     },
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
      }
     ]
    },
    {
     "type": "glow",
     "anchor": "source",
     "basis": "unit",
     "blend": "normal",
     "radius": 0.14,
     "color": "#ad3659",
     "stops": [
      [
       0,
       "#6b1734",
       0.85
      ],
      [
       0.35,
       "#af365c",
       0.7
      ],
      [
       0.72,
       "#d0687e",
       0.22
      ],
      [
       1,
       "#a43358",
       0
      ]
     ],
     "copies": 3,
     "layout": "line",
     "spread": [
      0.13,
      0.055
     ],
     "aspect": [
      1.1,
      0.9
     ],
     "time": [
      0.025,
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
         0.14,
         0.88
        ],
        [
         0.6,
         0.82
        ],
        [
         1,
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
         0.42,
         0.2
        ],
        [
         1,
         0.085
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftX": {
       "keys": [
        [
         0,
         -0.035
        ],
        [
         1,
         0.035
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftY": {
       "keys": [
        [
         0,
         0.055
        ],
        [
         1,
         -0.08
        ]
       ],
       "interpolation": "smooth"
      },
      "rotation": {
       "keys": [
        [
         0,
         -0.15
        ],
        [
         1,
         0.12
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
   "color": "#85bf45",
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
    "atMs": 546.0,
    "cueMs": 546.0
   },
   "layers": [
    {
     "type": "projectile",
     "anchor": "each-target",
     "basis": "unit",
     "from": "target",
     "to": "target",
     "fromOffset": [
      0.18,
      -0.85
     ],
     "toOffset": [
      0,
      0
     ],
     "shape": "blood-drop",
     "radius": 0.065,
     "color": "#96c854",
     "light": "#d7eba2",
     "shadow": "#315336",
     "time": [
      0,
      0.53
     ],
     "copies": 3,
     "layout": "line",
     "spread": [
      0.22,
      0
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
     }
    },
    {
     "type": "shape",
     "anchor": "each-target",
     "basis": "unit",
     "shape": "billow-cloud",
     "radius": 0.29,
     "color": "#83ad42",
     "time": [
      0.42,
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
     "aspect": [
      1.5,
      0.35
     ],
     "light": "#bace79",
     "shadow": "#374930"
    },
    {
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 18,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#afca69",
     "texture": "glow",
     "time": [
      0.44,
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
    }
   ]
  },
  {
   "name": "undine",
   "label": "ウンディーネ",
   "sourceCode": "C066",
   "ms": 1200,
   "color": "#9ba9bc",
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
    "atMs": 564.0,
    "cueMs": 564.0
   },
   "layers": [
    {
     "type": "fog",
     "anchor": "each-target",
     "basis": "unit",
     "mode": "cloud",
     "texture": "smoke",
     "radius": 0.22,
     "color": "#9a9bb3",
     "extent": [
      0.31,
      0.23
     ],
     "count": 34,
     "flow": [
      -0.1,
      0.055
     ],
     "aspect": [
      1.2,
      0.8
     ],
     "noise": 0.045,
     "blend": "normal",
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
         0.16,
         0.85
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
         0.22
        ],
        [
         1,
         0.16
        ]
       ],
       "interpolation": "smooth"
      }
     }
    },
    {
     "type": "ring",
     "anchor": "each-target",
     "basis": "unit",
     "radius": 0.49,
     "width": 0.015,
     "color": "#a4bac7",
     "aspect": [
      1,
      0.58
     ],
     "time": [
      0.13,
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
         0.12,
         0.28
        ],
        [
         0.65,
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
         0.58
        ],
        [
         1,
         0.34
        ]
       ],
       "interpolation": "smooth"
      }
     }
    },
    {
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 14,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#a5b6c9",
     "texture": "glow",
     "time": [
      0.22,
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
         0.12,
         0.55
        ],
        [
         0.65,
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
     "gravity": [
      0,
      0.5
     ]
    },
    {
     "type": "glow",
     "anchor": "each-target",
     "basis": "unit",
     "blend": "normal",
     "radius": 0.16,
     "color": "#8c91ac",
     "stops": [
      [
       0,
       "#706780",
       0.72
      ],
      [
       0.3,
       "#a7a9c1",
       0.62
      ],
      [
       0.7,
       "#b8ced2",
       0.28
      ],
      [
       1,
       "#8c91ac",
       0
      ]
     ],
     "copies": 3,
     "layout": "line",
     "spread": [
      0.15,
      0.045
     ],
     "aspect": [
      1.22,
      0.76
     ],
     "time": [
      0.03,
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
         0.14,
         0.88
        ],
        [
         0.6,
         0.82
        ],
        [
         1,
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
         0.35,
         0.23
        ],
        [
         1,
         0.17
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftX": {
       "keys": [
        [
         0,
         -0.035
        ],
        [
         1,
         0.035
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
         1,
         0.18
        ]
       ],
       "interpolation": "smooth"
      },
      "rotation": {
       "keys": [
        [
         0,
         -0.15
        ],
        [
         1,
         0.12
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
   "color": "#79ba68",
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
    "atMs": 823.5,
    "cueMs": 823.5
   },
   "layers": [
    {
     "type": "shape",
     "anchor": "each-target",
     "basis": "unit",
     "shape": "vine-loop",
     "radius": 0.43,
     "color": "#598b48",
     "light": "#d8e9a9",
     "shadow": "#283c2e",
     "time": [
      0,
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
      "radius": {
       "keys": [
        [
         0,
         0.11
        ],
        [
         0.62,
         0.51
        ],
        [
         1,
         0.51
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
         0.08
        ],
        [
         0.62,
         1.08
        ],
        [
         1,
         1.08
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftY": {
       "keys": [
        [
         0,
         0.67
        ],
        [
         0.62,
         0.14
        ],
        [
         1,
         0.14
        ]
       ],
       "interpolation": "smooth"
      }
     }
    },
    {
     "type": "ring",
     "anchor": "each-target",
     "basis": "unit",
     "radius": 0.56,
     "width": 0.018,
     "color": "#b6cd83",
     "time": [
      0.52,
      1
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
     }
    },
    {
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 22,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#b2d77c",
     "texture": "glow",
     "time": [
      0.38,
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
    }
   ]
  },
  {
   "name": "incubus",
   "label": "インキュバス",
   "sourceCode": "C084",
   "ms": 1350,
   "color": "#bf354f",
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
    "atMs": 621.0,
    "cueMs": 621.0
   },
   "layers": [
    {
     "type": "card",
     "anchor": "each-target",
     "basis": "unit",
     "time": [
      0,
      0.55
     ],
     "dissolve": 0,
     "grid": 48,
     "curves": {
      "dissolve": {
       "keys": [
        [
         0,
         0
        ],
        [
         0.4,
         0.25
        ],
        [
         1,
         1
        ]
       ],
       "interpolation": "smooth"
      },
      "opacity": {
       "keys": [
        [
         0,
         1
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
      }
     },
     "dissolveFit": "stretch"
    },
    {
     "type": "fog",
     "anchor": "each-target",
     "basis": "unit",
     "mode": "cloud",
     "texture": "smoke",
     "radius": 0.18,
     "color": "#a7294e",
     "extent": [
      0.28,
      0.2
     ],
     "count": 28,
     "flow": [
      0,
      -0.06
     ],
     "aspect": [
      1.1,
      0.95
     ],
     "noise": 0.045,
     "blend": "normal",
     "time": [
      0,
      0.57
     ],
     "curves": {
      "alpha": {
       "keys": [
        [
         0,
         0
        ],
        [
         0.16,
         0.85
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
         0.18
        ],
        [
         1,
         0.11
        ]
       ],
       "interpolation": "smooth"
      }
     }
    },
    {
     "type": "shape",
     "anchor": "each-target",
     "basis": "unit",
     "shape": "blood-drop",
     "radius": 0.14,
     "color": "#b52348",
     "light": "#f1919b",
     "shadow": "#42132f",
     "copies": 2,
     "layout": "line",
     "spread": [
      0.35,
      0
     ],
     "time": [
      0.35,
      0.96
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
      "shiftY": {
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
      "radius": {
       "keys": [
        [
         0,
         0.1
        ],
        [
         0.4,
         0.15
        ],
        [
         1,
         0.025
        ]
       ],
       "interpolation": "smooth"
      }
     },
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
      }
     ]
    },
    {
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 22,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#ce6782",
     "texture": "glow",
     "time": [
      0.02,
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
     "type": "glow",
     "anchor": "each-target",
     "basis": "unit",
     "blend": "normal",
     "radius": 0.17,
     "color": "#ad3659",
     "stops": [
      [
       0,
       "#6b1734",
       0.85
      ],
      [
       0.35,
       "#af365c",
       0.7
      ],
      [
       0.72,
       "#d0687e",
       0.22
      ],
      [
       1,
       "#a43358",
       0
      ]
     ],
     "copies": 2,
     "layout": "line",
     "spread": [
      0.21,
      0.035
     ],
     "aspect": [
      1.1,
      0.9
     ],
     "time": [
      0.02,
      0.43
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
         0.88
        ],
        [
         0.6,
         0.82
        ],
        [
         1,
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
         0.42,
         0.21
        ],
        [
         1,
         0.08
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftX": {
       "keys": [
        [
         0,
         -0.035
        ],
        [
         1,
         0.035
        ]
       ],
       "interpolation": "smooth"
      },
      "shiftY": {
       "keys": [
        [
         0,
         0.025
        ],
        [
         1,
         -0.055
        ]
       ],
       "interpolation": "smooth"
      },
      "rotation": {
       "keys": [
        [
         0,
         -0.15
        ],
        [
         1,
         0.12
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
   "color": "#9752db",
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
    "atMs": 580.5,
    "cueMs": 580.5
   },
   "layers": [
    {
     "type": "beam",
     "anchor": "path",
     "basis": "unit",
     "geometry": "filament",
     "width": 0.022,
     "color": "#9852db",
     "segments": 24,
     "noise": 0.46,
     "core": 0.7,
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
     "type": "particles",
     "anchor": "each-target",
     "basis": "unit",
     "motion": "ballistic",
     "emit": "burst",
     "count": 28,
     "sizeRange": [
      0.012,
      0.035
     ],
     "speed": [
      0.35,
      1.1
     ],
     "lifeMs": [
      220,
      550
     ],
     "delayMs": [
      0,
      160
     ],
     "radius": 0.22,
     "color": "#b487f0",
     "texture": "glow",
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
     "type": "shape",
     "anchor": "each-target",
     "basis": "unit",
     "shape": "rune-wheel",
     "radius": 0.39,
     "color": "#87c0d7",
     "time": [
      0.4,
      0.84
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
     "stroke": 0.014
    },
    {
     "type": "shape",
     "anchor": "each-target",
     "basis": "unit",
     "shape": "flare",
     "radius": 0.24,
     "color": "#e0cdff",
     "time": [
      0.39,
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
     }
    },
    {
     "type": "ring",
     "anchor": "each-target",
     "basis": "unit",
     "radius": 0.43,
     "width": 0.018,
     "color": "#a38ec9",
     "time": [
      0.44,
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
     }
    }
   ]
  }
 ]
});
