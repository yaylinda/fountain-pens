import { v4 as uuidv4 } from 'uuid';
import { Ink, Pen, RefillLog, RefillLogDisplay } from '../models/types';
import {
    saveInksToFile,
    savePensToFile,
    saveRefillLogsToFile,
} from './fileService';

// In-memory storage (initialized from API)
let inks: Ink[] = [];
let pens: Pen[] = [];
let refillLogs: RefillLog[] = [];
let isInitialized = false;
let pendingLoad: Promise<void> | null = null;

// Mutation callback for dirty state tracking
let onMutationCallback: (() => void) | null = null;

export const setOnMutationCallback = (callback: (() => void) | null): void => {
    onMutationCallback = callback;
};

const notifyMutation = (): void => {
    if (onMutationCallback) {
        onMutationCallback();
    }
};

// Check if data is loaded
export const isDataLoaded = (): boolean => isInitialized;

// Load data from API
export const loadData = (): Promise<void> => {
    if (isInitialized) {
        return Promise.resolve();
    }
    if (pendingLoad) return pendingLoad;

    pendingLoad = fetchData().finally(() => {
        pendingLoad = null;
    });
    return pendingLoad;
};

const fetchData = async (): Promise<void> => {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }

        const data = await response.json();
        if (
            !data ||
            !Array.isArray(data.inks) ||
            !Array.isArray(data.pens) ||
            !Array.isArray(data.refillLog)
        ) {
            throw new Error('Invalid collection response: expected inks, pens, and refillLog arrays');
        }
        inks = data.inks;
        pens = data.pens;
        refillLogs = data.refillLog;
        isInitialized = true;

        console.log(
            `Data loaded: ${inks.length} inks, ${pens.length} pens, ${refillLogs.length} refill logs`
        );
    } catch (error) {
        console.error('Failed to load data from API:', error);
        inks = [];
        pens = [];
        refillLogs = [];
        isInitialized = false;
        throw error;
    }
};

// Ink methods
export const getAllInks = (): Ink[] => {
    return [...inks];
};

export const getInkById = (id: string): Ink | undefined => {
    return inks.find((ink) => ink.id === id);
};

export const addInk = (ink: Omit<Ink, 'id'>): Ink => {
    const newInk = { ...ink, id: uuidv4() };
    inks = [...inks, newInk];
    // Save to file
    saveInksToFile(inks).catch((err) =>
        console.error('Failed to save inks to file:', err)
    );
    notifyMutation();
    return newInk;
};

export const updateInk = (updatedInk: Ink): Ink => {
    inks = inks.map((ink) => (ink.id === updatedInk.id ? updatedInk : ink));
    // Save to file
    saveInksToFile(inks).catch((err) =>
        console.error('Failed to save inks to file:', err)
    );
    notifyMutation();
    return updatedInk;
};

export const deleteInk = (id: string): void => {
    inks = inks.filter((ink) => ink.id !== id);
    // Save to file
    saveInksToFile(inks).catch((err) =>
        console.error('Failed to save inks to file:', err)
    );
    notifyMutation();
};

// Pen methods
export const getAllPens = (): Pen[] => {
    return [...pens];
};

export const getPenById = (id: string): Pen | undefined => {
    return pens.find((pen) => pen.id === id);
};

export const addPen = (pen: Omit<Pen, 'id'>): Pen => {
    const newPen = { ...pen, id: uuidv4() };
    pens = [...pens, newPen];
    // Save to file
    savePensToFile(pens).catch((err) =>
        console.error('Failed to save pens to file:', err)
    );
    notifyMutation();
    return newPen;
};

export const updatePen = (updatedPen: Pen): Pen => {
    pens = pens.map((pen) => (pen.id === updatedPen.id ? updatedPen : pen));
    // Save to file
    savePensToFile(pens).catch((err) =>
        console.error('Failed to save pens to file:', err)
    );
    notifyMutation();
    return updatedPen;
};

export const deletePen = (id: string): void => {
    pens = pens.filter((pen) => pen.id !== id);
    // Save to file
    savePensToFile(pens).catch((err) =>
        console.error('Failed to save pens to file:', err)
    );
    notifyMutation();
};

// Refill Log methods
export const getAllRefillLogs = (): (RefillLogDisplay & {
    index: number;
})[] => {
    return refillLogs.map((item, index) => {
        const penDetails = getPenById(item.penId) as Pen;
        const inkDetails = item.inkIds.map((id) => getInkById(id) as Ink);
        return { ...item, penDetails, inkDetails, index };
    });
};

export const getRefillLogByIndex = (
    index: number
): RefillLogDisplay | undefined => {
    const item = refillLogs[index];
    if (!item) return undefined;

    const penDetails = getPenById(item.penId) as Pen;
    const inkDetails = item.inkIds.map((id) => getInkById(id) as Ink);
    return { ...item, penDetails, inkDetails };
};

export const addRefillLog = (
    item: RefillLog
): RefillLogDisplay & { index: number } => {
    refillLogs = [...refillLogs, item];
    const index = refillLogs.length - 1;

    // Save to file
    saveRefillLogsToFile(refillLogs).catch((err) =>
        console.error('Failed to save refill logs to file:', err)
    );
    notifyMutation();

    const penDetails = getPenById(item.penId) as Pen;
    const inkDetails = item.inkIds.map((id) => getInkById(id) as Ink);
    return { ...item, penDetails, inkDetails, index };
};

export const updateRefillLog = (
    updatedItem: RefillLog,
    index: number
): RefillLogDisplay & { index: number } => {
    if (index >= 0 && index < refillLogs.length) {
        refillLogs = [
            ...refillLogs.slice(0, index),
            updatedItem,
            ...refillLogs.slice(index + 1),
        ];

        // Save to file
        saveRefillLogsToFile(refillLogs).catch((err) =>
            console.error('Failed to save refill logs to file:', err)
        );
        notifyMutation();
    }

    const penDetails = getPenById(updatedItem.penId) as Pen;
    const inkDetails = updatedItem.inkIds.map((id) => getInkById(id) as Ink);
    return { ...updatedItem, penDetails, inkDetails, index };
};

export const deleteRefillLog = (index: number): void => {
    if (index >= 0 && index < refillLogs.length) {
        refillLogs = [
            ...refillLogs.slice(0, index),
            ...refillLogs.slice(index + 1),
        ];

        // Save to file
        saveRefillLogsToFile(refillLogs).catch((err) =>
            console.error('Failed to save refill logs to file:', err)
        );
        notifyMutation();
    }
};

// Read the current entity so a star never overwrites unrelated fields.
export const setFavorite = async (kind: 'pen' | 'ink', id: string, favorite: boolean): Promise<boolean> => {
    if (kind === 'ink' && id === 'NONE') return false;
    const item = kind === 'pen' ? getPenById(id) : getInkById(id);
    if (!item) return false;
    const previous = item.favorite;
    const updated = { ...item, favorite };
    if (kind === 'pen') pens = pens.map((pen) => pen.id === id ? updated as Pen : pen);
    else inks = inks.map((ink) => ink.id === id ? updated as Ink : ink);
    const saved = await (kind === 'pen' ? savePensToFile(pens) : saveInksToFile(inks));
    if (saved) notifyMutation();
    else {
        // Preserve any other fields edited while the request was in flight.
        if (kind === 'pen') pens = pens.map((pen) => pen.id === id ? { ...pen, favorite: previous } : pen);
        else inks = inks.map((ink) => ink.id === id ? { ...ink, favorite: previous } : ink);
    }
    return saved;
};
