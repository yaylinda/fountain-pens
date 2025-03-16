import { Ink, Pen, RefillLog } from '../models/types';

/**
 * Shows a quick toast notification to the user
 */
export const showNotification = (message: string, isError = false): void => {
    // Create a toast element
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '4px';
    toast.style.color = 'white';
    toast.style.backgroundColor = isError ? '#f44336' : '#4caf50';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.transition = 'opacity 0.3s';

    // Add to document
    document.body.appendChild(toast);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
};

/**
 * Writes data to the specified JSON file
 * @param filename The name of the file to write to (without path or extension)
 * @param data The data to write to the file
 */
export const writeJsonFile = async <T>(
    filename: string,
    data: T
): Promise<boolean> => {
    try {
        const response = await fetch(`/api/save-json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename,
                data,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to save ${filename}.json: ${errorText}`);
            showNotification(`Failed to save ${filename} data`, true);
            return false;
        }

        showNotification(`${filename} data saved successfully`);
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
