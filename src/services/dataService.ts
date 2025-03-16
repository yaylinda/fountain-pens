import { v4 as uuidv4 } from 'uuid';
import { Ink, Pen, RefillLog, RefillLogDisplay } from '../models/types';

// Import initial data
import inksData from '../data/inks.json';
import pensData from '../data/pens.json';
import refillLogData from '../data/refillLog.json';

// In-memory storage
let inks: Ink[] = [...inksData];
let pens: Pen[] = [...pensData];
let refillLogs: RefillLog[] = [...refillLogData];

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
    return newInk;
};

export const updateInk = (updatedInk: Ink): Ink => {
    inks = inks.map((ink) => (ink.id === updatedInk.id ? updatedInk : ink));
    return updatedInk;
};

export const deleteInk = (id: string): void => {
    inks = inks.filter((ink) => ink.id !== id);
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
    return newPen;
};

export const updatePen = (updatedPen: Pen): Pen => {
    pens = pens.map((pen) => (pen.id === updatedPen.id ? updatedPen : pen));
    return updatedPen;
};

export const deletePen = (id: string): void => {
    pens = pens.filter((pen) => pen.id !== id);
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
    }
};
