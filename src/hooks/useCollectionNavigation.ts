import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Keep each inventory's filters when switching sections. URLs remain shareable. */
export function useCollectionNavigation() {
    const location = useLocation();
    const saved = useRef({ pens: '/pens', inks: '/inks', last: 'pens' as 'pens' | 'inks' });
    const kind = location.pathname === '/pens' ? 'pens' : location.pathname === '/inks' ? 'inks' : null;
    const params = new URLSearchParams(location.search);
    params.delete('editor');
    params.delete('id');
    const search = params.toString();
    const url = `${location.pathname}${search ? `?${search}` : ''}`;
    useEffect(() => {
        if (kind) saved.current = { ...saved.current, [kind]: url, last: kind };
    }, [kind, url]);
    const targets: { pens: string; inks: string; last: 'pens' | 'inks' } = {
        ...saved.current, ...(kind ? { [kind]: url, last: kind } : {}),
    };
    return { targets, active: kind, home: targets[targets.last] };
}
