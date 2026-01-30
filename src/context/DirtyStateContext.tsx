import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { setOnMutationCallback } from '../services/dataService';

interface DirtyStateContextType {
    isDirty: boolean;
    setDirty: (dirty: boolean) => void;
}

const DirtyStateContext = createContext<DirtyStateContextType | undefined>(
    undefined
);

export function DirtyStateProvider({ children }: { children: ReactNode }) {
    const [isDirty, setIsDirty] = useState(false);

    const setDirty = (dirty: boolean) => {
        setIsDirty(dirty);
    };

    useEffect(() => {
        setOnMutationCallback(() => setIsDirty(true));
        return () => setOnMutationCallback(null);
    }, []);

    return (
        <DirtyStateContext.Provider value={{ isDirty, setDirty }}>
            {children}
        </DirtyStateContext.Provider>
    );
}

export function useDirtyState(): DirtyStateContextType {
    const context = useContext(DirtyStateContext);
    if (context === undefined) {
        throw new Error(
            'useDirtyState must be used within a DirtyStateProvider'
        );
    }
    return context;
}
