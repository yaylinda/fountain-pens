import { useState } from 'react';
import { getCollection, loadData } from '../../services/dataService';
import type { Ink, Pen, RefillLog } from '../../models/types';

export function ConflictRecovery({ kind, id, onRebase }: { kind: 'pen' | 'ink' | 'refill'; id: string; onRebase: (item: Pen | Ink | RefillLog) => void }) {
    const [latest, setLatest] = useState<Pen | Ink | RefillLog>();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const review = async () => {
        setBusy(true); setError('');
        try {
            await loadData(true);
            const c = getCollection();
            const item = (kind === 'pen' ? c.pens : kind === 'ink' ? c.inks : c.entries).find(x => x.id === id);
            if (!item) setError('This item was removed. Your draft remains here for reference.');
            setLatest(item);
        } catch { setError('Could not load the latest item. Your draft is kept.'); }
        finally { setBusy(false); }
    };
    return <aside className="draft-notice">
        <button type="button" className="button secondary" disabled={busy} onClick={review}>Review latest saved item</button>
        {error && <p role="alert">{error}</p>}
        {latest && <div><strong>Latest saved details</strong><dl>{Object.entries(latest).filter(([key]) => !['id', 'version', 'sequence', 'index'].includes(key)).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value ?? '')}</dd></div>)}</dl>
            <p>Your draft is unchanged. Saving it will replace these saved details.</p>
            <button type="button" className="button secondary" onClick={() => { onRebase(latest); setLatest(undefined); }}>Keep my draft using this version</button>
        </div>}
    </aside>;
}
