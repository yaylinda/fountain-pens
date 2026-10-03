import type { Ink } from '../models/types';
export interface PaletteItem { inkId: string; omitted: boolean }
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
