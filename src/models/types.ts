import type { InkReference } from '../lib/inkReference';

export interface SourceLink { label: string; url: string; supports?: string[] }
export interface SwatchReference { name: string; hex: string | null; url: string; note: string | null }

export interface Ink {
    reference?: Omit<InkReference, 'description' | 'sources'>;
    swatchReference?: SwatchReference;
    id: string;
    details?: string;
    sources?: SourceLink[];
    brand: string;
    collection: string;
    name: string;
    colorHex?: string;
    archived?: boolean;
    favorite?: boolean;
}

export interface Pen {
    id: string;
    details?: string;
    sources?: SourceLink[];
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
