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

// Check if data is loaded
export const isDataLoaded = (): boolean => isInitialized;

// Load data from API
export const loadData = async (): Promise<void> => {
    if (isInitialized) {
        return;
    }

    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }

        const data = await response.json();
        inks = data.inks || [];
        pens = data.pens || [];
        refillLogs = data.refillLog || [];
        isInitialized = true;

        console.log(
            `Data loaded: ${inks.length} inks, ${pens.length} pens, ${refillLogs.length} refill logs`
        );
    } catch (error) {
        console.error('Failed to load data from API:', error);
        // Fallback: try loading from static imports for dev mode
        try {
            const [inksModule, pensModule, refillLogModule] = await Promise.all(
                [
                    import('../data/inks.json'),
                    import('../data/pens.json'),
                    import('../data/refillLog.json'),
                ]
            );
            inks = inksModule.default || [];
            pens = pensModule.default || [];
            refillLogs = refillLogModule.default || [];
            isInitialized = true;
            console.log('Loaded data from static imports (dev fallback)');
        } catch {
            console.error('Failed to load data from static imports');
            // Initialize with empty arrays
            inks = [];
            pens = [];
            refillLogs = [];
            isInitialized = true;
        }
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
    return newInk;
};

export const updateInk = (updatedInk: Ink): Ink => {
    inks = inks.map((ink) => (ink.id === updatedInk.id ? updatedInk : ink));
    // Save to file
    saveInksToFile(inks).catch((err) =>
        console.error('Failed to save inks to file:', err)
    );
    return updatedInk;
};

export const deleteInk = (id: string): void => {
    inks = inks.filter((ink) => ink.id !== id);
    // Save to file
    saveInksToFile(inks).catch((err) =>
        console.error('Failed to save inks to file:', err)
    );
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
    return newPen;
};

export const updatePen = (updatedPen: Pen): Pen => {
    pens = pens.map((pen) => (pen.id === updatedPen.id ? updatedPen : pen));
    // Save to file
    savePensToFile(pens).catch((err) =>
        console.error('Failed to save pens to file:', err)
    );
    return updatedPen;
};

export const deletePen = (id: string): void => {
    pens = pens.filter((pen) => pen.id !== id);
    // Save to file
    savePensToFile(pens).catch((err) =>
        console.error('Failed to save pens to file:', err)
    );
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
    }
};
