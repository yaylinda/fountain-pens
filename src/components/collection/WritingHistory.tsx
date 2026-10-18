import { useId, useState } from 'react';
import type { RefillLog, WritingLog } from '../../models/types';
import { formatDate, today } from '../../lib/collection';
import { deleteWritingLog, saveWritingLog } from '../../services/dataService';

export default function WritingHistory({ entry, logs, canEdit, label }: {
    entry: RefillLog; logs: WritingLog[]; canEdit: boolean; label: string;
}) {
    const fieldId = useId();
    const [editing, setEditing] = useState<WritingLog | null>(null);
    const [date, setDate] = useState(today);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const history = logs.filter(log => log.refillId === entry.id).sort((a, b) => b.writtenOn.localeCompare(a.writtenOn));
    const usedToday = history.some(log => log.writtenOn === today());
    const run = async (action: () => Promise<void>, message: string) => {
        setBusy(true); setError(''); setNotice('');
        try { await action(); setEditing(null); setDate(today()); setNotice(message); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not save writing history.'); }
        finally { setBusy(false); }
    };
    if (!entry.id) return null;
    return <section className="writing-history" aria-label={`Writing with ${label}`}>
        <div className="writing-summary">
            <span className="small muted">{history[0] ? <>Last written <time dateTime={history[0].writtenOn}>{formatDate(history[0].writtenOn)}</time></> : 'No writing logged'}</span>
            {canEdit && <button className="button secondary small-button" disabled={busy || usedToday || entry.date > today()} onClick={() => void run(() => saveWritingLog(entry.id!, today()), 'Writing logged for today.')}>
                {usedToday ? 'Used today ✓' : 'Used today'}
            </button>}
        </div>
        <details>
            <summary>Writing history{history.length ? ` · ${history.length} ${history.length === 1 ? 'day' : 'days'}` : ''}</summary>
            <p className="small muted writing-context">This refill · {formatDate(entry.date)}</p>
            {canEdit && <form className="writing-date-form" onSubmit={e => { e.preventDefault(); void run(() => saveWritingLog(entry.id!, date, editing?.id || null), editing ? 'Writing date corrected.' : 'Writing date added.'); }}>
                <label htmlFor={fieldId}>{editing ? 'Correct writing date' : 'Add a writing date'}<input id={fieldId} type="date" value={date} min={entry.date} max={today()} required disabled={busy} onChange={e => setDate(e.target.value)} /></label>
                <button className="button primary small-button" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save date' : 'Add date'}</button>
                {editing && <button type="button" className="button subtle small-button" disabled={busy} onClick={() => { setEditing(null); setDate(today()); }}>Cancel</button>}
            </form>}
            {history.length ? <ul className="writing-dates">{history.map(log => <li key={log.id}>
                <time dateTime={log.writtenOn}>{formatDate(log.writtenOn)}</time>
                {canEdit && <span><button className="text-link" disabled={busy} aria-label={`Correct ${formatDate(log.writtenOn)}`} onClick={() => { setEditing(log); setDate(log.writtenOn); setError(''); document.getElementById(fieldId)?.focus(); }}>Correct</button><button className="text-link" disabled={busy} aria-label={`Remove ${formatDate(log.writtenOn)}`} onClick={() => void run(() => deleteWritingLog(log.id), 'Writing date removed.')}>Remove</button></span>}
            </li>)}</ul> : <p className="small muted">Writing dates will appear here when you log them.</p>}
        </details>
        {error && <p role="alert" className="small">{error}</p>}
        <span role="status" className="small writing-notice">{notice}</span>
    </section>;
}
