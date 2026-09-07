import { createContext } from 'react';

export const FavoritesContext = createContext<{
    canEdit: boolean;
    busy: boolean;
    toggle: (kind: 'pen' | 'ink', id: string) => void;
}>({ canEdit: false, busy: false, toggle: () => {} });
