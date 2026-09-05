import { useEffect } from 'react';

export function useDraft(
    initial: unknown,
    value: unknown,
    onDirty: (dirty: boolean) => void,
    resumed = false,
) {
    const dirty = resumed || JSON.stringify(initial) !== JSON.stringify(value);
    useEffect(() => {
        onDirty(dirty);
        return () => onDirty(false);
    }, [dirty, onDirty]);
    return dirty;
}
