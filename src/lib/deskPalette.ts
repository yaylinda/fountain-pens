import type { Ink } from '../models/types';
import type { deriveCollection } from './collection';
import { sortInksByColor } from './colorOrder';

// All is a live reference, never a saved arrangement. Mixed fills contribute each ink once.
export function currentlyInkedColors(inks: Ink[], model: ReturnType<typeof deriveCollection>): Ink[] {
    const ids = new Set(model.inked.flatMap(pen => model.latest.get(pen.id)?.inkIds || []));
    return sortInksByColor(inks.filter(ink => ids.has(ink.id)));
}

export interface PaletteItem { inkId: string; omitted: boolean }
export interface DeskArrangement { id: string; name: string; items: PaletteItem[] }
export function arrangementDto(value: unknown): DeskArrangement {
    if (!value || typeof value !== 'object' || !('id' in value) || !('name' in value) || !('items' in value)
        || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !value.name.trim()) {
        throw new Error('Invalid palette response.');
    }
    return { id: value.id, name: value.name, items: paletteDto(value.items) };
}
export function arrangementsDto(value: unknown): DeskArrangement[] {
    if (!Array.isArray(value)) throw new Error('Invalid palette response.');
    const result = value.map(arrangementDto);
    if (new Set(result.map(item => item.id)).size !== result.length) throw new Error('Invalid palette response.');
    return result;
}
export function paletteDto(value: unknown): PaletteItem[] {
    if (!Array.isArray(value)) throw new Error('Invalid palette response.');
    const seen = new Set<string>();
    return value.map(item => {
        if (!item || typeof item.inkId !== 'string' || typeof item.omitted !== 'boolean' || seen.has(item.inkId)) throw new Error('Invalid palette response.');
        seen.add(item.inkId);
        return { inkId: item.inkId, omitted: item.omitted };
    });
}
// Preserve dormant entries; newly inked colors append in the desk's rainbow order.
export function reconcilePalette(saved: PaletteItem[], current: Ink[]): PaletteItem[] {
    const known = new Set(saved.map(item => item.inkId));
    return [...saved, ...current.filter(ink => !known.has(ink.id)).map(ink => ({ inkId: ink.id, omitted: false }))];
}
export function movePalette(items: PaletteItem[], from: string, to: string) {
    const next = [...items];
    const start = next.findIndex(item => item.inkId === from), end = next.findIndex(item => item.inkId === to);
    if (start < 0 || end < 0) return items;
    next.splice(end, 0, next.splice(start, 1)[0]);
    return next;
}
