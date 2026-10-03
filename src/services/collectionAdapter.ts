import type { Ink, Pen, RefillLog } from '../models/types';
import type { Collection } from '../lib/collection';

// Explicit versioned RPC boundary; no untyped table data reaches the UI.
// Regenerate provider Database types after the managed project is available.
export interface EventDto extends RefillLog { id: string; version: string; sequence: string; kind: 'refill' | 'cleaning' }
export interface Snapshot { pens: Pen[]; inks: Ink[]; events: EventDto[]; asOf: string }
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
    if (!/^[1-9]\d*$/.test(result)) throw new Error('Invalid collection version.');
    return result;
};
const array = (value: unknown): unknown[] => {
    if (!Array.isArray(value)) throw new Error('Invalid collection response.');
    return value;
};
const base = (x: Record<string, unknown>) => ({ id: string(x.id), version: decimal(x.version), brand: string(x.brand), archived: bool(x.archived), favorite: bool(x.favorite) });
export function penDto(value: unknown): Pen {
    const x = object(value);
    return { ...base(x), model: string(x.model), color: string(x.color), nibSize: string(x.nibSize), nibType: string(x.nibType), needsRefill: bool(x.needsRefill) };
}
export function inkDto(value: unknown): Ink {
    const x = object(value);
    return { ...base(x), collection: string(x.collection), name: string(x.name), ...(x.colorHex === null ? {} : { colorHex: string(x.colorHex) }) };
}
export function eventDto(value: unknown): EventDto {
    const x = object(value);
    if (x.kind !== 'refill' && x.kind !== 'cleaning') throw new Error('Invalid event kind.');
    const inkIds = array(x.inkIds).map(string);
    if ((x.kind === 'cleaning' && inkIds.length) || (x.kind === 'refill' && !inkIds.length)) throw new Error('Invalid event links.');
    return { id: string(x.id), version: decimal(x.version), sequence: decimal(x.sequence), date: string(x.date), penId: string(x.penId), notes: string(x.notes), notPure: bool(x.notPure), kind: x.kind, inkIds };
}
export function collectionDto(value: unknown): Collection {
    const x = object(value);
    const pens = array(x.pens).map(penDto), inks = array(x.inks).map(inkDto);
    const events = array(x.events).map(eventDto).sort((a, b) => BigInt(a.sequence) < BigInt(b.sequence) ? -1 : 1);
    const penIds = new Set(pens.map(p => p.id)), inkIds = new Set(inks.map(i => i.id));
    if (penIds.size !== pens.length || inkIds.size !== inks.length || new Set(events.map(e => e.id)).size !== events.length || events.some(e => !penIds.has(e.penId) || e.inkIds.some(id => !inkIds.has(id)))) throw new Error('Invalid collection relationships.');
    return { pens, inks, entries: events.map((e, index) => ({ ...e, index })), asOf: string(x.asOf) };
}
