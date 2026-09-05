import { captureSaveOrigin, celebrateSave } from '../lib/saveCelebration';
import { Ink, Pen, RefillLog } from '../models/types';

/**
 * Shows a quick toast notification to the user
 */
export const showNotification = (message: string, isError = false): void => {
    // Create a toast element
    const toast = document.createElement('div');
    toast.className = `save-notification ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    toast.setAttribute('role', isError ? 'alert' : 'status');

    // Add to document
    document.body.appendChild(toast);

    // Fade out and remove after 3 seconds
    setTimeout(
        () => {
            toast.remove();
        },
        isError ? 8000 : 3000,
    );
};

/**
 * Writes data to the specified JSON file
 * @param filename The name of the file to write to (without path or extension)
 * @param data The data to write to the file
 */
const pendingWrites = new Map<string, Promise<boolean>>();

export const writeJsonFile = async <T>(
    filename: string,
    data: T,
): Promise<boolean> => {
    // Capture the initiating control before a queued write waits or the editor closes.
    const origin = captureSaveOrigin();
    // Snapshot at invocation time; later edits must not change queued payloads.
    const body = JSON.stringify({ filename, data });
    const previous = pendingWrites.get(filename);
    const send = () => sendJsonFile(filename, body, origin);
    const write = previous ? previous.then(send, send) : send();
    pendingWrites.set(filename, write);
    const cleanup = () => {
        if (pendingWrites.get(filename) === write) pendingWrites.delete(filename);
    };
    void write.then(cleanup, cleanup);
    return write;
};

const sendJsonFile = async (
    filename: string,
    body: string,
    origin: ReturnType<typeof captureSaveOrigin>,
): Promise<boolean> => {
    try {
        const response = await fetch(`/api/save-json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to save ${filename}.json: ${errorText}`);
            showNotification(`Failed to save ${filename} data`, true);
            return false;
        }

        celebrateSave(origin);
        return true;
    } catch (error) {
        console.error(`Error saving ${filename}.json:`, error);
        showNotification(`Error saving ${filename} data`, true);
        return false;
    }
};

/**
 * Writes refill log data to the refillLog.json file
 * @param data The refill log data to write
 */
export const saveRefillLogsToFile = (data: RefillLog[]): Promise<boolean> => {
    return writeJsonFile('refillLog', data);
};

/**
 * Writes pens data to the pens.json file
 * @param data The pens data to write
 */
export const savePensToFile = (data: Pen[]): Promise<boolean> => {
    return writeJsonFile('pens', data);
};

/**
 * Writes inks data to the inks.json file
 * @param data The inks data to write
 */
export const saveInksToFile = (data: Ink[]): Promise<boolean> => {
    return writeJsonFile('inks', data);
};
