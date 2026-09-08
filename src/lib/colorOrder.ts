import { byName, getSwatch, inkLabel } from './collection';
import type { Ink } from '../models/types';

// Linear sRGB → Oklab, from Björn Ottosson's reference implementation:
// https://bottosson.github.io/posts/oklab/#converting-from-linear-srgb-to-oklab
export function perceptualColor(hex: string) {
    const [r, g, b] = [1, 3, 5].map((offset) => {
        const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const light = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const blueYellow = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return {
        light,
        a,
        b: blueYellow,
        chroma: Math.hypot(a, blueYellow),
        hue: (Math.atan2(blueYellow, a) * 180 / Math.PI + 360) % 360,
    };
}

type Color = ReturnType<typeof perceptualColor>;
const distance = (a?: Color, b?: Color) => a && b
    ? (a.light - b.light) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2
    : 0;

export function sortInksByColor(inks: readonly Ink[]): Ink[] {
    const known: { ink: Ink; color: Color }[] = [];
    const unknown: Ink[] = [];
    for (const ink of inks) {
        const swatch = getSwatch(ink);
        if (swatch) known.push({ ink, color: perceptualColor(swatch.hex) });
        else unknown.push(ink);
    }
    const byLabel = (a: Ink, b: Ink) =>
        byName(inkLabel(a), inkLabel(b)) || byName(a.id, b.id);
    // Near-gray hues are unstable and do not belong in the rainbow. This is
    // an aesthetic cutoff; keep these swatches in a dark-to-light tail.
    const neutral = known.filter(({ color }) => color.chroma < 0.025);
    const colors = known.filter(({ color }) => color.chroma >= 0.025);
    colors.sort((a, b) => a.color.hue - b.color.hue ||
        a.color.light - b.color.light || byLabel(a.ink, b.ink));

    // Smooth a hue-ordered path with bounded 2-opt reversals. Squared Oklab
    // distance penalizes abrupt lightness/chroma jumps. Only reverse runs
    // spanning at most 30° so distant hues retain their rainbow direction.
    // The fixed pass budget keeps this deterministic and bounded.
    for (let pass = 0; pass < colors.length; pass++) {
        let improvement = 1e-10;
        let start = -1;
        let end = -1;
        for (let i = 0; i < colors.length - 1; i++) {
            let minHue = colors[i].color.hue;
            let maxHue = minHue;
            for (let j = i + 1; j < colors.length; j++) {
                minHue = Math.min(minHue, colors[j].color.hue);
                maxHue = Math.max(maxHue, colors[j].color.hue);
                if (maxHue - minHue > 30) break;
                const before = colors[i - 1]?.color;
                const after = colors[j + 1]?.color;
                const first = colors[i].color;
                const last = colors[j].color;
                const gain = distance(before, first) + distance(last, after)
                    - distance(before, last) - distance(first, after);
                if (gain > improvement) {
                    improvement = gain;
                    start = i;
                    end = j;
                }
            }
        }
        if (start < 0) break;
        colors.splice(start, end - start + 1, ...colors.slice(start, end + 1).reverse());
    }
    neutral.sort((a, b) => a.color.light - b.color.light || byLabel(a.ink, b.ink));
    return [...colors, ...neutral].map(({ ink }) => ink).concat(unknown.sort(byLabel));
}
