# Wearingeul ink reference

`src/data/wearingeul-inks.json` contains the manufacturer reference for the 21 Wearingeul inks in the collection. It is bundled with the app and joined by stable inventory `inkId`, independently of the mutable `/api/data` inventory. Editing, archiving, or saving an ink does not copy or overwrite the reference catalog. New inks need an explicit researched catalog entry.

Each entry stores:

- `inspiration`: author, work, and series; author/work are null for mythology inks.
- `description`: a concise paraphrase of the product story, not a verbatim transcription.
- `color.rgb`: three integer channels, or null if unverified. Hex is derived at runtime.
- `color.p`: the printed P/Pantone reference as a string, preserving suffixes, leading zeroes, and named values such as `Blue 072U`.
- `properties`: effect labels printed on the product sheet. These indicate listed effects, not measured strengths or an exhaustive absence/presence matrix.
- `glitterColors`: colors explicitly mentioned in the description; an empty list means none documented, not necessarily no glitter.
- `productCode`, optional `edition` and `exclusiveTo`, source URLs, and research notes.
- `colorGuideProperties`: retained when the manufacturer's color guide differs from the individual product sheet. The UI prioritizes the sheet and exposes the guide under Sources & notes.

Sources were read on 2026-09-06 (UTC). The 19 main product pages embed their stories, RGB/P references, and effects in tall images; those sections were transcribed with OCR and visually checked. Source-image links remain in each record. A Watery Star is the glistening edition, confirmed by the owner.

Wearingeul's color guide links Atlas and Twelfth Night to Atlas Stationers. Atlas's RGB/P values come from the manufacturer's packaging photo. Twelfth Night has verified author, work, exclusive status, Glistening classification, and retailer SKU, but no verified RGB/P values or detailed ink-specific story on the linked page. Those values remain null; the owner approved leaving the missing information. Atlas's manufacturer product code remains null.

The catalog supplies reference swatches only when an ink has no custom `colorHex`. It also supplies searchable author, work, series, effects, and glitter colors. Story & details works in both inventory layouts; the full story appears alongside the individual ink editor/viewer. Technical provenance stays collapsed.

Validate changes with `npm test`, `npm run lint`, and `npm run build`. No local browser verification is performed unless requested.
