import type { Ink, Pen, RefillLog } from '../models/types';
import swatches from '../../scripts/output.json';
import { getInkReference, referenceHex } from './inkReference';

export const EMPTY_INK_ID = 'NONE';
export type JournalEntry = RefillLog & { index: number };
export interface Collection {
    pens: Pen[];
    inks: Ink[];
    entries: JournalEntry[];
}
export interface RefillDraft extends RefillLog {
    index?: number;
    hasUnsavedChanges?: boolean;
    // A current cleaning can update the pen's queue flag; never saved on the event.
    needsRefill?: boolean;
}
export type EditorState =
    | { kind: 'pen'; item?: Pen; returnTo?: RefillDraft }
    | { kind: 'ink'; item?: Ink; returnTo?: RefillDraft }
    | { kind: 'refill'; draft?: RefillDraft };

export const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export const isCleaning = (entry: RefillLog) =>
    entry.inkIds.length === 0 ||
    entry.inkIds.every((id) => id === EMPTY_INK_ID);
export const realInkIds = (entry: RefillLog) =>
    entry.inkIds.filter((id) => id !== EMPTY_INK_ID);
export const inkLabel = (ink?: Ink) =>
    ink ? `${ink.brand} ${ink.name}` : 'Ink no longer in inventory';
export const penLabel = (pen?: Pen) =>
    pen ? `${pen.brand} ${pen.model}` : 'Pen no longer in inventory';
export const penDescription = (pen: Pen) =>
    [pen.color, pen.nibSize, pen.nibType].filter(Boolean).join(' · ');
export const normalize = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim();
export const matches = (query: string, ...values: (string | undefined)[]) => {
    const haystack = normalize(values.filter(Boolean).join(' '));
    return normalize(query)
        .split(/\s+/)
        .every((term) => haystack.includes(term));
};
export const byName = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
export const newestFirst = (a: JournalEntry, b: JournalEntry) =>
    b.date.localeCompare(a.date) || b.index - a.index;
export const formatDate = (value?: string, short = false) => {
    if (!value) return 'No refills yet';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              ...(short ? {} : { year: 'numeric' }),
          }).format(date);
};
export const formatMonth = (value: string) => {
    const date = new Date(`${value.slice(0, 7)}-01T12:00:00`);
    return Number.isNaN(date.getTime())
        ? 'Undated'
        : new Intl.DateTimeFormat('en-US', {
              month: 'long',
              year: 'numeric',
          }).format(date);
};

export function getSwatch(
    ink?: Ink,
): { hex: string; source: string; url?: string } | undefined {
    if (!ink) return undefined;
    if (ink.colorHex && /^#[\da-f]{6}$/i.test(ink.colorHex))
        return { hex: ink.colorHex, source: 'Your color' };
    const manufacturer = getInkReference(ink);
    const manufacturerHex = manufacturer && referenceHex(manufacturer);
    if (manufacturerHex)
        return {
            hex: manufacturerHex,
            source: 'Wearingeul RGB reference',
            url: manufacturer.sources[0].url,
        };
    const reference = (
        swatches as Record<string, { hex: string | null; url: string }>
    )[ink.name];
    return reference?.hex && /^#[\da-f]{6}$/i.test(reference.hex)
        ? {
              hex: reference.hex,
              source: 'Approximate reference swatch',
              url: reference.url,
          }
        : undefined;
}

export function deriveCollection(collection: Collection, asOf = today()) {
    const { pens, inks, entries } = collection;
    const penById = new Map(pens.map((pen) => [pen.id, pen]));
    const inkById = new Map(inks.map((ink) => [ink.id, ink]));
    const journal = [...entries].sort(newestFirst);
    const latest = new Map<string, JournalEntry>();
    const penHistory = new Map<string, JournalEntry[]>();
    const inkHistory = new Map<string, JournalEntry[]>();
    for (const entry of journal) {
        if (entry.date <= asOf && !latest.has(entry.penId))
            latest.set(entry.penId, entry);
        penHistory.set(entry.penId, [
            ...(penHistory.get(entry.penId) || []),
            entry,
        ]);
        for (const id of new Set(realInkIds(entry)))
            inkHistory.set(id, [...(inkHistory.get(id) || []), entry]);
    }
    const activePens = pens.filter((pen) => !pen.archived);
    const activeInks = inks.filter(
        (ink) => ink.id !== EMPTY_INK_ID && !ink.archived,
    );
    const inked = activePens.filter((pen) => {
        const entry = latest.get(pen.id);
        return entry && !isCleaning(entry);
    });
    const inkCount = (id: string) => inkHistory.get(id)?.length || 0;
    const penCount = (id: string) =>
        penHistory.get(id)?.filter((entry) => !isCleaning(entry)).length || 0;
    const currentPens = (id: string) =>
        inked.filter((pen) => latest.get(pen.id)?.inkIds.includes(id));
    return {
        penById,
        inkById,
        journal,
        latest,
        penHistory,
        inkHistory,
        activePens,
        activeInks,
        inked,
        inkCount,
        penCount,
        currentPens,
        refills: entries.filter((entry) => !isCleaning(entry)),
        untried: activeInks.filter((ink) => inkCount(ink.id) === 0),
    };
}
export type CollectionModel = ReturnType<typeof deriveCollection>;

export function validateRefill(
    draft: RefillDraft,
    collection: Collection,
): string | undefined {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
        Number.isNaN(new Date(`${draft.date}T12:00:00`).getTime()) ||
        new Date(`${draft.date}T12:00:00Z`).toISOString().slice(0, 10) !==
            draft.date
    )
        return 'Choose a valid date.';
    if (draft.date > today()) return 'Choose today or an earlier date.';
    if (!collection.pens.some((pen) => pen.id === draft.penId))
        return 'Choose a pen from your collection.';
    if (!draft.inkIds.length)
        return 'Choose at least one ink, or select Cleaned & empty.';
    if (draft.inkIds.includes(EMPTY_INK_ID) && draft.inkIds.length > 1)
        return 'A cleaned pen cannot also contain ink.';
    if (
        draft.inkIds.some(
            (id) =>
                id !== EMPTY_INK_ID &&
                !collection.inks.some((ink) => ink.id === id),
        )
    )
        return 'An ink is no longer available. Choose an ink from your collection.';
    return undefined;
}

export function refillPayload(draft: RefillDraft): RefillLog {
    return {
        date: draft.date,
        penId: draft.penId,
        inkIds: [...new Set(draft.inkIds)],
        notes: draft.notes.trim(),
    };
}
