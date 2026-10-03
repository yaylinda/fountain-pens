import type { Ink, Pen, RefillLog, SourceLink, SwatchReference } from '../models/types';
import type { Collection } from '../lib/collection';

// Explicit versioned RPC boundary; no untyped table data reaches the UI.
// Regenerate provider Database types after the managed project is available.
export interface EventDto extends RefillLog { id: string; sequence: string; kind: 'refill' | 'cleaning' }
export interface Snapshot { canEdit: boolean; pens: Pen[]; inks: Ink[]; events: EventDto[]; asOf: string }
export function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid collection response.');
    return value as Record<string, unknown>;
}
const string = (value: unknown): string => {
    if (typeof value !== 'string') throw new Error('Invalid collection response.');
    return value;
};
const bool = (value: unknown): boolean => {
    if (typeof value !== 'boolean') throw new Error('Invalid collection response.');
    return value;
};
export const decimal = (value: unknown): string => {
    const result = string(value);
    if (!/^[1-9]\d*$/.test(result)) throw new Error('Invalid event sequence.');
    return result;
};
const array = (value: unknown): unknown[] => {
    if (!Array.isArray(value)) throw new Error('Invalid collection response.');
    return value;
};
export function sourceLinks(value: unknown): SourceLink[] {
    return array(value).map(value => {
        const x = object(value);
        const url = string(x.url);
        if (!/^https?:\/\//i.test(url)) throw new Error('Invalid source URL.');
        return { label: string(x.label), url, ...(x.supports === undefined ? {} : { supports: array(x.supports).map(string) }) };
    });
}
const details = (x: Record<string, unknown>) => ({
    details: x.details === undefined ? '' : string(x.details),
    sources: x.sources === undefined ? [] : sourceLinks(x.sources),
});
const base = (x: Record<string, unknown>) => ({ id: string(x.id), brand: string(x.brand), archived: bool(x.archived), favorite: bool(x.favorite) });
export function penDto(value: unknown): Pen {
    const x = object(value);
    return { ...base(x), ...details(x), model: string(x.model), color: string(x.color), nibSize: string(x.nibSize), nibType: string(x.nibType), needsRefill: bool(x.needsRefill) };
}
export function inkDto(value: unknown): Ink {
    const x = object(value);
    return { ...base(x), ...details(x), ...inkReferences(x), collection: string(x.collection), name: string(x.name), ...(x.colorHex === null ? {} : { colorHex: string(x.colorHex) }) };
}
export function eventDto(value: unknown): EventDto {
    const x = object(value);
    if (x.kind !== 'refill' && x.kind !== 'cleaning') throw new Error('Invalid event kind.');
    const inkIds = array(x.inkIds).map(string);
    if ((x.kind === 'cleaning' && inkIds.length) || (x.kind === 'refill' && !inkIds.length)) throw new Error('Invalid event links.');
    return { id: string(x.id), sequence: decimal(x.sequence), date: string(x.date), penId: string(x.penId), notes: string(x.notes), notPure: bool(x.notPure), kind: x.kind, inkIds };
}
export function collectionDto(value: unknown): Collection {
    const x = object(value);
    const pens = array(x.pens).map(penDto), inks = array(x.inks).map(inkDto);
    const events = array(x.events).map(eventDto).sort((a, b) => BigInt(a.sequence) < BigInt(b.sequence) ? -1 : 1);
    const penIds = new Set(pens.map(p => p.id)), inkIds = new Set(inks.map(i => i.id));
    if (penIds.size !== pens.length || inkIds.size !== inks.length || new Set(events.map(e => e.id)).size !== events.length || events.some(e => !penIds.has(e.penId) || e.inkIds.some(id => !inkIds.has(id)))) throw new Error('Invalid collection relationships.');
    return { canEdit: bool(x.canEdit), pens, inks, entries: events.map((e, index) => ({ ...e, index })), asOf: string(x.asOf) };
}

function inkReferences(x: Record<string, unknown>): Pick<Ink, 'reference' | 'swatchReference'> {
    // Rich manufacturer fields are maintained by reviewed data migrations. Owner
    // forms edit only prose/links, so inventory saves never rewrite this document.
    const result: Pick<Ink, 'reference' | 'swatchReference'> = {};
    if (x.reference != null) {
        const r = object(x.reference), inspiration = object(r.inspiration);
        string(r.inkId); string(r.name); string(inspiration.series);
        for (const key of ['author', 'work']) if (inspiration[key] !== null) string(inspiration[key]);
        array(r.properties).map(string); array(r.glitterColors).map(string);
        if (r.productCode !== null) string(r.productCode);
        for (const key of ['countryOfOrigin', 'edition', 'exclusiveTo']) if (r[key] !== undefined) string(r[key]);
        for (const key of ['notes', 'colorGuideProperties']) if (r[key] !== undefined) array(r[key]).map(string);
        if (r.limitedEdition !== undefined) bool(r.limitedEdition);
        if (r.color !== undefined) {
            const color = object(r.color);
            if (color.p !== null) string(color.p);
            if (color.rgb !== null) {
                const rgb = array(color.rgb);
                if (rgb.length !== 3 || rgb.some(v => typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 255)) throw new Error('Invalid reference color.');
            }
        }
        if (r.nameOrigin != null) {
            const origin = object(r.nameOrigin);
            for (const key of ['japanese', 'reading', 'meaning']) string(origin[key]);
            array(origin.aliases).map(string);
        }
        if (r.writing !== undefined) {
            const writing = object(r.writing);
            for (const key of ['sourceUrl', 'testPen', 'testPaper', 'flow', 'shading', 'sheen', 'waterResistance']) string(writing[key]);
            for (const key of ['shimmer', 'ironGall', 'pigment']) bool(writing[key]);
            if (typeof writing.dryTimeSeconds !== 'number' || !Number.isFinite(writing.dryTimeSeconds)) throw new Error('Invalid reference dry time.');
        }
        result.reference = r as unknown as NonNullable<Ink['reference']>;
    }
    if (x.swatchReference != null) {
        const r = object(x.swatchReference);
        string(r.name); string(r.url);
        if (r.hex !== null) string(r.hex);
        if (r.note !== null) string(r.note);
        result.swatchReference = r as unknown as SwatchReference;
    }
    return result;
}
