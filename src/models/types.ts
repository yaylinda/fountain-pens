export interface Ink {
    id: string;
    version?: string;
    brand: string;
    collection: string;
    name: string;
    colorHex?: string;
    archived?: boolean;
    favorite?: boolean;
}

export interface Pen {
    id: string;
    version?: string;
    brand: string;
    model: string;
    color: string;
    nibSize: string;
    nibType: string;
    archived?: boolean;
    favorite?: boolean;
    needsRefill?: boolean;
}

export interface RefillLog {
    id?: string;
    version?: string;
    sequence?: string;
    date: string;
    penId: string;
    inkIds: string[];
    notes: string;
    notPure?: boolean;
}

// For displaying joined data in the UI
export interface RefillLogDisplay extends RefillLog {
    penDetails: Pen;
    inkDetails: Ink[];
}
