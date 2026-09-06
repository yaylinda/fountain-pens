import catalogData from '../data/wearingeul-inks.json';
import pilotCatalogData from '../data/pilot-inks.json';
import type { Ink } from '../models/types';

export interface InkReference {
    inkId: string;
    name: string;
    productCode: string | null;
    inspiration: { author: string | null; work: string | null; series: string };
    description: string;
    color?: { rgb: number[] | null; p: string | null };
    properties: string[];
    glitterColors: string[];
    sources: { label: string; url: string; supports?: string[] }[];
    nameOrigin?: {
        japanese: string;
        reading: string;
        meaning: string;
        aliases: string[];
    } | null;
    countryOfOrigin?: string;
    limitedEdition?: boolean;
    writing?: {
        sourceUrl: string;
        dryTimeSeconds: number;
        testPen: string;
        testPaper: string;
        flow: string;
        shading: string;
        sheen: string;
        shimmer: boolean;
        waterResistance: string;
        ironGall: boolean;
        pigment: boolean;
    };
    colorGuideProperties?: string[];
    notes?: string[];
    edition?: string;
    exclusiveTo?: string;
}

export const wearingeulReferences: InkReference[] = catalogData.inks;
export const pilotReferences: InkReference[] = pilotCatalogData.inks;
const byBrand = new Map([
    ['wearingeul', new Map(wearingeulReferences.map((item) => [item.inkId, item]))],
    ['pilot', new Map(pilotReferences.map((item) => [item.inkId, item]))],
]);

// Sourced reference data is bundled separately from mutable inventory.
// Stable IDs preserve the association through name corrections and API saves.
export function getInkReference(ink?: Ink): InkReference | undefined {
    return ink ? byBrand.get(ink.brand.trim().toLowerCase())?.get(ink.id) : undefined;
}

export const referenceByline = (reference: InkReference) =>
    reference.nameOrigin?.meaning || reference.inspiration.author || reference.inspiration.series;

export const referenceHex = (reference: InkReference) =>
    reference.color?.rgb
        ? `#${reference.color.rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`
        : undefined;

// Normalize brand terminology for display without changing the sourced catalog.
// An unlisted effect is unknown, not an assertion that the ink lacks it.
export function inkPropertyValues(reference: InkReference): { label: string; value: string }[] {
    const { writing, properties, glitterColors } = reference;
    if (writing) {
        return [
            { label: 'Flow', value: writing.flow },
            { label: 'Shading', value: writing.shading },
            { label: 'Sheen', value: writing.sheen },
            { label: 'Shimmer', value: writing.shimmer ? glitterColors.join(' + ') || 'Yes' : 'No' },
            { label: 'Dry time', value: `About ${writing.dryTimeSeconds} seconds` },
            { label: 'Water resistance', value: writing.waterResistance },
        ];
    }
    const values = properties.map((property) => ({
        label: property === 'Glistening' ? 'Shimmer' : property,
        value: property === 'Glistening' ? glitterColors.join(' + ') || 'Present' : 'Present',
    }));
    if (glitterColors.length && !properties.includes('Glistening')) {
        values.push({ label: 'Shimmer', value: glitterColors.join(' + ') });
    }
    return values;
}

export function inkReferenceSearchText(ink: Ink): string {
    const reference = getInkReference(ink);
    if (!reference) return '';
    return [
        ...Object.values(reference.inspiration),
        ...reference.properties,
        ...reference.glitterColors,
        reference.nameOrigin?.japanese,
        reference.nameOrigin?.reading,
        reference.nameOrigin?.meaning,
        ...(reference.nameOrigin?.aliases || []),
        reference.description,
        reference.exclusiveTo,
        reference.properties.includes('Glistening') ? 'shimmer' : '',
    ].filter(Boolean).join(' ');
}
