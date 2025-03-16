export interface Ink {
    id: string;
    brand: string;
    collection: string;
    name: string;
}

export interface Pen {
    id: string;
    brand: string;
    model: string;
    color: string;
    nibSize: string;
    nibType: string;
}

export interface RefillLog {
    date: string;
    penId: string;
    inkIds: string[];
    notes: string;
}

// For displaying joined data in the UI
export interface RefillLogDisplay extends RefillLog {
    penDetails: Pen;
    inkDetails: Ink[];
}
