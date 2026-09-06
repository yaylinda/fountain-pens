# Pilot ink reference

`src/data/pilot-inks.json` contains researched details for all 15 Pilot inks in the collection: 14 Iroshizuku colors and standard Blue. Sources were retrieved on 2026-09-06 (UTC). References join the editable inventory by brand and stable `inkId`, using the same path as Wearingeul. They are bundled with the app, independent of inventory saves.

## Sources and normalization

- Vanness's [Pilot collection](https://vanness1938.com/collections/pilot-inks) supplies an individual product page for every owned ink, including its name meaning, description, and writing observations. Descriptions in our catalog are concise paraphrases.
- [Pilot Japan's catalog](https://webcatalog.pilot.co.jp/products/DispDetail.do?itemID=t000100002563&volumeName=00004) verifies Japanese names and katakana readings through its full lineup.
- [Pilot Australia](https://pilotpen.com.au/ranges/iroshizuku) verifies the English meanings for the older colors. Its lineup still includes older colors and omits Rikka, so it is not treated as the current worldwide catalog.
- Pilot Japan's [2021 release](https://www.pilot.co.jp/press_release/2021/12/06/post_99.html) supplies the inspiration for Hotaru-bi and Sui-gyoku. The [2024 release](https://www.pilot.co.jp/press_release/2024/09/02/post_133.html) supplies Rikka's snow-crystal inspiration and the original lineup history.

`nameOrigin` separates Japanese spelling, katakana reading, English meaning, and alternate source translations. These are product-name interpretations, not claims of literal word-for-word equivalence. Blue has no Japanese name origin assigned. Murasaki-shikibu is identified with the beautyberry plant, following the product description.

`writing` contains normalized flow, shading, sheen, dry time, shimmer, water resistance, iron gall, and pigment observations. It carries the Vanness source URL and the test pen/paper explicitly. Sheen retains qualifiers such as “large swabs only” or “on Tomoe River paper.” The Rhodia condition applies to the drying test, not to all sheen observations. These are retailer observations, not universal performance guarantees or manufacturer specifications.

Where prose and tables disagree, structured values follow the table and per-ink notes preserve the disagreement: Blue's flow, Sui-gyoku's shading, and Murasaki-shikibu's sheen conditions. No bottle/cartridge variant is inferred for standard Blue. RGB/Pantone data is omitted because it was not verified; existing custom and approximate swatches continue to work. Product codes are left null rather than assigning a packaging-specific SKU.

Each source includes `supports` paths identifying the fields it supports. Empty effect arrays do not mean that effects are absent: Pilot observations live in `writing`, while Wearingeul's manufacturer effect labels retain their existing representation.

## Refreshing

Run `python3 scripts/pilot_reference.py > /tmp/pilot-observations.json` to fetch Vanness's public Shopify collection feed and extract the owned inks' tables. This writes only to stdout and never mutates inventory or the curated catalog. Exact normalized brand/collection/name matching rejects missing or ambiguous products; unknown yes/no values, changed drying-test conditions, duplicate fields, and potentially paginated results fail for review. A saved feed can be supplied with `--source-file` for offline comparison.

Review differences before merging observations into the catalog. Translations, paraphrases, and conflict notes remain curated. Do not copy entire retailer product descriptions into the app.

## App presentation and validation

The inventory shows English meanings; Story & details and the expanded ink viewer show Japanese names, inspiration, and Vanness observations. Source links and research notes stay collapsed. Search includes meanings, aliases, Japanese spellings/readings, and descriptions. Unresearched inks get no fabricated details.

Run `npm test`, `npm run lint`, and `npm run build` at the completed implementation checkpoint. Run `python3 -m unittest discover -s tests -p 'test_pilot_reference.py'` for scraper normalization and failure-path checks. No browser verification is performed unless requested.
