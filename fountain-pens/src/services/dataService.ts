import { v4 as uuidv4 } from 'uuid';
import {
    CurrentlyInked,
    CurrentlyInkedDisplay,
    Ink,
    Pen,
} from '../models/types';

// Import initial data
import currentlyInkedData from '../data/currentlyInked.json';
import inksData from '../data/inks.json';
import pensData from '../data/pens.json';

// In-memory storage
let inks: Ink[] = [...inksData];
let pens: Pen[] = [...pensData];
let currentlyInked: CurrentlyInked[] = [...currentlyInkedData];

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

// Currently Inked methods
export const getAllCurrentlyInked = (): CurrentlyInkedDisplay[] => {
    return currentlyInked.map((item) => {
        const penDetails = getPenById(item.penId) as Pen;
        const inkDetails = getInkById(item.inkId) as Ink;
        return { ...item, penDetails, inkDetails };
    });
};

export const getCurrentlyInkedById = (
    id: string
): CurrentlyInkedDisplay | undefined => {
    const item = currentlyInked.find((ci) => ci.id === id);
    if (!item) return undefined;

    const penDetails = getPenById(item.penId) as Pen;
    const inkDetails = getInkById(item.inkId) as Ink;
    return { ...item, penDetails, inkDetails };
};

export const addCurrentlyInked = (
    item: Omit<CurrentlyInked, 'id'>
): CurrentlyInkedDisplay => {
    const newItem = { ...item, id: uuidv4() };
    currentlyInked = [...currentlyInked, newItem];

    const penDetails = getPenById(newItem.penId) as Pen;
    const inkDetails = getInkById(newItem.inkId) as Ink;
    return { ...newItem, penDetails, inkDetails };
};

export const updateCurrentlyInked = (
    updatedItem: CurrentlyInked
): CurrentlyInkedDisplay => {
    currentlyInked = currentlyInked.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
    );

    const penDetails = getPenById(updatedItem.penId) as Pen;
    const inkDetails = getInkById(updatedItem.inkId) as Ink;
    return { ...updatedItem, penDetails, inkDetails };
};

export const deleteCurrentlyInked = (id: string): void => {
    currentlyInked = currentlyInked.filter((item) => item.id !== id);
};
