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

// Supabase owns reference data. Never join a bundled catalog by name at runtime.
export function getInkReference(ink?: Ink): InkReference | undefined {
    if (!ink || (!ink.reference && !ink.details && !ink.sources?.length)) return undefined;
    return {
        inkId: ink.id, name: ink.name, productCode: null,
        inspiration: { author: null, work: null, series: '' },
        properties: [], glitterColors: [],
        ...ink.reference,
        description: ink.details || '', sources: ink.sources || [],
    };
}

export const referenceHex = (reference: InkReference) =>
    reference.color?.rgb
        ? `#${reference.color.rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`
        : undefined;
