import type { MutationName, MutationPayload } from './database.types';
import type { Ink, Pen, RefillLog } from '../models/types';
import { isCleaning, realInkIds, type Collection, type JournalEntry } from '../lib/collection';
import { collectionDto, eventDto, inkDto, object, penDto } from './collectionAdapter';
import { getSupabase } from './supabaseClient';
import { captureSaveOrigin, celebrateSave } from '../lib/saveCelebration';

export type Failure = 'conflict' | 'forbidden' | 'validation' | 'not-found' | 'referenced' | 'unavailable';
export class CollectionError extends Error {
    constructor(public code: Failure, message: string) { super(message); }
}
export function safeError(error: unknown): CollectionError {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const known: Record<string, [Failure, string]> = {
        '40001': ['conflict', 'This item changed elsewhere. Your draft is kept. Review the latest item before saving again.'],
        '42501': ['forbidden', 'Your session cannot access this collection. Sign in with the owner account.'],
        PGRST301: ['forbidden', 'Your session has expired. Sign in again.'],
        '22023': ['validation', 'Check the fields and try again.'],
        P0002: ['not-found', 'This item was removed elsewhere. Your draft is kept.'],
        '23503': ['referenced', 'This item has journal history. Archive it instead.'],
    };
    const mapped = known[code];
    return new CollectionError(...(mapped || ['unavailable', 'The save outcome is unknown. Retry the unchanged save to safely check it.'] as const));
}
const empty = (): Collection => ({ pens: [], inks: [], entries: [] });
let collection = empty();
let owner: string | null = null;
let generation = 0;
let initialized = false;
let pendingLoad: Promise<void> | null = null;
let activeWrite = false;
let uncertain: { name: MutationName; payload: MutationPayload; requestId: string; apply: (value: Record<string, unknown>) => void } | null = null;
let warning = '';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());
export const subscribeCollection = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getCollection = () => collection;
export const getActiveOwner = () => owner;
export const getCollectionWarning = () => warning;
export const isCollectionSaving = () => activeWrite;
export const hasUnconfirmedSave = () => !!uncertain && !activeWrite;
export async function resolveUnconfirmedSave() {
    if (uncertain) await command(uncertain.name, uncertain.payload, uncertain.apply);
}
export const isDataLoaded = () => initialized;
export function activateCollection(userId: string | null) {
    if (userId === owner) return;
    owner = userId; generation++; initialized = false; collection = empty(); pendingLoad = null; uncertain = null; activeWrite = false; warning = ''; emit();
}
export const getAllPens = () => collection.pens;
export const getAllInks = () => collection.inks;
export const getAllRefillLogs = () => collection.entries;
export const getPenById = (id: string) => collection.pens.find(p => p.id === id);
export const getInkById = (id: string) => collection.inks.find(i => i.id === id);
export const getRefillLogByIndex = (index: number) => collection.entries[index];
export async function loadData(force = false, afterWrite = false): Promise<void> {
    if (activeWrite && !afterWrite) return;
    if (!owner) throw new CollectionError('forbidden', 'Sign in to open your collection.');
    if (pendingLoad) return pendingLoad;
    if (initialized && !force) return;
    const ticket = generation;
    const request = (async () => {
        const { data, error } = await getSupabase().rpc('get_collection');
        if (ticket !== generation) return;
        if (error) throw safeError(error);
        collection = collectionDto(data); initialized = true; warning = ''; emit();
    })();
    pendingLoad = request;
    try { await request; } finally { if (pendingLoad === request) pendingLoad = null; }
}
// All writes await their receipt. Never optimistically replace persisted state.
async function command(name: MutationName, payload: MutationPayload, apply: (value: Record<string, unknown>) => void) {
    if (!owner) throw new CollectionError('forbidden', 'Sign in before saving.');
    if (activeWrite) throw new CollectionError('validation', 'Another save is in progress. Please wait.');
    if (uncertain && (uncertain.name !== name || JSON.stringify(uncertain.payload) !== JSON.stringify(payload)))
        throw new CollectionError('unavailable', 'A previous save is unconfirmed. Retry that unchanged save before making another change.');
    const attempt = uncertain || { name, payload, requestId: crypto.randomUUID(), apply };
    uncertain = attempt; activeWrite = true;
    const ticket = ++generation;
    pendingLoad = null;
    const origin = typeof document === 'undefined' ? null : captureSaveOrigin();
    try {
        const { data, error } = await getSupabase().rpc(name, { ...payload, p_request_id: attempt.requestId });
        if (ticket !== generation) throw new CollectionError('forbidden', 'The signed-in account changed.');
        if (error) {
            const failure = safeError(error);
            if (failure.code !== 'unavailable') uncertain = null;
            throw failure;
        }
        // A confirmed write must not be reported as failed because a later read failed.
        const result = object(data);
        apply(result); uncertain = null; initialized = true; emit();
        if (origin) celebrateSave(origin);
        try { await loadData(true, true); } catch { if (ticket === generation) { warning = 'Saved. The collection could not refresh; reconnect or refresh to see other changes.'; emit(); } }
        return result;
    } catch (error) {
        throw error instanceof CollectionError ? error : safeError(error);
    } finally { if (ticket === generation) { activeWrite = false; emit(); } }
}
const version = (item: { version?: string }) => {
    if (!item.version) throw new CollectionError('conflict', 'Reload this item before saving.');
    return item.version;
};
const penInput = (p: Omit<Pen, 'id'>) => ({ brand: p.brand, model: p.model, color: p.color, nibSize: p.nibSize, nibType: p.nibType, needsRefill: !!p.needsRefill, favorite: !!p.favorite, archived: !!p.archived });
const inkInput = (i: Omit<Ink, 'id'>) => ({ brand: i.brand, collection: i.collection, name: i.name, colorHex: i.colorHex || null, favorite: !!i.favorite, archived: !!i.archived });
async function savePen(p: Omit<Pen, 'id'>, existing?: Pen) {
    let saved!: Pen;
    await command(existing ? 'update_pen' : 'create_pen', { ...(existing ? { p_id: existing.id, p_expected_version: version(existing) } : {}), p_item: penInput(p) }, result => {
        saved = penDto(result.item);
        collection = { ...collection, pens: [...collection.pens.filter(p => p.id !== saved.id), saved] };
    });
    return saved;
}
async function saveInk(i: Omit<Ink, 'id'>, existing?: Ink) {
    let saved!: Ink;
    await command(existing ? 'update_ink' : 'create_ink', { ...(existing ? { p_id: existing.id, p_expected_version: version(existing) } : {}), p_item: inkInput(i) }, result => {
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
    await command('delete_pen', { p_id: item.id, p_expected_version: version(item) }, () => { collection = { ...collection, pens: collection.pens.filter(p => p.id !== item.id) }; });
}
export async function deleteInk(item: Ink) {
    await command('delete_ink', { p_id: item.id, p_expected_version: version(item) }, () => { collection = { ...collection, inks: collection.inks.filter(i => i.id !== item.id) }; });
}
const eventInput = (e: RefillLog, queueAfterCleaning?: boolean) => ({ penId: e.penId, date: e.date, kind: isCleaning(e) ? 'cleaning' : 'refill', inkIds: realInkIds(e), notes: e.notes, notPure: !isCleaning(e) && !!e.notPure, ...(isCleaning(e) && queueAfterCleaning !== undefined ? { queueAfterCleaning } : {}) });
async function saveRefill(entry: RefillLog, existing?: RefillLog, queue?: boolean): Promise<JournalEntry> {
    let saved!: JournalEntry;
    await command(existing ? 'update_refill_event' : 'create_refill_event', { ...(existing ? { p_event_id: existing.id!, p_expected_version: version(existing) } : {}), p_entry: eventInput(entry, queue) }, result => {
        const event = eventDto(result.event);
        saved = { ...event, index: collection.entries.find(e => e.id === event.id)?.index ?? collection.entries.length };
        const pen = object(result.pen);
        collection = { ...collection, entries: [...collection.entries.filter(e => e.id !== saved.id), saved], pens: collection.pens.map(p => p.id === pen.id ? { ...p, version: String(pen.version), needsRefill: !!pen.needsRefill } : p) };
    });
    return saved;
}
export const addRefillLog = (entry: RefillLog, queue?: boolean) => saveRefill(entry, undefined, queue);
export const updateRefillLog = (entry: RefillLog, expected: RefillLog) => saveRefill(entry, expected);
export async function deleteRefillLog(expected: RefillLog) {
    await command('delete_refill_event', { p_event_id: expected.id!, p_expected_version: version(expected) }, () => { collection = { ...collection, entries: collection.entries.filter(e => e.id !== expected.id) }; });
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
