import { arrangementDto, type DeskArrangement, type PaletteItem } from '../lib/deskPalette';
import type { MutationName, MutationPayload } from './database.types';
import type { RefillLog } from '../models/types';
import { isCleaning, realInkIds, type Collection, type JournalEntry } from '../lib/collection';
import { collectionDto, penDto, eventDto, writingLogDto, object } from './collectionAdapter';
import { getSupabase } from './supabaseClient';

export class CollectionError extends Error {}
export function safeError(error: unknown): CollectionError {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const messages: Record<string, string> = {
        '42501': 'Only the collection owner can save changes.',
        PGRST301: 'Your session has expired. Sign in again.',
        '22023': 'Check the fields and try again.',
        P0002: 'This item is no longer available.',
        '23505': 'Writing is already logged for this refill on that date.',
        '23514': 'Use a date on or after the refill and no later than today. Refills with writing history must remain refills.',
        '23503': 'This item has journal history. Archive it instead.',
    };
    return new CollectionError(messages[code] || 'Could not save. Check your connection and try again.');
}
let collection: Collection = { pens: [], inks: [], entries: [], canEdit: false };
let owner: string | null = null;
let initialized = false;
let pendingLoad: Promise<void> | null = null;
let saving = false;
let warning = '';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());
export const subscribeCollection = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getCollection = () => collection;
export const getActiveOwner = () => owner;
export const getCollectionWarning = () => warning;
export const isCollectionSaving = () => saving;
export const isDataLoaded = () => initialized;
export function activateCollection(userId: string | null) {
    if (userId === owner) return;
    owner = userId;
    // Collection content is public; revoke editing immediately while refreshing capability.
    collection = { ...collection, canEdit: false }; pendingLoad = null; warning = ''; emit();
}
export async function loadData(force = false): Promise<void> {
    if (pendingLoad) return pendingLoad;
    if (initialized && !force) return;
    const requestedOwner = owner;
    const request = (async () => {
        const { data, error } = await getSupabase().rpc('get_collection');
        if (error) throw safeError(error);
        if (requestedOwner !== owner) return;
        collection = collectionDto(data); initialized = true; warning = ''; emit();
    })();
    pendingLoad = request;
    try { await request; } finally { if (pendingLoad === request) pendingLoad = null; }
}
async function command(name: MutationName, payload: MutationPayload, apply: (value: Record<string, unknown>) => void) {
    if (!owner || !collection.canEdit) throw new CollectionError('Only the collection owner can save changes.');
    if (saving) return Promise.reject(new CollectionError('A save is in progress.'));
    saving = true; emit();
    try {
        const { data, error } = await getSupabase().rpc(name, payload);
        if (error) throw safeError(error);
        apply(object(data)); initialized = true; emit();
        try { await loadData(true); } catch { warning = 'Saved. The collection could not refresh. Please refresh when connected.'; emit(); }
    } catch (error) { throw error instanceof CollectionError ? error : safeError(error); }
    finally { saving = false; emit(); }
}
const eventInput = (e: RefillLog, queueAfterCleaning?: boolean) => ({ penId: e.penId, date: e.date, kind: isCleaning(e) ? 'cleaning' : 'refill', inkIds: realInkIds(e), notes: e.notes, notPure: !isCleaning(e) && !!e.notPure, ...(isCleaning(e) && queueAfterCleaning !== undefined ? { queueAfterCleaning } : {}) });
async function saveRefill(entry: RefillLog, existing?: RefillLog, queue?: boolean): Promise<JournalEntry> {
    let saved!: JournalEntry;
    await command(existing ? 'update_refill_event' : 'create_refill_event', { ...(existing ? { p_event_id: existing.id! } : {}), p_entry: eventInput(entry, queue) }, result => {
        const event = eventDto(result.event);
        saved = { ...event, index: collection.entries.find(e => e.id === event.id)?.index ?? collection.entries.length };
        const pen = object(result.pen);
        collection = { ...collection, entries: [...collection.entries.filter(e => e.id !== saved.id), saved], pens: collection.pens.map(p => p.id === pen.id ? { ...p, needsRefill: !!pen.needsRefill } : p) };
    });
    return saved;
}
export const addRefillLog = (entry: RefillLog, queue?: boolean) => saveRefill(entry, undefined, queue);
export const updateRefillLog = (entry: RefillLog, expected: RefillLog) => saveRefill(entry, expected);
export async function saveNamedPalette(id: string | null, name: string, items: PaletteItem[]) {
    let saved!: DeskArrangement;
    await command('save_named_palette', { p_id: id, p_name: name, p_items: items.map(item => ({ ...item })) }, result => {
        saved = arrangementDto(result.palette);
        const palettes = collection.palettes || [];
        collection = { ...collection, palettes: palettes.some(p => p.id === saved.id)
            ? palettes.map(p => p.id === saved.id ? saved : p) : [...palettes, saved],
            ...(saved.id === 'default' ? { palette: saved.items } : {}) };
    });
    return saved;
}

export async function deleteNamedPalette(id: string) {
    await command('delete_named_palette', { p_id: id }, () => {
        collection = { ...collection, palettes: (collection.palettes || []).filter(p => p.id !== id),
            ...(id === 'default' ? { palette: [] } : {}) };
    });
}

export async function saveWritingLog(refillId: string, writtenOn: string, id: string | null = null) {
    await command('save_writing_log', { p_id: id, p_refill_id: refillId, p_written_on: writtenOn }, result => {
        const log = writingLogDto(result.item);
        collection = { ...collection, writingLogs: [...(collection.writingLogs || []).filter(x => x.id !== log.id), log] };
    });
}
export async function deleteWritingLog(id: string) {
    await command('delete_writing_log', { p_id: id }, () => {
        collection = { ...collection, writingLogs: (collection.writingLogs || []).filter(x => x.id !== id) };
    });
}

export async function setPenNeedsRefill(id: string, needsRefill: boolean) {
    const pen = collection.pens.find(p => p.id === id);
    if (!pen) throw new CollectionError('This pen is no longer available.');
    const { brand, model, color, nibSize, nibType } = pen;
    // The existing update contract requires identity fields. Omit optional prose
    // and sources so the server preserves them rather than rewriting references.
    await command('update_pen', { p_id: id, p_item: { brand, model, color, nibSize, nibType,
        archived: !!pen.archived, favorite: !!pen.favorite, needsRefill } }, result => {
        const saved = penDto(result.item);
        collection = { ...collection, pens: collection.pens.map(p => p.id === saved.id ? saved : p) };
    });
}
