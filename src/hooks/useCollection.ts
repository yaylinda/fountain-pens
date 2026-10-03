import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getCollection, getActiveOwner, getCollectionWarning, isDataLoaded, loadData, subscribeCollection } from '../services/dataService';
import { deriveCollection, today } from '../lib/collection';

export function useCollection() {
    const owner = useSyncExternalStore(subscribeCollection, getActiveOwner);
    const opened = useRef(isDataLoaded());
    const collection = useSyncExternalStore(subscribeCollection, getCollection);
    const warning = useSyncExternalStore(subscribeCollection, getCollectionWarning);
    const [loading, setLoading] = useState(!isDataLoaded());
    const [error, setError] = useState('');
    const clientDay = useRef(today());
    const retry = useCallback(async () => {
        setLoading(!opened.current); setError('');
        try { await loadData(true); if (isDataLoaded()) opened.current = true; } catch { setError('Your collection could not refresh. Check your connection and try again.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => {
        void retry();
        const refetch = () => { clientDay.current = today(); void retry(); };
        window.addEventListener('focus', refetch);
        window.addEventListener('online', refetch);
        const timer = window.setInterval(() => { if (clientDay.current !== today()) refetch(); }, 30_000);
        return () => { window.removeEventListener('focus', refetch); window.removeEventListener('online', refetch); window.clearInterval(timer); };
    }, [retry, owner]);
    const model = useMemo(() => deriveCollection(collection, collection.asOf || today()), [collection]);
    return { collection, model, loading, error: !opened.current && error, warning: warning || (opened.current ? error : ''), refresh: () => {}, retry };
}
