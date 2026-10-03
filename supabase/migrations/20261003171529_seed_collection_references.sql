-- Generated from preserved offline fixtures by scripts/migration/generate-reference-seed.mjs.
-- Match existing rows by stable ID AND expected brand; never create phantom inventory.
-- Empty fresh databases are valid. Missing targets in populated inventory or wrong brands abort deployment.
do $$
declare r jsonb;
begin
 for r in select value from jsonb_array_elements('[
  {
    "id": "ink_61",
    "brand": "Wearingeul",
    "details": "The Nautilus’s voyages through the Antarctic, Atlantic, Indian, and Pacific inspire this vivid blue. Gold sparkle suggests coral reefs and the richness of life beneath the sea.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1021"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/b5d5405c9a3b7.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "ink_61",
      "name": "20000 Leagues Under the Sea",
      "productCode": "148WGBU",
      "inspiration": {
        "author": "Jules Verne",
        "work": "20000 Leagues Under the Sea",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          0,
          47,
          122
        ],
        "p": "2145U"
      },
      "properties": [
        "Shading",
        "Glistening"
      ],
      "glitterColors": [
        "Gold"
      ]
    }
  },
  {
    "id": "238416a6-2d22-4766-8105-e4199f52a5c0",
    "brand": "Wearingeul",
    "details": "Shifting blue, navy, violet, and red suggest a changing deep sea. Bright red sheen gathers at the edges of the ocean-blue ink.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=423"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/ed15eff6e6a13.jpg?w=1920"
      },
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      }
    ],
    "reference": {
      "inkId": "238416a6-2d22-4766-8105-e4199f52a5c0",
      "name": "7 Colored Ocean",
      "productCode": "102KSBU",
      "inspiration": {
        "author": "Lee Yuk sa",
        "work": "Speckled Cat",
        "series": "Korean Literature"
      },
      "color": {
        "rgb": [
          0,
          53,
          124
        ],
        "p": "301U"
      },
      "properties": [
        "Sheen"
      ],
      "glitterColors": [],
      "colorGuideProperties": [
        "Shading",
        "Sheen"
      ],
      "notes": [
        "The product sheet and color guide list different effects; the displayed properties follow the product sheet."
      ]
    }
  },
  {
    "id": "a1c5596c-2fce-4993-8d99-4bd09dabc7bf",
    "brand": "Wearingeul",
    "details": "Pink-violet and blue separate like pieces of a dream. Gold sparkle recalls sand slipping through one’s fingers, expressing a beautiful moment that cannot be held.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1351"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/38a286bc4804a.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "a1c5596c-2fce-4993-8d99-4bd09dabc7bf",
      "name": "A Dream Within a Dream",
      "productCode": "190WGVI",
      "inspiration": {
        "author": "Edgar Allan Poe",
        "work": "A Dream Within a Dream",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          170,
          156,
          198
        ],
        "p": "2645U"
      },
      "properties": [
        "Color Shading",
        "Shading",
        "Glistening"
      ],
      "glitterColors": [
        "Gold"
      ]
    }
  },
  {
    "id": "ink_59",
    "brand": "Wearingeul",
    "details": "Lavender with silver and gold sparkle reflects Sara Crewe’s dignity and persistent hope. The warm shimmer expresses her quiet strength and grace.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1182"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/557a44732410b.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "ink_59",
      "name": "A Little Princess",
      "productCode": "169WGVI",
      "inspiration": {
        "author": "Frances Hodgson Burnett",
        "work": "A Little Princess",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          207,
          137,
          244
        ],
        "p": "0631U"
      },
      "properties": [
        "Shading",
        "Glistening"
      ],
      "glitterColors": [
        "Silver",
        "Gold"
      ]
    }
  },
  {
    "id": "dc812d3b-1a22-4dd4-89aa-1864e5761dda",
    "brand": "Wearingeul",
    "details": "Soft violet settles into periwinkle, with silver and blue sparkle recalling stars seen through tear-filled eyes.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=225"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/c8dbf020c3d68.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "dc812d3b-1a22-4dd4-89aa-1864e5761dda",
      "name": "A Watery Star",
      "productCode": "014KGBU",
      "inspiration": {
        "author": "Jung Ji Yong",
        "work": "Windowpane",
        "series": "Korean Literature"
      },
      "color": {
        "rgb": [
          106,
          132,
          188
        ],
        "p": "660U"
      },
      "properties": [
        "Glistening",
        "Shading"
      ],
      "glitterColors": [
        "Silver",
        "Blue"
      ],
      "edition": "Glistening",
      "notes": [
        "Glistening edition confirmed by the owner. Wearingeul also lists a discontinued standard version."
      ]
    }
  },
  {
    "id": "ink_65",
    "brand": "Wearingeul",
    "details": "Bright gold sparkle over a light blue with yellow shading conveys Alice’s lively spirit.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=343"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/7ea2e94f40177.jpg?w=1920"
      },
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      }
    ],
    "reference": {
      "inkId": "ink_65",
      "name": "Alice",
      "productCode": "067WGBU",
      "inspiration": {
        "author": "Lewis Carroll",
        "work": "Alice in Wonderland",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          10,
          152,
          196
        ],
        "p": "7703U"
      },
      "properties": [
        "Glistening"
      ],
      "glitterColors": [
        "Gold"
      ],
      "colorGuideProperties": [
        "Shading",
        "Color Shading",
        "Glistening"
      ],
      "notes": [
        "The product sheet and color guide list different effects; the displayed properties follow the product sheet."
      ]
    }
  },
  {
    "id": "439839ff-1c03-43c5-b9f0-14bc99d97b8c",
    "brand": "Wearingeul",
    "details": "Inspired by the Titan who carries the heavens, the blue suggests water while green shimmer represents land and earth. Created in collaboration with Atlas Stationers.",
    "sources": [
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      },
      {
        "label": "Atlas Stationers product page",
        "url": "https://www.atlasstationers.com/products/wearingeul-atlas-30ml-bottled-ink-atlas-exclusive"
      },
      {
        "label": "Manufacturer packaging via Atlas Stationers",
        "url": "https://www.atlasstationers.com/cdn/shop/files/Wearingeul_Atlas_E.jpg?v=1716403382&width=1500"
      }
    ],
    "reference": {
      "inkId": "439839ff-1c03-43c5-b9f0-14bc99d97b8c",
      "name": "Atlas",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "World Myth — Greek and Roman"
      },
      "exclusiveTo": "Atlas Stationers",
      "color": {
        "rgb": [
          24,
          123,
          178
        ],
        "p": "2183 U"
      },
      "properties": [
        "Glistening"
      ],
      "glitterColors": [
        "Green"
      ],
      "notes": [
        "Wearingeul’s color guide directs this exclusive to Atlas Stationers. RGB and P are transcribed from the packaging photo; a manufacturer product code was not found."
      ]
    }
  },
  {
    "id": "651db7fc-c629-48f4-bc87-897f8c437286",
    "brand": "Wearingeul",
    "details": "Golden sparkle over a clear mint-blue pastel evokes stars reflected in dew and an imagined, dreamlike sky.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=421"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/c851501429eb8.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "651db7fc-c629-48f4-bc87-897f8c437286",
      "name": "Dewy Starlight",
      "productCode": "100KGBU",
      "inspiration": {
        "author": "Lee Yuk sa",
        "work": "Solar Eclipse",
        "series": "Korean Literature"
      },
      "color": {
        "rgb": [
          103,
          192,
          196
        ],
        "p": "629U"
      },
      "properties": [
        "Glistening",
        "Shading"
      ],
      "glitterColors": [
        "Gold"
      ]
    }
  },
  {
    "id": "ink_56",
    "brand": "Wearingeul",
    "details": "A velvety crimson evokes a vampire’s bite in the dark. Blue shimmer gives the rich red an icy contrast, reflecting the novel’s mystery and the feeling of a heart slowly growing cold.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=599"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/2343de190620a.jpg?w=1920"
      },
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      }
    ],
    "reference": {
      "inkId": "ink_56",
      "name": "Dracula",
      "productCode": "121WGRE",
      "inspiration": {
        "author": "Bram Stoker",
        "work": "Dracula",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          117,
          0,
          28
        ],
        "p": "207 U"
      },
      "properties": [
        "Glistening",
        "Sheen"
      ],
      "glitterColors": [
        "Blue"
      ],
      "colorGuideProperties": [
        "Shading",
        "Glistening",
        "Sheen"
      ],
      "notes": [
        "The product sheet and color guide list different effects; the displayed properties follow the product sheet."
      ]
    }
  },
  {
    "id": "ink_57",
    "brand": "Wearingeul",
    "details": "Inspired by the Sumerian deity of water and wisdom, this blue ink separates into violet tones. Golden sparkle recalls sunlight moving across flowing water.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=725"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/8b8cbd1969737.jpg?w=1920"
      },
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      }
    ],
    "reference": {
      "inkId": "ink_57",
      "name": "Enki",
      "productCode": "129WGBU",
      "inspiration": {
        "author": null,
        "work": null,
        "series": "World Myth — Sumerian"
      },
      "color": {
        "rgb": [
          61,
          133,
          193
        ],
        "p": "2122U"
      },
      "properties": [
        "Glistening",
        "Color Change"
      ],
      "glitterColors": [
        "Gold"
      ],
      "colorGuideProperties": [
        "Shading",
        "Color Shading",
        "Glistening"
      ],
      "notes": [
        "The product sheet and color guide list different effects; the displayed properties follow the product sheet."
      ]
    }
  },
  {
    "id": "ink_62",
    "brand": "Wearingeul",
    "details": "An underworld black represents Hades, ruler of the dead. Cold blue sparkle adds a restrained, otherworldly beauty to the dark base.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1054"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/49cac6e208e9b.jpg?w=1920"
      },
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      }
    ],
    "reference": {
      "inkId": "ink_62",
      "name": "Hades",
      "productCode": "152WSBR",
      "inspiration": {
        "author": null,
        "work": null,
        "series": "World Myth — Greek and Roman"
      },
      "color": {
        "rgb": [
          53,
          54,
          58
        ],
        "p": "4280U"
      },
      "properties": [
        "Shading",
        "Glistening"
      ],
      "glitterColors": [
        "Frozen blue"
      ],
      "colorGuideProperties": [
        "Glistening"
      ],
      "notes": [
        "The product sheet and color guide list different effects; the displayed properties follow the product sheet."
      ]
    }
  },
  {
    "id": "36b696cf-eaac-442e-af68-66ad21e4fffb",
    "brand": "Wearingeul",
    "details": "Clear periwinkle and warm gold sparkle reflect Cedric’s kind heart and noble bearing, echoing the idea of making the world better through one’s life.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1211"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/6aad79ea6c3a7.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "36b696cf-eaac-442e-af68-66ad21e4fffb",
      "name": "Little Lord Fauntleroy",
      "productCode": "178WGBU",
      "inspiration": {
        "author": "Frances Hodgson Burnett",
        "work": "Little Lord Fauntleroy",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          106,
          135,
          216
        ],
        "p": "2718U"
      },
      "properties": [
        "Shading",
        "Glistening"
      ],
      "glitterColors": [
        "Gold"
      ]
    }
  },
  {
    "id": "ink_64",
    "brand": "Wearingeul",
    "details": "Transparent pale blue opens into pink, with blue and silver sparkle suggesting heavenly light. The ink reflects Dante’s paradise, its luminous rivers, and the love that gives the cosmos motion.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1203"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/51a6929e7600b.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "ink_64",
      "name": "Paradiso",
      "productCode": "173WGGY",
      "inspiration": {
        "author": "Dante Alighieri",
        "work": "La Divina Commedia",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          128,
          195,
          224
        ],
        "p": "291U"
      },
      "properties": [
        "Color Shading",
        "Shading",
        "Glistening"
      ],
      "glitterColors": [
        "Blue",
        "Silver"
      ]
    }
  },
  {
    "id": "ink_60",
    "brand": "Wearingeul",
    "details": "Lively emerald and mint tones, hints of yellow, and gold sparkle capture Pinocchio’s curiosity, mischief, and restless energy.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1067"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/1a8e599357d6e.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "ink_60",
      "name": "Pinocchio",
      "productCode": "151WGGN",
      "inspiration": {
        "author": "Carlo Collodi",
        "work": "The Adventures of Pinocchio",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          0,
          156,
          116
        ],
        "p": "338U"
      },
      "properties": [
        "Shading",
        "Glistening",
        "Color Shading"
      ],
      "glitterColors": [
        "Gold"
      ],
      "notes": [
        "The product sheet spells the author “Carlo Cillodi”; the author name is normalized to Carlo Collodi."
      ]
    }
  },
  {
    "id": "ink_67",
    "brand": "Wearingeul",
    "details": "Separating ocean blue and island green create a distinct boundary, evoking the isolated shore encountered by the castaway Robinson Crusoe.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=722"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/1af962feb69fa.jpg?w=1920"
      },
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      }
    ],
    "reference": {
      "inkId": "ink_67",
      "name": "Robinson Crusoe",
      "productCode": "136WSBU",
      "inspiration": {
        "author": "Daniel Defoe",
        "work": "Robinson Crusoe",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          0,
          145,
          167
        ],
        "p": "2229U"
      },
      "properties": [
        "Shading"
      ],
      "glitterColors": [],
      "colorGuideProperties": [
        "Shading",
        "Color Shading"
      ],
      "notes": [
        "The product sheet and color guide list different effects; the displayed properties follow the product sheet."
      ]
    }
  },
  {
    "id": "ink_66",
    "brand": "Wearingeul",
    "details": "A dark navy recalls the sea’s cold depths. Violet sparkle represents a persistent flame of vengeance, set against the novel’s themes of patience and hope.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1206"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/db8eb522541f2.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "ink_66",
      "name": "The Count of Monte Cristo",
      "productCode": "176WGBU",
      "inspiration": {
        "author": "Alexandre Dumas",
        "work": "The Count of Monte Cristo",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          39,
          54,
          145
        ],
        "p": "Blue 072U"
      },
      "properties": [
        "Glistening",
        "Shading",
        "Sheen"
      ],
      "glitterColors": [
        "Violet"
      ]
    }
  },
  {
    "id": "ink_63",
    "brand": "Wearingeul",
    "details": "Pink and green separate as the ink dries beneath silver and blue sparkle. The interplay reflects Hesse’s imagined synthesis of music, mathematics, philosophy, and art into a harmonious whole.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1192"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/d0d69b04530a4.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "ink_63",
      "name": "The Glass Bead Game",
      "productCode": "174WGPK",
      "inspiration": {
        "author": "Hermann Hesse",
        "work": "The Glass Bead Game",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          200,
          156,
          182
        ],
        "p": "530U"
      },
      "properties": [
        "Glistening",
        "Color Shading",
        "Shading"
      ],
      "glitterColors": [
        "Silver",
        "Blue"
      ]
    }
  },
  {
    "id": "5400c69c-d66a-4e64-8d53-9f1b05124a15",
    "brand": "Wearingeul",
    "details": "Sea-aquamarine and silver sparkle evoke the mermaid’s scales. The dreamy color expresses the tenderness and lingering sadness of love left unspoken.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=1376"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/b7a57351b282b.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "5400c69c-d66a-4e64-8d53-9f1b05124a15",
      "name": "The Little Mermaid",
      "productCode": "195WGBU",
      "inspiration": {
        "author": "Hans Christian Andersen",
        "work": "The Little Mermaid",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          100,
          177,
          191
        ],
        "p": "7709U"
      },
      "properties": [
        "Glistening",
        "Color Shading",
        "Shading"
      ],
      "glitterColors": [
        "Silver"
      ]
    }
  },
  {
    "id": "29e98327-ff17-4f74-a17b-4cf86d7cb160",
    "brand": "Wearingeul",
    "details": "A glistening ink in Wearingeul’s William Shakespeare collection, named for Twelfth Night and made exclusively for Atlas Stationers.",
    "sources": [
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      },
      {
        "label": "Atlas Stationers product page",
        "url": "https://www.atlasstationers.com/products/wearingeul-twelfth-night-30ml-bottled-ink-atlas-exclusive"
      },
      {
        "label": "Manufacturer bottle via Atlas Stationers",
        "url": "https://www.atlasstationers.com/cdn/shop/products/TwelfthNight00.jpg?v=1694722600&width=1500"
      }
    ],
    "reference": {
      "inkId": "29e98327-ff17-4f74-a17b-4cf86d7cb160",
      "name": "Twelfth Night",
      "productCode": "098WGPK",
      "inspiration": {
        "author": "William Shakespeare",
        "work": "Twelfth Night",
        "series": "World Literature"
      },
      "exclusiveTo": "Atlas Stationers",
      "color": {
        "rgb": null,
        "p": null
      },
      "properties": [
        "Glistening"
      ],
      "glitterColors": [],
      "notes": [
        "Wearingeul’s color guide links to Atlas Stationers. The linked product page has no ink-specific story or verified RGB/P values; its SKU supplies the product code."
      ]
    }
  },
  {
    "id": "0bba4e52-8916-4ab0-8499-5b88449df5e4",
    "brand": "Wearingeul",
    "details": "An aqua-green base with strong shading, red sheen, and violet sparkle represents growing suspicion and an unsettled view of human nature.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=359"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/b77dc970bdf6a.jpg?w=1920"
      }
    ],
    "reference": {
      "inkId": "0bba4e52-8916-4ab0-8499-5b88449df5e4",
      "name": "Wayfarer",
      "productCode": "085WGGN",
      "inspiration": {
        "author": "Natsume Soseki",
        "work": "Wayfarer",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          0,
          100,
          102
        ],
        "p": "2231U"
      },
      "properties": [
        "Glistening",
        "Shading",
        "Sheen"
      ],
      "glitterColors": [
        "Violet"
      ]
    }
  },
  {
    "id": "ink_58",
    "brand": "Wearingeul",
    "details": "A pale sky blue develops distinct baby-pink areas as it dries. Silver and blue sparkle bring to mind Wendy’s adventures in Neverland.",
    "sources": [
      {
        "label": "Wearingeul product page",
        "url": "https://www.wearingeul.com/all/?idx=888"
      },
      {
        "label": "Wearingeul product sheet",
        "url": "https://cdn-optimized.imweb.me/upload/S201904175cb6a3e9e9ca9/119eb1ae5e73b.jpg?w=1920"
      },
      {
        "label": "Wearingeul color guide",
        "url": "https://www.wearingeul.com/Colors"
      }
    ],
    "reference": {
      "inkId": "ink_58",
      "name": "Wendy Darling",
      "productCode": "145WGBU",
      "inspiration": {
        "author": "James M. Barrie",
        "work": "Peter and Wendy",
        "series": "World Literature"
      },
      "color": {
        "rgb": [
          164,
          200,
          234
        ],
        "p": "278U"
      },
      "properties": [
        "Glistening",
        "Shading"
      ],
      "glitterColors": [
        "Silver",
        "Blue"
      ],
      "colorGuideProperties": [
        "Shading",
        "Color Shading",
        "Glistening"
      ],
      "notes": [
        "The product sheet and color guide list different effects; the displayed properties follow the product sheet."
      ]
    }
  },
  {
    "id": "ink_35",
    "brand": "Pilot",
    "details": "Vivid blue inspired by a wide, cloudless summer sky. Its clear cerulean color is one of the original blues in the Iroshizuku range.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-kon-peki-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      },
      {
        "label": "Pilot Japan · Iroshizuku history",
        "url": "https://www.pilot.co.jp/press_release/2024/09/02/post_133.html",
        "supports": [
          "description"
        ]
      }
    ],
    "reference": {
      "inkId": "ink_35",
      "name": "Kon-Peki",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "紺碧",
        "reading": "コンペキ",
        "meaning": "Deep cerulean blue",
        "aliases": [
          "Cerulean"
        ]
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-kon-peki-ink",
        "dryTimeSeconds": 15,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "low",
        "sheen": "Low pink sheen on Tomoe River paper",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "ink_36",
    "brand": "Pilot",
    "details": "A luminous yellow-green inspired by the faint glow of fireflies. Pilot describes a yellow tinged with green; Vanness sees bright chartreuse with warm yellow tones.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/copy-of-pilot-iroshizuku-hotarubi-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      },
      {
        "label": "Pilot Japan · 2021 color inspiration",
        "url": "https://www.pilot.co.jp/press_release/2021/12/06/post_99.html",
        "supports": [
          "description"
        ]
      }
    ],
    "reference": {
      "inkId": "ink_36",
      "name": "Hotaru-Bi",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "蛍火",
        "reading": "ホタルビ",
        "meaning": "Light of fireflies",
        "aliases": [
          "Firefly glow"
        ]
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/copy-of-pilot-iroshizuku-hotarubi-ink",
        "dryTimeSeconds": 20,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "average",
        "shading": "medium",
        "sheen": "No",
        "shimmer": false,
        "waterResistance": "low",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "ink_37",
    "brand": "Pilot",
    "details": "Bright red autumn foliage gives Momiji its name and inspiration. Vanness describes the ink as a vivid red with pink tones.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-momiji-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "ink_37",
      "name": "Momiji",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "紅葉",
        "reading": "モミジ",
        "meaning": "Autumn leaves",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-momiji-ink",
        "dryTimeSeconds": 15,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "average",
        "shading": "low",
        "sheen": "A bit of gold sheen on Tomoe River paper",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "21ebe10b-60e8-4a1a-931d-a4c9beacf17b",
    "brand": "Pilot",
    "details": "Pilot’s standard Blue is a classic medium blue for everyday fountain-pen writing. Vanness observes moderate shading, with copper sheen appearing in heavily inked swabs.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/pilot-blue-ink",
        "supports": [
          "description",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      }
    ],
    "reference": {
      "inkId": "21ebe10b-60e8-4a1a-931d-a4c9beacf17b",
      "name": "Blue",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Pilot standard ink"
      },
      "nameOrigin": null,
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/pilot-blue-ink",
        "dryTimeSeconds": 30,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "average",
        "shading": "medium",
        "sheen": "Copper sheen in large swabs only",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": [
        "The inventory does not specify bottle or cartridge format. This entry uses Vanness’s standard Pilot Blue page; no packaging variant is assumed.",
        "Vanness’s table and opening paragraph report average flow, while a bullet says slightly wet. The structured observation follows the table."
      ]
    }
  },
  {
    "id": "7a763691-6cb5-4aaf-a8e9-52a5fa78c071",
    "brand": "Pilot",
    "details": "A light, summery blue recalling an entirely clear sky. The inspiration is open blue overhead, without even a trace of cloud.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-ama-iro-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "7a763691-6cb5-4aaf-a8e9-52a5fa78c071",
      "name": "Ama-Iro",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "天色",
        "reading": "アマイロ",
        "meaning": "Sky blue",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-ama-iro-ink",
        "dryTimeSeconds": 15,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "Pink sheen in large swabs only",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "072680d2-3159-41f8-abfd-ab4405173390",
    "brand": "Pilot",
    "details": "A rich blue inspired by freshly opened morning glory flowers, a familiar sight in the Japanese summer. Vanness describes a dark blue suitable for everyday writing.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-asa-gao-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "072680d2-3159-41f8-abfd-ab4405173390",
      "name": "Asa-Gao",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "朝顔",
        "reading": "アサガオ",
        "meaning": "Morning glory",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-asa-gao-ink",
        "dryTimeSeconds": 15,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "Copper sheen in large swabs only",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "0ef1725f-3c1c-4d13-a10b-f474d63e9feb",
    "brand": "Pilot",
    "details": "A medium blue inspired by snow crystals falling from a crisp winter sky. Pilot introduced Rikka in 2024 to evoke the stillness and beauty of that winter scene.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/pilot-iroshizuku-rikka-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Japan · 2024 color inspiration",
        "url": "https://www.pilot.co.jp/press_release/2024/09/02/post_133.html",
        "supports": [
          "description"
        ]
      }
    ],
    "reference": {
      "inkId": "0ef1725f-3c1c-4d13-a10b-f474d63e9feb",
      "name": "Rikka",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "六花",
        "reading": "リッカ",
        "meaning": "Snow crystal",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/pilot-iroshizuku-rikka-ink",
        "dryTimeSeconds": 20,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "average",
        "shading": "medium",
        "sheen": "Low pink sheen on Tomoe River paper",
        "shimmer": false,
        "waterResistance": "medium",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "578b0fe8-5cad-4f72-89dc-a4834d395789",
    "brand": "Pilot",
    "details": "A blue with violet tones inspired by hydrangeas during the rainy season. The image behind the color is rain gathering on the flower’s petals.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-ajisai-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "578b0fe8-5cad-4f72-89dc-a4834d395789",
      "name": "Ajisai",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "紫陽花",
        "reading": "アジサイ",
        "meaning": "Hydrangea",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-ajisai-ink",
        "dryTimeSeconds": 15,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "Copper sheen in large swabs only",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "02b23862-6f58-4c69-8b39-a2e8ae3a6af3",
    "brand": "Pilot",
    "details": "A deep blue evoking a night sky softly lit by the moon. Vanness describes dark blue in its prose and classifies the ink as blue-black in its table.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-tsuki-yo-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "02b23862-6f58-4c69-8b39-a2e8ae3a6af3",
      "name": "Tsuki-Yo",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "月夜",
        "reading": "ツキヨ",
        "meaning": "Moonlight",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-tsuki-yo-ink",
        "dryTimeSeconds": 30,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "Little bit of red sheen on Tomoe River Paper",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "3249ce3c-a99b-4893-ac35-fe981ad03ac1",
    "brand": "Pilot",
    "details": "An orange inspired by the glow of an evening sky at sunset. Vanness describes a medium orange with noticeable variation between lighter and darker strokes.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-yu-yake-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "3249ce3c-a99b-4893-ac35-fe981ad03ac1",
      "name": "Yu-Yake",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "夕焼け",
        "reading": "ユウヤケ",
        "meaning": "Sunset",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-yu-yake-ink",
        "dryTimeSeconds": 20,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "No",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "83f60264-ea54-473f-b249-8dfbad46ffd4",
    "brand": "Pilot",
    "details": "Inspired by the rich green glow of an emerald gemstone. Pilot emphasizes deep green, while Vanness describes the ink’s color as a deep teal.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/pilot-iroshizuku-sui-gyoku-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      },
      {
        "label": "Pilot Japan · 2021 color inspiration",
        "url": "https://www.pilot.co.jp/press_release/2021/12/06/post_99.html",
        "supports": [
          "description"
        ]
      }
    ],
    "reference": {
      "inkId": "83f60264-ea54-473f-b249-8dfbad46ffd4",
      "name": "Sui-Gyoku",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "翠玉",
        "reading": "スイギョク",
        "meaning": "Emerald",
        "aliases": [
          "Emerald green"
        ]
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/pilot-iroshizuku-sui-gyoku-ink",
        "dryTimeSeconds": 40,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "average",
        "shading": "medium",
        "sheen": "Low red sheen",
        "shimmer": false,
        "waterResistance": "medium",
        "ironGall": false,
        "pigment": false
      },
      "notes": [
        "Vanness’s prose describes deep shading; its table rates shading as medium. The structured observation follows the table."
      ]
    }
  },
  {
    "id": "0c05b68c-2500-4867-9b48-5a6d31874723",
    "brand": "Pilot",
    "details": "A blue-green inspired by the vivid colors of peacock feathers. Vanness describes a medium teal, with red sheen adding another color where ink gathers.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-ku-jaku-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "0c05b68c-2500-4867-9b48-5a6d31874723",
      "name": "Ku-Jaku",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "孔雀",
        "reading": "クジャク",
        "meaning": "Peacock",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-ku-jaku-ink",
        "dryTimeSeconds": 20,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "Medium red sheen",
        "shimmer": false,
        "waterResistance": "medium",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "890a5fc1-8c68-49d9-a8be-0be6461bd13a",
    "brand": "Pilot",
    "details": "A dark teal inspired by a drop of dew reflecting pine needles. The evergreen pine brings an association with lasting constancy to the color’s story.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-syo-ro-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "890a5fc1-8c68-49d9-a8be-0be6461bd13a",
      "name": "Syo-Ro",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "松露",
        "reading": "ショウロ",
        "meaning": "Dew on pine tree",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-syo-ro-ink",
        "dryTimeSeconds": 30,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "Low red sheen",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "29d91b77-48b2-4b4d-b638-c46b05e1dc62",
    "brand": "Pilot",
    "details": "A subdued blue-black inspired by the ocean’s depths, beyond the reach of sunlight. Vanness describes a medium blue-black with shading and red sheen on Tomoe River paper.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-shin-kai-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "29d91b77-48b2-4b4d-b638-c46b05e1dc62",
      "name": "Shin-Kai",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "深海",
        "reading": "シンカイ",
        "meaning": "Deep sea",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-shin-kai-ink",
        "dryTimeSeconds": 15,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "Some red sheen on Tomoe River paper",
        "shimmer": false,
        "waterResistance": "medium",
        "ironGall": false,
        "pigment": false
      },
      "notes": []
    }
  },
  {
    "id": "b4db9005-7216-47d5-9397-71fe0ca5a2a0",
    "brand": "Pilot",
    "details": "A medium purple inspired by the richly colored berries of Japanese beautyberry. The ink’s botanical inspiration is the shrub and its purple fruit.",
    "sources": [
      {
        "label": "Vanness product page",
        "url": "https://vanness1938.com/products/iroshizuku-murasaki-shikibu-ink",
        "supports": [
          "description",
          "nameOrigin.meaning",
          "writing",
          "countryOfOrigin",
          "limitedEdition"
        ]
      },
      {
        "label": "Pilot Japan catalog · Japanese names",
        "url": "https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004",
        "supports": [
          "nameOrigin.japanese",
          "nameOrigin.reading"
        ]
      },
      {
        "label": "Pilot Australia · name meanings",
        "url": "https://pilotpen.com.au/ranges/iroshizuku",
        "supports": [
          "nameOrigin.meaning",
          "nameOrigin.aliases"
        ]
      }
    ],
    "reference": {
      "inkId": "b4db9005-7216-47d5-9397-71fe0ca5a2a0",
      "name": "Murasaki-Shikibu",
      "productCode": null,
      "inspiration": {
        "author": null,
        "work": null,
        "series": "Iroshizuku"
      },
      "nameOrigin": {
        "japanese": "紫式部",
        "reading": "ムラサキシキブ",
        "meaning": "Japanese beautyberry",
        "aliases": []
      },
      "properties": [],
      "glitterColors": [],
      "countryOfOrigin": "Japan",
      "limitedEdition": false,
      "writing": {
        "sourceUrl": "https://vanness1938.com/products/iroshizuku-murasaki-shikibu-ink",
        "dryTimeSeconds": 15,
        "testPen": "Pilot Vanishing Point, medium nib",
        "testPaper": "Rhodia",
        "flow": "wet",
        "shading": "medium",
        "sheen": "A bit of gold sheen in large swabs",
        "shimmer": false,
        "waterResistance": "no",
        "ironGall": false,
        "pigment": false
      },
      "notes": [
        "Vanness mentions gold sheen on Tomoe River paper in its prose and in large swabs in its table. Both qualifiers are retained here."
      ]
    }
  }
]'::jsonb) loop
  if exists(select 1 from public.inks) and not exists(select 1 from public.inks where id=r->>'id') then raise exception 'Missing reference inventory ID %',r->>'id'; end if;
  if exists(select 1 from public.inks where id=r->>'id' and brand<>r->>'brand') then raise exception 'Reference brand mismatch for %',r->>'id'; end if;
  update public.inks set details=r->>'details',sources=r->'sources',reference=r->'reference' where id=r->>'id' and brand=r->>'brand';
 end loop;
 for r in select value from jsonb_array_elements('[
  {
    "id": "ink_1",
    "brand": "Diamine",
    "swatch": {
      "name": "Happy Holidays",
      "url": "https://inkswatch.com/ink.html?inkId=1274",
      "hex": "#404898",
      "note": null
    }
  },
  {
    "id": "ink_2",
    "brand": "Diamine",
    "swatch": {
      "name": "Jack Frost",
      "url": "https://inkswatch.com/ink.html?inkId=1092",
      "hex": "#31438c",
      "note": null
    }
  },
  {
    "id": "ink_3",
    "brand": "Diamine",
    "swatch": {
      "name": "Polar Glow",
      "url": "https://inkswatch.com/ink.html?inkId=1303",
      "hex": "#414171",
      "note": null
    }
  },
  {
    "id": "ink_4",
    "brand": "Diamine",
    "swatch": {
      "name": "Winter Miracle",
      "url": "https://inkswatch.com/ink.html?inkId=1275",
      "hex": "#4d2965",
      "note": null
    }
  },
  {
    "id": "ink_5",
    "brand": "Diamine",
    "swatch": {
      "name": "Holly",
      "url": "https://inkswatch.com/ink.html?inkId=1664",
      "hex": "#39586b",
      "note": null
    }
  },
  {
    "id": "ink_6",
    "brand": "Diamine",
    "swatch": {
      "name": "Blue Peppermint",
      "url": "https://inkswatch.com/ink.html?inkId=2042",
      "hex": "#02a09a",
      "note": null
    }
  },
  {
    "id": "ink_7",
    "brand": "Diamine",
    "swatch": {
      "name": "Garland",
      "url": "https://inkswatch.com/ink.html?inkId=1621",
      "hex": "#202c32",
      "note": null
    }
  },
  {
    "id": "ink_8",
    "brand": "Diamine",
    "swatch": {
      "name": "Subzero",
      "url": "https://inkswatch.com/ink.html?inkId=1637",
      "hex": "#00748c",
      "note": null
    }
  },
  {
    "id": "ink_9",
    "brand": "Diamine",
    "swatch": {
      "name": "Winter Spice",
      "url": "https://inkswatch.com/ink.html?inkId=1625",
      "hex": "#35281d",
      "note": null
    }
  },
  {
    "id": "ink_10",
    "brand": "Diamine",
    "swatch": {
      "name": "Arctic Blast",
      "url": "https://inkswatch.com/ink.html?inkId=1871",
      "hex": "#0c3880",
      "note": null
    }
  },
  {
    "id": "ink_11",
    "brand": "Diamine",
    "swatch": {
      "name": "Serendipity",
      "url": "https://inkswatch.com/ink.html?inkId=1867",
      "hex": "#233345",
      "note": null
    }
  },
  {
    "id": "ink_12",
    "brand": "Diamine",
    "swatch": {
      "name": "Spiced Apple",
      "url": "https://inkswatch.com/ink.html?inkId=1856",
      "hex": "#883828",
      "note": null
    }
  },
  {
    "id": "ink_13",
    "brand": "Diamine",
    "swatch": {
      "name": "Solar Storm",
      "url": "https://inkswatch.com/ink.html?inkId=1552",
      "hex": "#ff9a42",
      "note": null
    }
  },
  {
    "id": "ink_14",
    "brand": "Diamine",
    "swatch": {
      "name": "Upon a Star",
      "url": "https://inkswatch.com/ink.html?inkId=1864",
      "hex": "#2a3642",
      "note": null
    }
  },
  {
    "id": "ink_15",
    "brand": "Diamine",
    "swatch": {
      "name": "Astral",
      "url": "https://inkswatch.com/ink.html?inkId=2446",
      "hex": "#1f1f1f",
      "note": null
    }
  },
  {
    "id": "ink_16",
    "brand": "Diamine",
    "swatch": {
      "name": "Glacier",
      "url": "https://inkswatch.com/ink.html?inkId=2437",
      "hex": "#446b83",
      "note": null
    }
  },
  {
    "id": "ink_17",
    "brand": "Diamine",
    "swatch": {
      "name": "Raise A Glass",
      "url": "https://inkswatch.com/ink.html?inkId=2451",
      "hex": "#382838",
      "note": null
    }
  },
  {
    "id": "ink_18",
    "brand": "Diamine",
    "swatch": {
      "name": "Frosted Orchid",
      "url": "https://inkswatch.com/ink.html?inkId=1326",
      "hex": "#805870",
      "note": null
    }
  },
  {
    "id": "ink_19",
    "brand": "Diamine",
    "swatch": {
      "name": "Golden Ivy",
      "url": "https://inkswatch.com/ink.html?inkId=135",
      "hex": "#386e3e",
      "note": null
    }
  },
  {
    "id": "ink_20",
    "brand": "Diamine",
    "swatch": {
      "name": "Golden Oasis",
      "url": "https://inkswatch.com/ink.html?inkId=1327",
      "hex": "#6bbb4c",
      "note": null
    }
  },
  {
    "id": "ink_21",
    "brand": "Diamine",
    "swatch": {
      "name": "Golden Sands",
      "url": "https://inkswatch.com/ink.html?inkId=1053",
      "hex": "#c27a38",
      "note": null
    }
  },
  {
    "id": "ink_22",
    "brand": "Diamine",
    "swatch": {
      "name": "Night Sky",
      "url": "https://inkswatch.com/ink.html?inkId=456",
      "hex": "#424242",
      "note": null
    }
  },
  {
    "id": "ink_23",
    "brand": "Diamine",
    "swatch": {
      "name": "Pink Glitz",
      "url": "https://inkswatch.com/ink.html?inkId=1332",
      "hex": "#e3475a",
      "note": null
    }
  },
  {
    "id": "ink_24",
    "brand": "Diamine",
    "swatch": {
      "name": "Shimmering Seas",
      "url": "https://inkswatch.com/ink.html?inkId=469",
      "hex": "#484860",
      "note": null
    }
  },
  {
    "id": "ink_25",
    "brand": "Ferris Wheel Press",
    "swatch": {
      "name": "Stroke of Midnight",
      "url": "https://inkswatch.com/ink.html?inkId=2465",
      "hex": "#3c3c44",
      "note": null
    }
  },
  {
    "id": "ink_26",
    "brand": "Jacques Herbin",
    "swatch": {
      "name": "Emerald of Chivor",
      "url": "https://inkswatch.com/ink.html?inkId=330",
      "hex": "#325a69",
      "note": null
    }
  },
  {
    "id": "ink_27",
    "brand": "Jacques Herbin",
    "swatch": {
      "name": "Kyanite du Nepal",
      "url": "https://inkswatch.com/ink.html?inkId=297",
      "hex": "#0878c0",
      "note": null
    }
  },
  {
    "id": "ink_28",
    "brand": "Jacques Herbin",
    "swatch": {
      "name": "Fuchsia de Magellan",
      "url": "https://inkswatch.com/ink.html?inkId=2778",
      "hex": "#e3487b",
      "note": null
    }
  },
  {
    "id": "ink_29",
    "brand": "Jacques Herbin",
    "swatch": {
      "name": "Rouge Hematite",
      "url": "https://inkswatch.com/ink.html?inkId=268",
      "hex": "#eb6b38",
      "note": null
    }
  },
  {
    "id": "ink_30",
    "brand": "KWZ",
    "swatch": {
      "name": "Sheen Machine 1",
      "url": "https://inkswatch.com/ink.html?inkId=599",
      "hex": "#2e6a78",
      "note": null
    }
  },
  {
    "id": "ink_31",
    "brand": "KWZ",
    "swatch": {
      "name": "Sheen Machine 2",
      "url": "https://inkswatch.com/ink.html?inkId=599",
      "hex": "#2e6a78",
      "note": null
    }
  },
  {
    "id": "ink_32",
    "brand": "Monteverde",
    "swatch": {
      "name": "California Teal",
      "url": "https://inkswatch.com/ink.html?inkId=141",
      "hex": "#037050",
      "note": null
    }
  },
  {
    "id": "ink_33",
    "brand": "Organics Studio",
    "swatch": {
      "name": "Nitrogen",
      "url": "https://inkswatch.com/ink.html?inkId=381",
      "hex": "#3a65cc",
      "note": null
    }
  },
  {
    "id": "ink_34",
    "brand": "Organics Studio",
    "swatch": {
      "name": "Walden",
      "url": "https://inkswatch.com/ink.html?inkId=1244",
      "hex": "#657db5",
      "note": null
    }
  },
  {
    "id": "ink_35",
    "brand": "Pilot",
    "swatch": {
      "name": "Kon-Peki",
      "url": "https://inkswatch.com/ink.html?inkId=776",
      "hex": "#156ab2",
      "note": null
    }
  },
  {
    "id": "ink_36",
    "brand": "Pilot",
    "swatch": {
      "name": "Hotaru-Bi",
      "url": "https://inkswatch.com/ink.html?inkId=1795",
      "hex": "#c7af1a",
      "note": null
    }
  },
  {
    "id": "ink_37",
    "brand": "Pilot",
    "swatch": {
      "name": "Momiji",
      "url": "https://inkswatch.com/ink.html?inkId=528",
      "hex": "#e34343",
      "note": null
    }
  },
  {
    "id": "ink_38",
    "brand": "Robert Oster",
    "swatch": {
      "name": "Rose Gold Antiqua",
      "url": "https://inkswatch.com/ink.html?inkId=2057",
      "hex": "#8f494f",
      "note": null
    }
  },
  {
    "id": "ink_39",
    "brand": "Robert Oster",
    "swatch": {
      "name": "Violet Clouds",
      "url": "https://inkswatch.com/ink.html?inkId=2058",
      "hex": "#7a5f77",
      "note": null
    }
  },
  {
    "id": "ink_40",
    "brand": "Sailor",
    "swatch": {
      "name": "Haha",
      "url": "https://inkswatch.com/ink.html?inkId=675",
      "hex": "#88d0d8",
      "note": null
    }
  },
  {
    "id": "ink_41",
    "brand": "Sailor",
    "swatch": {
      "name": "Koke",
      "url": "https://inkswatch.com/ink.html?inkId=1385",
      "hex": "#9a822b",
      "note": null
    }
  },
  {
    "id": "ink_42",
    "brand": "Sailor",
    "swatch": {
      "name": "Nekoyanagi",
      "url": "https://inkswatch.com/ink.html?inkId=677",
      "hex": "#b8b7f1",
      "note": null
    }
  },
  {
    "id": "ink_43",
    "brand": "Sailor",
    "swatch": {
      "name": "Yuki-Akari",
      "url": "https://inkswatch.com/ink.html?inkId=681",
      "hex": "#61f0f9",
      "note": null
    }
  },
  {
    "id": "ink_44",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Vesper Blue Bisperas 1669",
      "url": "https://inkswatch.com/ink.html?inkId=935",
      "hex": "#8cb4bc",
      "note": null
    }
  },
  {
    "id": "ink_45",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Jewel Green Parol 1908",
      "url": "https://inkswatch.com/ink.html?inkId=2130",
      "hex": "#618141",
      "note": null
    }
  },
  {
    "id": "ink_46",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Cosmic Blue Shimmer Kosmos 1955",
      "url": "https://inkswatch.com/ink.html?inkId=2574",
      "hex": "#1b2670",
      "note": null
    }
  },
  {
    "id": "ink_47",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Blue Blood Dugong Bughaw 1521",
      "url": "https://inkswatch.com/ink.html?inkId=392",
      "hex": "#2f40a3",
      "note": null
    }
  },
  {
    "id": "ink_48",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Malayan Apple Makopa 1938",
      "url": "https://inkswatch.com/ink.html?inkId=936",
      "hex": "#e42cc2",
      "note": null
    }
  },
  {
    "id": "ink_49",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Night Sky Tala 1980 [SAMPLE]",
      "url": "https://inkswatch.com/ink.html?inkId=937",
      "hex": "#30435b",
      "note": null
    }
  },
  {
    "id": "ink_50",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Pastel Blue Julio 1991",
      "url": "https://inkswatch.com/ink.html?inkId=2123",
      "hex": "#285838",
      "note": null
    }
  },
  {
    "id": "ink_51",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Plume Salimbay 1949",
      "url": "https://inkswatch.com/ink.html?inkId=1779",
      "hex": "#828ad3",
      "note": null
    }
  },
  {
    "id": "ink_52",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Sea and Sky Lakbay 1861",
      "url": "https://inkswatch.com/ink.html?inkId=1780",
      "hex": "#79a1b4",
      "note": null
    }
  },
  {
    "id": "ink_53",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Sodalite Kislap 1891",
      "url": "https://inkswatch.com/ink.html?inkId=1506",
      "hex": "#7a8a92",
      "note": null
    }
  },
  {
    "id": "ink_54",
    "brand": "Van Dieman",
    "swatch": {
      "name": "Parrot Fish",
      "url": "https://inkswatch.com/ink.html?inkId=1519",
      "hex": "#008f87",
      "note": null
    }
  },
  {
    "id": "ink_55",
    "brand": "Pelikan",
    "swatch": {
      "name": "Golden Lapis",
      "url": "https://www.thewritersarmory.com/blog/pelikan-edelstein-golden-lapis",
      "hex": "#1d62bc",
      "note": "Approximate median RGB sampled from the central swatch in The Writer''s Armory Golden Lapis scan (20-80% width, 27-90% height), verified 2026-09-06. Represents the blue base; gold shimmer is not represented by a single hex. Previous reference incorrectly matched Noodler''s Legal Lapis."
    }
  },
  {
    "id": "ink_56",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Bram Stoker Dracula",
      "url": "https://inkswatch.com/ink.html?inkId=2635",
      "hex": "#b82040",
      "note": null
    }
  },
  {
    "id": "ink_57",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Enki",
      "url": "https://inkswatch.com/ink.html?inkId=2636",
      "hex": "#9ab2ca",
      "note": null
    }
  },
  {
    "id": "ink_58",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Wendy Darling",
      "url": "https://inkswatch.com/ink.html?inkId=2616",
      "hex": "#d6e6f5",
      "note": null
    }
  },
  {
    "id": "ink_59",
    "brand": "Wearingeul",
    "swatch": {
      "name": "A Little Princess",
      "url": "https://inkswatch.com/ink.html?inkId=1357",
      "hex": "#bd55b1",
      "note": null
    }
  },
  {
    "id": "ink_60",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Pinocchio",
      "url": "https://inkswatch.com/ink.html?inkId=894",
      "hex": "#383656",
      "note": null
    }
  },
  {
    "id": "ink_61",
    "brand": "Wearingeul",
    "swatch": {
      "name": "20000 Leagues Under the Sea",
      "url": "https://inkswatch.com/ink.html?inkId=1522",
      "hex": "#f8936e",
      "note": null
    }
  },
  {
    "id": "ink_62",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Hades",
      "url": "https://inkswatch.com/ink.html?inkId=2279",
      "hex": "#284139",
      "note": null
    }
  },
  {
    "id": "ink_63",
    "brand": "Wearingeul",
    "swatch": {
      "name": "The Glass Bead Game",
      "url": "https://inkswatch.com/ink.html?inkId=1931",
      "hex": "#405040",
      "note": null
    }
  },
  {
    "id": "ink_64",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Paradiso",
      "url": "https://inkswatch.com/ink.html?inkId=1906",
      "hex": "#1e9e9e",
      "note": null
    }
  },
  {
    "id": "ink_65",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Alice",
      "url": "https://inkswatch.com/ink.html?inkId=2634",
      "hex": "#74acbc",
      "note": null
    }
  },
  {
    "id": "ink_66",
    "brand": "Wearingeul",
    "swatch": {
      "name": "The Count of Monte Cristo",
      "url": "https://inkswatch.com/ink.html?inkId=1750",
      "hex": "#982830",
      "note": null
    }
  },
  {
    "id": "ink_67",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Robinson Crusoe",
      "url": "https://inkswatch.com/ink.html?inkId=2641",
      "hex": "#3ca5b5",
      "note": null
    }
  },
  {
    "id": "ink_77",
    "brand": "Kiwi Inks",
    "swatch": {
      "name": "Quetzalcoatl",
      "url": "https://inkswatch.com/ink.html?inkId=2331",
      "hex": "#7d2d25",
      "note": null
    }
  },
  {
    "id": "ink_91",
    "brand": "Diamine",
    "swatch": {
      "name": "Marley",
      "url": "https://inkswatch.com/ink.html?inkId=2697",
      "hex": "#473f4f",
      "note": null
    }
  },
  {
    "id": "ink_92",
    "brand": "Diamine",
    "swatch": {
      "name": "Salted Caramel",
      "url": "https://inkswatch.com/ink.html?inkId=2713",
      "hex": "#89573a",
      "note": null
    }
  },
  {
    "id": "ink_93",
    "brand": "Diamine",
    "swatch": {
      "name": "Nutmeg",
      "url": "https://inkswatch.com/ink.html?inkId=2711",
      "hex": "#6b5342",
      "note": null
    }
  },
  {
    "id": "ink_94",
    "brand": "Diamine",
    "swatch": {
      "name": "Grotto",
      "url": "https://inkswatch.com/ink.html?inkId=2700",
      "hex": "#ac2e2b",
      "note": null
    }
  },
  {
    "id": "ink_95",
    "brand": "Diamine",
    "swatch": {
      "name": "Cosmic Glow",
      "url": "https://inkswatch.com/ink.html?inkId=2710",
      "hex": "#2d2a75",
      "note": null
    }
  },
  {
    "id": "ink_96",
    "brand": "Diamine",
    "swatch": {
      "name": "Icy Lilac",
      "url": "https://inkswatch.com/ink.html?inkId=2694",
      "hex": "#6c5e76",
      "note": null
    }
  },
  {
    "id": "ink_97",
    "brand": "Diamine",
    "swatch": {
      "name": "Sleigh Ride",
      "url": "https://inkswatch.com/ink.html?inkId=2704",
      "hex": "#681f25",
      "note": null
    }
  },
  {
    "id": "ink_98",
    "brand": "Diamine",
    "swatch": {
      "name": "Noble Fir",
      "url": "https://inkswatch.com/ink.html?inkId=2692",
      "hex": "#046941",
      "note": null
    }
  },
  {
    "id": "ink_99",
    "brand": "Diamine",
    "swatch": {
      "name": "Chilly Nights",
      "url": "https://inkswatch.com/ink.html?inkId=2699",
      "hex": "#35353d",
      "note": null
    }
  },
  {
    "id": "ink_100",
    "brand": "Diamine",
    "swatch": {
      "name": "Winterberry",
      "url": "https://inkswatch.com/ink.html?inkId=2706",
      "hex": "#af2532",
      "note": null
    }
  },
  {
    "id": "ink_101",
    "brand": "Diamine",
    "swatch": {
      "name": "Wishing Tree",
      "url": "https://inkswatch.com/ink.html?inkId=2698",
      "hex": "#504840",
      "note": null
    }
  },
  {
    "id": "ink_102",
    "brand": "Diamine",
    "swatch": {
      "name": "Lemon and Lime",
      "url": "https://inkswatch.com/ink.html?inkId=2696",
      "hex": "#b7a334",
      "note": null
    }
  },
  {
    "id": "ink_103",
    "brand": "Diamine",
    "swatch": {
      "name": "Mint Twist",
      "url": "https://inkswatch.com/ink.html?inkId=2703",
      "hex": "#42886a",
      "note": null
    }
  },
  {
    "id": "ink_104",
    "brand": "Diamine",
    "swatch": {
      "name": "Cranberry",
      "url": "https://inkswatch.com/ink.html?inkId=912",
      "hex": "#464040",
      "note": null
    }
  },
  {
    "id": "ink_105",
    "brand": "Diamine",
    "swatch": {
      "name": "Pine Needle",
      "url": "https://inkswatch.com/ink.html?inkId=2712",
      "hex": "#406028",
      "note": null
    }
  },
  {
    "id": "ink_106",
    "brand": "Diamine",
    "swatch": {
      "name": "Snow Globe",
      "url": "https://inkswatch.com/ink.html?inkId=2701",
      "hex": "#3a4860",
      "note": null
    }
  },
  {
    "id": "ink_107",
    "brand": "Diamine",
    "swatch": {
      "name": "Baltic Breeze",
      "url": "https://inkswatch.com/ink.html?inkId=2690",
      "hex": "#585474",
      "note": null
    }
  },
  {
    "id": "ink_108",
    "brand": "Diamine",
    "swatch": {
      "name": "Potpourri",
      "url": "https://inkswatch.com/ink.html?inkId=2709",
      "hex": "#805860",
      "note": null
    }
  },
  {
    "id": "ink_109",
    "brand": "Diamine",
    "swatch": {
      "name": "Vibe",
      "url": "https://inkswatch.com/ink.html?inkId=2707",
      "hex": "#274252",
      "note": null
    }
  },
  {
    "id": "ink_110",
    "brand": "Diamine",
    "swatch": {
      "name": "Lullaby",
      "url": "https://inkswatch.com/ink.html?inkId=2702",
      "hex": "#a16189",
      "note": null
    }
  },
  {
    "id": "21ebe10b-60e8-4a1a-931d-a4c9beacf17b",
    "brand": "Pilot",
    "swatch": {
      "name": "Blue",
      "url": "https://inkswatch.com/ink.html?inkId=1218",
      "hex": "#2a4a7a",
      "note": null
    }
  },
  {
    "id": "439839ff-1c03-43c5-b9f0-14bc99d97b8c",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Atlas",
      "url": "https://inkswatch.com/ink.html?inkId=2304",
      "hex": "#1cb282",
      "note": null
    }
  },
  {
    "id": "7a763691-6cb5-4aaf-a8e9-52a5fa78c071",
    "brand": "Pilot",
    "swatch": {
      "name": "Ama-Iro",
      "url": "https://inkswatch.com/ink.html?inkId=544",
      "hex": "#189bcb",
      "note": null
    }
  },
  {
    "id": "072680d2-3159-41f8-abfd-ab4405173390",
    "brand": "Pilot",
    "swatch": {
      "name": "Asa-Gao",
      "url": "https://inkswatch.com/ink.html?inkId=659",
      "hex": "#005ad2",
      "note": null
    }
  },
  {
    "id": "0ef1725f-3c1c-4d13-a10b-f474d63e9feb",
    "brand": "Pilot",
    "swatch": {
      "name": "Rikka",
      "url": "https://inkswatch.com/ink.html?inkId=291",
      "hex": "#2683B3",
      "note": null
    }
  },
  {
    "id": "18b9e23b-a34e-4878-b0ee-6829253c08ed",
    "brand": "Vinta Inks",
    "swatch": {
      "name": "Pastel Pink Julia 1991",
      "url": "https://inkswatch.com/ink.html?inkId=508",
      "hex": "#ae3e56",
      "note": null
    }
  },
  {
    "id": "17f7a0f4-789b-40cc-8f3a-c6ff7e796de3",
    "brand": "Akkerman",
    "swatch": {
      "name": "Shocking Blue",
      "url": "https://inkswatch.com/ink.html?inkId=342",
      "hex": "#4d5cb4",
      "note": null
    }
  },
  {
    "id": "2fdc326b-fe75-45ef-bec0-2a1df0c13150",
    "brand": "Diamine",
    "swatch": {
      "name": "Good Tidings",
      "url": "https://inkswatch.com/ink.html?inkId=2714",
      "hex": "#303022",
      "note": null
    }
  },
  {
    "id": "238416a6-2d22-4766-8105-e4199f52a5c0",
    "brand": "Wearingeul",
    "swatch": {
      "name": "7 Colored Ocean",
      "url": "https://inkswatch.com/ink.html?inkId=2037",
      "hex": "#6090b8",
      "note": null
    }
  },
  {
    "id": "651db7fc-c629-48f4-bc87-897f8c437286",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Dewy Starlight",
      "url": "https://inkswatch.com/ink.html?inkId=2416",
      "hex": "#383848",
      "note": null
    }
  },
  {
    "id": "dc812d3b-1a22-4dd4-89aa-1864e5761dda",
    "brand": "Wearingeul",
    "swatch": {
      "name": "A Watery Star",
      "url": "https://inkswatch.com/ink.html?inkId=534",
      "hex": "#52727a",
      "note": null
    }
  },
  {
    "id": "53b3bba3-4f06-4478-9e0a-42d828a43dd6",
    "brand": "Sailor",
    "swatch": {
      "name": "Nadeshiko",
      "url": "https://inkswatch.com/ink.html?inkId=918",
      "hex": "#4c6cb0",
      "note": null
    }
  },
  {
    "id": "578b0fe8-5cad-4f72-89dc-a4834d395789",
    "brand": "Pilot",
    "swatch": {
      "name": "Ajisai",
      "url": "https://inkswatch.com/ink.html?inkId=466",
      "hex": "#4762c2",
      "note": null
    }
  },
  {
    "id": "02b23862-6f58-4c69-8b39-a2e8ae3a6af3",
    "brand": "Pilot",
    "swatch": {
      "name": "Tsuki-Yo",
      "url": "https://inkswatch.com/ink.html?inkId=382",
      "hex": "#3f7e9e",
      "note": null
    }
  },
  {
    "id": "02b23862-6f58-4c69-8b39-a2e8ae3a6af4",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Neutron Star Twinkle",
      "url": "https://inkswatch.com/ink.html?inkId=1086",
      "hex": "#3a4f67",
      "note": null
    }
  },
  {
    "id": "f8d9a7b3-2c45-4e6f-9a8b-1c2d3e4f5a6b",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Bonsai",
      "url": "https://inkswatch.com/ink.html?inkId=2812",
      "hex": "#315433",
      "note": null
    }
  },
  {
    "id": "e7c8b9a4-1d32-4f5e-8b7c-9d0e1f2a3b4c",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Quantum Teal",
      "url": "https://inkswatch.com/ink.html?inkId=2246",
      "hex": "#23302c",
      "note": null
    }
  },
  {
    "id": "d6b7a8c5-0e21-4d3f-7a6b-8c9d0e1f2a3b",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Sterling Silver",
      "url": "https://inkswatch.com/ink.html?inkId=1553",
      "hex": "#74746c",
      "note": null
    }
  },
  {
    "id": "c5a6b7d8-9f10-4c2e-6a5b-7c8d9e0f1a2b",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Aqueduct",
      "url": "https://inkswatch.com/ink.html?inkId=2384",
      "hex": "#204840",
      "note": null
    }
  },
  {
    "id": "b4c5d6e9-8e0f-4b1d-5a4b-6c7d8e9f0a1b",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Dart Frog",
      "url": "https://www.birminghampens.com/products/dart-frog",
      "hex": "#00A2CB",
      "note": "Image-based approximation, not a manufacturer-published hex. Median RGB of the main blue swatch area (x=550..749, y=150..849) in the official 1000x1000 image, excluding the bottle, paper, and dark pooled edge. Source: https://www.birminghampens.com/cdn/shop/files/Dart_Frog_29925c73-a486-4608-8e0b-ae15905ae0f0.jpg?v=1754070357&width=1000 (2026-09-06)."
    }
  },
  {
    "id": "a3b4c5d7-7d9e-4a0c-4a3b-5c6d7e8f9a0b",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Suncatcher",
      "url": "https://inkswatch.com/ink.html?inkId=2816",
      "hex": "#204474",
      "note": null
    }
  },
  {
    "id": "93a2b4c6-6c8d-493b-3a2b-4c5d6e7f8a9b",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Tesla Coil",
      "url": "https://inkswatch.com/ink.html?inkId=2398",
      "hex": "#101d6e",
      "note": null
    }
  },
  {
    "id": "82b1c3d5-5b7c-482a-2a1b-3c4d5e6f7a8b",
    "brand": "Birmingham Pen Company",
    "swatch": {
      "name": "Tiger Lily",
      "url": "https://inkswatch.com/ink.html?inkId=2840",
      "hex": "#de472f",
      "note": null
    }
  },
  {
    "id": "3249ce3c-a99b-4893-ac35-fe981ad03ac1",
    "brand": "Pilot",
    "swatch": {
      "name": "Yu-Yake",
      "url": "https://inkswatch.com/ink.html?inkId=1005",
      "hex": "#f04820",
      "note": null
    }
  },
  {
    "id": "83f60264-ea54-473f-b249-8dfbad46ffd4",
    "brand": "Pilot",
    "swatch": {
      "name": "Sui-Gyoku",
      "url": "https://inkswatch.com/ink.html?inkId=1796",
      "hex": "#2d8065",
      "note": null
    }
  },
  {
    "id": "0c05b68c-2500-4867-9b48-5a6d31874723",
    "brand": "Pilot",
    "swatch": {
      "name": "Ku-Jaku",
      "url": "https://inkswatch.com/ink.html?inkId=336",
      "hex": "#187981",
      "note": null
    }
  },
  {
    "id": "890a5fc1-8c68-49d9-a8be-0be6461bd13a",
    "brand": "Pilot",
    "swatch": {
      "name": "Syo-Ro",
      "url": "https://inkswatch.com/ink.html?inkId=661",
      "hex": "#008880",
      "note": null
    }
  },
  {
    "id": "a1c5596c-2fce-4993-8d99-4bd09dabc7bf",
    "brand": "Wearingeul",
    "swatch": {
      "name": "A Dream Within a Dream",
      "url": "https://inkswatch.com/ink.html?inkId=1240",
      "hex": "#374f6f",
      "note": null
    }
  },
  {
    "id": "29e98327-ff17-4f74-a17b-4cf86d7cb160",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Twelfth Night",
      "url": "https://inkswatch.com/ink.html?inkId=309",
      "hex": "#3b657c",
      "note": null
    }
  },
  {
    "id": "36b696cf-eaac-442e-af68-66ad21e4fffb",
    "brand": "Wearingeul",
    "swatch": {
      "name": "Little Lord Fauntleroy",
      "url": "https://inkswatch.com/ink.html?inkId=36",
      "hex": "#fc8343",
      "note": null
    }
  },
  {
    "id": "b0f3e5a1-3b1b-4b7f-9120-0a1ce5b8f101",
    "brand": "Diamine",
    "swatch": {
      "name": "[Day 01] Celestial Skies",
      "url": "https://www.penchalet.com/ink_refills/fountain_pen_ink/diamine_teal_edition_50ml_fountain_pen_ink.html",
      "hex": "#155365",
      "note": "Image-based approximation, not a manufacturer-published hex. Median RGB of base-color swatch area; crop (left, top, right-exclusive, bottom-exclusive)=(150, 250, 300, 380) in 500x500 image. Shimmer and shading are not represented by one hex. Source image: https://images.penchalet.com/products/swatches/enlarge/15314-CelestialSkies.jpg (2026-09-06)."
    }
  },
  {
    "id": "32b47d80-0c1a-45ed-b8d2-7d06ca4be723",
    "brand": "Diamine",
    "swatch": {
      "name": "[Day 23] Let it Snow",
      "url": "https://www.penchalet.com/ink_refills/fountain_pen_ink/diamine_teal_edition_50ml_fountain_pen_ink.html",
      "hex": "#00C3D2",
      "note": "Image-based approximation, not a manufacturer-published hex. Median RGB of base-color swatch area; crop (left, top, right-exclusive, bottom-exclusive)=(150, 150, 350, 350) in 500x500 image. Shimmer and shading are not represented by one hex. Source image: https://images.penchalet.com/products/swatches/enlarge/15314-LetItSnow.jpg (2026-09-06)."
    }
  },
  {
    "id": "4f282b07-99ed-4d88-a792-063ce33a607f",
    "brand": "Colorverse",
    "swatch": {
      "name": "[Day 07] LGM",
      "url": "https://www.gentlemanstationer.com/blog/2025/12/13/colorventinkvent-recap-days-6-10",
      "hex": "#D6E50E",
      "note": "Image-based approximation, not a manufacturer-published hex. Median RGB of base-color swatch area; crop (left, top, right-exclusive, bottom-exclusive)=(395, 545, 510, 610) in 1280x1280 image. Shimmer and shading are not represented by one hex. Source image: https://images.squarespace-cdn.com/content/v1/5349ba13e4b095a3fb0ba65c/b31f6692-baff-4ab4-b967-59d1e6f9ec8d/Colorverse%2BColorvent%2Band%2BDiamine%2BInkvent%2BDay%2B7.jpeg (2026-09-06)."
    }
  },
  {
    "id": "a052e49e-fa8b-43f5-ad3c-3507557df827",
    "brand": "Colorverse",
    "swatch": {
      "name": "[Day 11] Blue Hole",
      "url": "https://bennyslittlethings.pagecord.com/colorverse-colorvent-and-enigma-inkvent",
      "hex": "#4EADAF",
      "note": "Image-based approximation, not a manufacturer-published hex. Median RGB of base-color swatch area; crop (left, top, right-exclusive, bottom-exclusive)=(250, 1030, 550, 1220) in 1600x1490 image. Shimmer and shading are not represented by one hex. Source image: https://pagecord.com/cdn-cgi/image/width%3D1600%2Cheight%3D1600%2Cformat%3Dwebp%2Cquality%3D90/https%3A//storage.pagecord.com/liv129lpbw8s54ltha1unsmmfsgj (2026-09-06)."
    }
  },
  {
    "id": "b1ac0f89-9e8f-48ed-b21f-c0d8590e64d1",
    "brand": "Jacques Herbin",
    "swatch": {
      "name": "Bleu Pervenche",
      "url": "https://inkswatch.com/ink.html?inkId=638",
      "hex": "#00a7ec",
      "note": "Approximate reference color from InkSwatch; verified J. Herbin Bleu Pervenche (inkId 638) and its published hex on 2026-10-02. Not a manufacturer-published color."
    }
  }
]'::jsonb) loop
  if exists(select 1 from public.inks) and not exists(select 1 from public.inks where id=r->>'id') then raise exception 'Missing reference inventory ID %',r->>'id'; end if;
  if exists(select 1 from public.inks where id=r->>'id' and brand<>r->>'brand') then raise exception 'Swatch brand mismatch for %',r->>'id'; end if;
  update public.inks set swatch_reference=r->'swatch' where id=r->>'id' and brand=r->>'brand';
 end loop;
 if exists(select 1 from public.pens) and not exists(select 1 from public.pens where id='3c8ab1e4-d304-460a-8d4d-54ae180adbb6') then raise exception 'Missing Waterman inventory ID'; end if;
 if exists(select 1 from public.pens where id='3c8ab1e4-d304-460a-8d4d-54ae180adbb6' and brand<>'Waterman') then raise exception 'Waterman ID brand mismatch'; end if;
 update public.pens set sources=sources || '[
  {
    "label": "Waterman product page",
    "url": "https://www.waterman.com/pens/l%E2%80%99essence-du-bleu/car%C3%A8ne-fountain-pen-lessence-du-bleu-gift-box/SAP_2166344.html"
  }
]'::jsonb
 where id='3c8ab1e4-d304-460a-8d4d-54ae180adbb6' and brand='Waterman' and not sources @> '[
  {
    "url": "https://www.waterman.com/pens/l%E2%80%99essence-du-bleu/car%C3%A8ne-fountain-pen-lessence-du-bleu-gift-box/SAP_2166344.html"
  }
]'::jsonb;
end $$;
