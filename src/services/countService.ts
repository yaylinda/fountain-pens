import { parseISO } from 'date-fns';
import { Ink, Pen, RefillLog } from '../models/types';
import { getAllRefillLogs } from './dataService';

/**
 * Gets the count of times a pen has been refilled
 * @param penId The ID of the pen to count refills for
 * @param refillLogs Optional array of refill logs (will fetch all if not provided)
 * @returns The number of times the pen has been refilled
 */
export const getPenRefillCount = (
    penId: string,
    refillLogs: RefillLog[] = getAllRefillLogs().map((log) => ({
        date: log.date,
        penId: log.penId,
        inkIds: log.inkIds,
        notes: log.notes,
    }))
): number => {
    return refillLogs.filter((log) => log.penId === penId).length;
};

/**
 * Gets the count of times an ink has been used in refills
 * @param inkId The ID of the ink to count usages for
 * @param refillLogs Optional array of refill logs (will fetch all if not provided)
 * @returns The number of times the ink has been used
 */
export const getInkUsageCount = (
    inkId: string,
    refillLogs: RefillLog[] = getAllRefillLogs().map((log) => ({
        date: log.date,
        penId: log.penId,
        inkIds: log.inkIds,
        notes: log.notes,
    }))
): number => {
    return refillLogs.filter((log) => log.inkIds.includes(inkId)).length;
};

/**
 * Gets the most recent ink used in a pen
 * @param penId The ID of the pen to find the current ink for
 * @param refillLogs Optional array of refill logs (will fetch all if not provided)
 * @returns The ID of the most recent ink, or undefined if no refills
 */
export const getMostRecentInkForPen = (
    penId: string,
    refillLogs: RefillLog[] = getAllRefillLogs().map((log) => ({
        date: log.date,
        penId: log.penId,
        inkIds: log.inkIds,
        notes: log.notes,
    }))
): string | undefined => {
    // Filter logs for this pen and sort by date (most recent first)
    const penLogs = refillLogs
        .filter((log) => log.penId === penId)
        .sort((a, b) => {
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            return dateB.getTime() - dateA.getTime(); // Most recent first
        });

    // Return the first ink in the most recent log, if any
    if (penLogs.length > 0 && penLogs[0].inkIds.length > 0) {
        return penLogs[0].inkIds[0];
    }

    return undefined;
};

/**
 * Gets the date when the current ink was put into a pen
 * @param penId The ID of the pen to find the current ink date for
 * @param refillLogs Optional array of refill logs (will fetch all if not provided)
 * @returns The date when the current ink was refilled, or undefined if no refills
 */
export const getMostRecentInkDateForPen = (
    penId: string,
    refillLogs: RefillLog[] = getAllRefillLogs().map((log) => ({
        date: log.date,
        penId: log.penId,
        inkIds: log.inkIds,
        notes: log.notes,
    }))
): string | undefined => {
    // Filter logs for this pen and sort by date (most recent first)
    const penLogs = refillLogs
        .filter((log) => log.penId === penId)
        .sort((a, b) => {
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            return dateB.getTime() - dateA.getTime(); // Most recent first
        });

    // Return the date of the most recent log, if any
    if (penLogs.length > 0) {
        return penLogs[0].date;
    }

    return undefined;
};
