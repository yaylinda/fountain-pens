# Writing-color swatch review

Reviewed September 6, 2026. These are hand-chosen screen approximations based
on published writing observations, not measured ink colors or manufacturer
specifications. Paper, nib, lighting, shading, sheen, and shimmer cannot be
represented by one flat color. The goal is a useful collection palette.

Overrides live in `src/data/inks.json`; original reference data stays intact.

| Ink | Previous displayed color | Decision | Rationale |
| --- | --- | --- | --- |
| Pilot Rikka | `#2683B3` | `#26758A` | Shift toward a quieter, green-leaning medium blue. Reports vary substantially by paper; avoid treating it as either a pure bright blue or a blue-black. |
| Wearingeul Enki | `#3D85C1` (manufacturer RGB) | `#9AB2CA` | Use the existing InkSwatch approximation as a personal override: its pale, muted blue better reflects writing reports than the saturated manufacturer RGB. Pink/lilac shading and gold shimmer remain outside the flat swatch. |
| Pilot Asa-Gao | `#005AD2` | `#354DA1` | Represent royal blue with a violet undertone instead of an electric, cyan-leaning blue. |
| Pilot Syo-Ro | `#008880` | `#326E68` | Darken and mute the teal, reflecting the reported dark teal writing color. |
| Pilot Kon-Peki | `#156AB2` | Keep `#156AB2` | The current medium cerulean blue is consistent with the sources. No evidence warrants darkening all blue inks indiscriminately. |
| Birmingham Suncatcher | `#204474` | `#2864A3` | Lift the dark navy toward a more vibrant medium blue. Confidence is lower: independent reports are limited and emphasize substantial shading. |

## Sources and observations

- **Rikka:** [Mountain of Ink](https://mountainofink.com/blog/pilot-iroshizuku-rikka)
  reports medium blue leaning green, with less green on Tomoe River than on
  Col-o-ring. [Inkcredible Colours](https://inkcrediblecolours.com/2025/12/27/pilot-iroshizuku-rikka/)
  describes a medium blue leaning slightly teal across a multi-paper review.
- **Enki:** [Mountain of Ink](https://mountainofink.com/blog/wearingeul-enki)
  describes pale blue with pink shading and gold shimmer.
  [Owner writing observations](https://www.reddit.com/r/fountainpens/comments/1vbaq3x/could_i_see_your_irl_writing_samples_or_swatches/)
  also describe light periwinkle shifting toward light purple.
  The preserved [manufacturer reference](https://www.wearingeul.com/all/?idx=725)
  is a different kind of reference from a dried-writing approximation.
- **Asa-Gao:** [Mountain of Ink](https://mountainofink.com/blog/pilot-iroshizuku-asa-gao)
  describes royal blue with a purple undertone and compares it with other blues.
- **Syo-Ro:** [Mountain of Ink](https://mountainofink.com/blog/pilot-iroshizuku-syo-ro)
  describes dark teal, darker than Ku-jaku, with large Tomoe River swabs appearing
  bluer. The override aims at the reported writing color.
- **Kon-Peki:** [Mountain of Ink](https://mountainofink.com/blog/pilot-iroshizuku-kon-peki)
  describes medium blue; [Scrively](https://scrively.org/pilot-iroshizuku-kon-peki-blue-ink-review/)
  describes saturated cerulean with a slight green undertone and reduced intensity
  on ordinary copy paper. These support retaining the existing hue.
- **Suncatcher:** [Birmingham](https://www.birminghampens.com/products/suncatcher)
  identifies its reference swatch as a cotton-swab sample on Tomoe River, not a
  standard pen line. [Independent writing reports](https://www.reddit.com/r/fountainpens/comments/1pb2iv4/birmingham_suncatcher_ink/)
  describe vibrant blue with considerable shading, including use with flex nibs
  on Clairefontaine. The exact replacement hex remains an editorial estimate.

No source above specifies the selected replacement hex values as calibrated
measurements. Adjust further if Linda's own dried writing differs.
