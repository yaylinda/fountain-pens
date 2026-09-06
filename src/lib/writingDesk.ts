import {
    byName,
    getSwatch,
    inkLabel,
    penLabel,
    type CollectionModel,
} from './collection';
import type { Ink, Pen } from '../models/types';

export const colorFamilies = [
    'Reds',
    'Oranges',
    'Yellows',
    'Greens',
    'Teals',
    'Blues',
    'Purples',
    'Pinks',
    'Browns',
    'Neutrals',
    'Unknown',
];
export function inkColor(ink?: Ink) {
    const hex = getSwatch(ink)?.hex;
    if (!hex) return { family: 'Unknown', hue: 999, light: 0 };
    const [r, g, b] = [1, 3, 5].map(
        (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
    );
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        delta = max - min;
    const light = (max + min) / 2;
    const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
    const hue = delta
        ? ((max === r
              ? (g - b) / delta
              : max === g
                ? (b - r) / delta + 2
                : (r - g) / delta + 4) *
              60 +
              360) %
          360
        : 0;
    const family =
        saturation < 0.16 || light < 0.09
            ? 'Neutrals'
            : hue >= 15 && hue < 65 && light < 0.43
              ? 'Browns'
              : hue < 15 || hue >= 345
                ? 'Reds'
                : hue < 45
                  ? 'Oranges'
                  : hue < 70
                    ? 'Yellows'
                    : hue < 160
                      ? 'Greens'
                      : hue < 195
                        ? 'Teals'
                        : hue < 260
                          ? 'Blues'
                          : hue < 295
                            ? 'Purples'
                            : 'Pinks';
    return { family, hue: family === 'Neutrals' ? 998 : hue, light };
}
export type DeskGroup = 'none' | 'pen' | 'nib' | 'ink' | 'color';
export type DeskOrder = 'color' | 'pen' | 'ink' | 'recent';
export interface DeskFilters {
    brands: Record<string, 'include' | 'exclude'>;
    nib: string;
    inkBrand: string;
}
export const nibMaterial = (pen: Pen) =>
    /gold/i.test(pen.nibType)
        ? 'Gold'
        : /steel/i.test(pen.nibType)
          ? 'Steel'
          : pen.nibType || 'Unknown';
export function deskRows(
    model: CollectionModel,
    filters: DeskFilters,
    order: DeskOrder,
    group: DeskGroup,
    inkId = '',
) {
    const included = Object.keys(filters.brands).filter(
        (b) => filters.brands[b] === 'include',
    );
    const rows = model.inked
        .map((pen) => ({
            pen,
            entry: model.latest.get(pen.id)!,
            inks: (model.latest.get(pen.id)?.inkIds || []).flatMap((id) =>
                model.inkById.get(id) ? [model.inkById.get(id)!] : [],
            ),
        }))
        .filter(
            ({ pen, inks }) =>
                (!included.length || included.includes(pen.brand)) &&
                filters.brands[pen.brand] !== 'exclude' &&
                (!filters.nib || nibMaterial(pen) === filters.nib) &&
                (!filters.inkBrand ||
                    inks.some((i) => i.brand === filters.inkBrand)) &&
                (!inkId || inks.some((i) => i.id === inkId)),
        );
    const label = (row: (typeof rows)[number]) =>
        group === 'pen'
            ? row.pen.brand
            : group === 'nib'
              ? nibMaterial(row.pen)
              : group === 'ink'
                ? [...new Set(row.inks.map((i) => i.brand))]
                      .sort(byName)
                      .join(' + ') || 'Unknown'
                : group === 'color'
                  ? row.inks.length > 1
                      ? 'Mixed inks'
                      : inkColor(row.inks[0]).family
                  : 'Currently inked';
    rows.sort((a, b) => {
        const ac = inkColor(a.inks[0]),
            bc = inkColor(b.inks[0]);
        return (
            (order === 'color'
                ? ac.hue - bc.hue || ac.light - bc.light
                : order === 'ink'
                  ? byName(
                        a.inks.map(inkLabel).join(' + '),
                        b.inks.map(inkLabel).join(' + '),
                    )
                  : order === 'recent'
                    ? b.entry.date.localeCompare(a.entry.date)
                    : 0) ||
            byName(penLabel(a.pen), penLabel(b.pen)) ||
            byName(a.pen.color, b.pen.color)
        );
    });
    const groups = new Map<string, typeof rows>();
    for (const row of rows)
        groups.set(label(row), [...(groups.get(label(row)) || []), row]);
    return [...groups].sort(([a], [b]) =>
        group === 'color'
            ? (colorFamilies.indexOf(a) < 0 ? 99 : colorFamilies.indexOf(a)) -
              (colorFamilies.indexOf(b) < 0 ? 99 : colorFamilies.indexOf(b))
            : byName(a, b),
    );
}

// Owned by the app shell so opening details does not discard a desk session.
export interface DeskState {
    filters: DeskFilters;
    group: DeskGroup;
    order: DeskOrder;
    selectedInk: string;
    view: string;
    filtersOpen: boolean;
}
export const initialDeskState: DeskState = {
    filters: { brands: {}, nib: '', inkBrand: '' },
    group: 'none',
    order: 'color',
    selectedInk: '',
    view: 'All pens',
    filtersOpen: false,
};
