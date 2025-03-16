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

export interface CurrentlyInked {
    id: string;
    date: string;
    penId: string;
    inkId: string;
    notes: string;
}

// For displaying joined data in the UI
export interface CurrentlyInkedDisplay extends CurrentlyInked {
    penDetails: Pen;
    inkDetails: Ink;
}
