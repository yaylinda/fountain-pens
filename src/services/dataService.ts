import type { MutationName, MutationPayload } from './database.types';
import type { Ink, Pen, RefillLog } from '../models/types';
import { isCleaning, realInkIds, type Collection, type JournalEntry } from '../lib/collection';
import { collectionDto, eventDto, inkDto, object, penDto } from './collectionAdapter';
import { getSupabase } from './supabaseClient';
import { captureSaveOrigin, celebrateSave } from '../lib/saveCelebration';

export class CollectionError extends Error {}
export function safeError(error: unknown): CollectionError {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const messages: Record<string, string> = {
        '42501': 'Only the collection owner can save changes.',
        PGRST301: 'Your session has expired. Sign in again.',
        '22023': 'Check the fields and try again.',
        P0002: 'This item is no longer available.',
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
export const getAllPens = () => collection.pens;
export const getAllInks = () => collection.inks;
export const getAllRefillLogs = () => collection.entries;
export const getPenById = (id: string) => collection.pens.find(p => p.id === id);
export const getInkById = (id: string) => collection.inks.find(i => i.id === id);
export const getRefillLogByIndex = (index: number) => collection.entries[index];
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
    saving = true;
    const origin = typeof document === 'undefined' ? null : captureSaveOrigin();
    try {
        const { data, error } = await getSupabase().rpc(name, payload);
        if (error) throw safeError(error);
        apply(object(data)); initialized = true; emit();
        if (origin) celebrateSave(origin);
        try { await loadData(true); } catch { warning = 'Saved. The collection could not refresh. Please refresh when connected.'; emit(); }
    } catch (error) { throw error instanceof CollectionError ? error : safeError(error); }
    finally { saving = false; emit(); }
}
const penInput = (p: Omit<Pen, 'id'>) => ({ brand: p.brand, model: p.model, color: p.color, nibSize: p.nibSize, nibType: p.nibType, needsRefill: !!p.needsRefill, favorite: !!p.favorite, archived: !!p.archived });
const inkInput = (i: Omit<Ink, 'id'>) => ({ brand: i.brand, collection: i.collection, name: i.name, colorHex: i.colorHex || null, favorite: !!i.favorite, archived: !!i.archived });
async function savePen(p: Omit<Pen, 'id'>, existing?: Pen) {
    let saved!: Pen;
    await command(existing ? 'update_pen' : 'create_pen', { ...(existing ? { p_id: existing.id } : {}), p_item: penInput(p) }, result => {
        saved = penDto(result.item);
        collection = { ...collection, pens: [...collection.pens.filter(p => p.id !== saved.id), saved] };
    });
    return saved;
}
async function saveInk(i: Omit<Ink, 'id'>, existing?: Ink) {
    let saved!: Ink;
    await command(existing ? 'update_ink' : 'create_ink', { ...(existing ? { p_id: existing.id } : {}), p_item: inkInput(i) }, result => {
        saved = inkDto(result.item);
        collection = { ...collection, inks: [...collection.inks.filter(i => i.id !== saved.id), saved] };
    });
    return saved;
}
export const addPen = (p: Omit<Pen, 'id'>) => savePen(p);
export const updatePen = (p: Pen) => savePen(p, p);
export const addInk = (i: Omit<Ink, 'id'>) => saveInk(i);
export const updateInk = (i: Ink) => saveInk(i, i);
export async function deletePen(item: Pen) {
    await command('delete_pen', { p_id: item.id }, () => { collection = { ...collection, pens: collection.pens.filter(p => p.id !== item.id) }; });
}
export async function deleteInk(item: Ink) {
    await command('delete_ink', { p_id: item.id }, () => { collection = { ...collection, inks: collection.inks.filter(i => i.id !== item.id) }; });
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
export async function deleteRefillLog(expected: RefillLog) {
    await command('delete_refill_event', { p_event_id: expected.id! }, () => { collection = { ...collection, entries: collection.entries.filter(e => e.id !== expected.id) }; });
}
export async function setFavorite(kind: 'pen' | 'ink', id: string, favorite: boolean): Promise<boolean> {
    const item = kind === 'pen' ? getPenById(id) : getInkById(id);
    if (!item) return false;
    try {
        if (kind === 'pen') await updatePen({ ...item as Pen, favorite });
        else await updateInk({ ...item as Ink, favorite });
        return true;
    } catch { return false; }
}
