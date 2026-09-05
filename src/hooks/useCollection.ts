import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    getAllInks,
    getAllPens,
    getAllRefillLogs,
    loadData,
} from '../services/dataService';
import { deriveCollection, type Collection } from '../lib/collection';

const readCollection = (): Collection => ({
    pens: getAllPens(),
    inks: getAllInks(),
    entries: getAllRefillLogs(),
});

export function useCollection() {
    const [collection, setCollection] = useState<Collection>(readCollection);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        loadData()
            .then(() => {
                if (active) {
                    setCollection(readCollection());
                    setLoading(false);
                }
            })
            .catch(() => {
                if (active) {
                    setError(true);
                    setLoading(false);
                }
            });
        return () => {
            active = false;
        };
    }, [attempt]);
    const refresh = useCallback(() => setCollection(readCollection()), []);
    const retry = () => {
        setLoading(true);
        setError(false);
        setAttempt((value) => value + 1);
    };
    const model = useMemo(() => deriveCollection(collection), [collection]);
    return { collection, model, loading, error, refresh, retry };
}
