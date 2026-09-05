import { useState } from 'react';

export type InventoryLayout = 'list' | 'grid';
type InventoryKind = 'pens' | 'inks';
type Layouts = Record<InventoryKind, InventoryLayout>;
const storageKey = 'ink-and-nib:inventory-layouts:v1';
const defaults: Layouts = { pens: 'list', inks: 'grid' };

function readLayouts(): Layouts {
    try {
        const saved = JSON.parse(
            window.localStorage.getItem(storageKey) || '{}',
        );
        return {
            pens: saved?.pens === 'grid' ? 'grid' : 'list',
            inks: saved?.inks === 'list' ? 'list' : 'grid',
        };
    } catch {
        return defaults;
    }
}

export function useInventoryLayout(kind: InventoryKind) {
    const [layouts, setLayouts] = useState<Layouts>(readLayouts);
    const setLayout = (layout: InventoryLayout) => {
        const next = { ...layouts, [kind]: layout };
        setLayouts(next);
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
            // The switch still works when browser storage is unavailable.
        }
    };
    return [layouts[kind], setLayout] as const;
}
