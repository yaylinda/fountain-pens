import catalogData from '../data/wearingeul-inks.json';
import type { Ink } from '../models/types';

export interface InkReference {
    inkId: string;
    name: string;
    productCode: string | null;
    inspiration: { author: string | null; work: string | null; series: string };
    description: string;
    color: { rgb: number[] | null; p: string | null };
    properties: string[];
    glitterColors: string[];
    sources: { label: string; url: string }[];
    colorGuideProperties?: string[];
    notes?: string[];
    edition?: string;
    exclusiveTo?: string;
}

export const wearingeulReferences: InkReference[] = catalogData.inks;
const byId = new Map(wearingeulReferences.map((item) => [item.inkId, item]));

// Manufacturer reference data is bundled separately from mutable inventory.
// Stable IDs preserve the association through name corrections and API saves.
export function getInkReference(ink?: Ink): InkReference | undefined {
    return ink?.brand.trim().toLowerCase() === 'wearingeul'
        ? byId.get(ink.id)
        : undefined;
}

export const referenceByline = (reference: InkReference) =>
    reference.inspiration.author || reference.inspiration.series;

export const referenceHex = (reference: InkReference) =>
    reference.color.rgb
        ? `#${reference.color.rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`
        : undefined;

export function inkReferenceSearchText(ink: Ink): string {
    const reference = getInkReference(ink);
    if (!reference) return '';
    return [
        ...Object.values(reference.inspiration),
        ...reference.properties,
        ...reference.glitterColors,
        reference.exclusiveTo,
        reference.properties.includes('Glistening') ? 'shimmer' : '',
    ].filter(Boolean).join(' ');
}
