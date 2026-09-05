import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    formatDate,
    formatMonth,
    inkLabel,
    isCleaning,
    matches,
    penDescription,
    penLabel,
    type CollectionModel,
    type EditorState,
    type JournalEntry,
} from '../../lib/collection';
import { EmptyState, Icon, InkNames, SearchField } from './Primitives';

interface Props {
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}
export default function Journal({ model, onOpen, canEdit }: Props) {
    const [params, setParams] = useSearchParams();
    const [limit, setLimit] = useState(30);
    const query = params.get('q') || '';
    const type = params.get('type') || 'all';
    const penId = params.get('pen') || '';
    const from = params.get('from') || '';
    const to = params.get('to') || '';
    const update = (key: string, value: string) => {
        setLimit(30);
        setParams(
            (previous) => {
                const next = new URLSearchParams(previous);
                if (value && value !== 'all') next.set(key, value);
                else next.delete(key);
                return next;
            },
            { replace: true },
        );
    };
    const entries = model.journal.filter((entry) => {
        const pen = model.penById.get(entry.penId);
        return (
            (!penId || entry.penId === penId) &&
            (type === 'all' ||
                (type === 'cleaning'
                    ? isCleaning(entry)
                    : !isCleaning(entry))) &&
            (!from || entry.date >= from) &&
            (!to || entry.date <= to) &&
            matches(
                query,
                penLabel(pen),
                pen ? penDescription(pen) : '',
                ...entry.inkIds.map((id) => inkLabel(model.inkById.get(id))),
                entry.notes,
            )
        );
    });
    const groups = new Map<string, JournalEntry[]>();
    for (const entry of entries.slice(0, limit)) {
        const key = entry.date.slice(0, 7);
        groups.set(key, [...(groups.get(key) || []), entry]);
    }
    const filtered = !!(query || penId || from || to || type !== 'all');
    return (
        <>
            <header className="page-header">
                <div>
                    <p className="eyebrow">One fill at a time</p>
                    <h1>The refill journal</h1>
                    <p className="page-intro">
                        The colors you’ve used and the pens you’ve reached for.
                    </p>
                </div>
                {canEdit && (
                    <button
                        className="button primary"
                        onClick={() => onOpen({ kind: 'refill' })}
                    >
                        <Icon name="plus" />
                        Log a refill
                    </button>
                )}
            </header>
            <div className="filter-tabs" aria-label="Entry type">
                {[
                    ['all', 'All entries'],
                    ['refill', 'Refills'],
                    ['cleaning', 'Cleanings'],
                ].map(([value, label]) => (
                    <button
                        key={value}
                        aria-pressed={type === value}
                        className={type === value ? 'active' : ''}
                        onClick={() => update('type', value)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="collection-toolbar">
                <SearchField
                    value={query}
                    onChange={(value) => update('q', value)}
                    placeholder="Search pens, inks, or notes…"
                />
                <label className="select-label">
                    <span className="sr-only">Filter by pen</span>
                    <select
                        value={penId}
                        onChange={(event) => update('pen', event.target.value)}
                    >
                        <option value="">All pens</option>
                        {[...model.penById.values()]
                            .sort((a, b) =>
                                penLabel(a).localeCompare(penLabel(b)),
                            )
                            .map((pen) => (
                                <option key={pen.id} value={pen.id}>
                                    {penLabel(pen)} · {pen.color} ·{' '}
                                    {pen.nibSize}
                                </option>
                            ))}
                    </select>
                </label>
                <details className="date-filter">
                    <summary>Date range{from || to ? ' •' : ''}</summary>
                    <div>
                        <label>
                            From
                            <input
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(event) =>
                                    update('from', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            To
                            <input
                                type="date"
                                value={to}
                                min={from || undefined}
                                onChange={(event) =>
                                    update('to', event.target.value)
                                }
                            />
                        </label>
                    </div>
                </details>
            </div>
            <div className="results-line">
                <span aria-live="polite">
                    {entries.length} entries
                    {filtered ? ' found' : ' in your journal'}
                </span>
                {filtered && (
                    <button
                        className="text-link"
                        onClick={() => {
                            setParams({});
                            setLimit(30);
                        }}
                    >
                        Clear filters <Icon name="close" />
                    </button>
                )}
            </div>
            {!entries.length && (
                <EmptyState
                    title={
                        filtered
                            ? 'No entries match just yet'
                            : 'Your journal starts here'
                    }
                >
                    {filtered
                        ? 'Try another pen, date range, or search.'
                        : 'Record your first refill and keep the details worth remembering.'}
                </EmptyState>
            )}
            <div className="journal">
                {[...groups].map(([month, rows]) => (
                    <section className="journal-month" key={month}>
                        <h2>{formatMonth(month)}</h2>
                        <div>
                            {rows.map((entry) => {
                                const pen = model.penById.get(entry.penId);
                                return (
                                    <article
                                        className="journal-entry"
                                        key={entry.index}
                                    >
                                        <time dateTime={entry.date}>
                                            <strong>
                                                {entry.date.slice(8, 10)}
                                            </strong>
                                            <span>
                                                {
                                                    formatDate(
                                                        entry.date,
                                                        true,
                                                    ).split(' ')[0]
                                                }
                                            </span>
                                        </time>
                                        <div className="journal-entry-content">
                                            <div className="journal-entry-title">
                                                <button
                                                    className="name-link"
                                                    onClick={() =>
                                                        onOpen({
                                                            kind: 'refill',
                                                            draft: entry,
                                                        })
                                                    }
                                                >
                                                    {penLabel(pen)}
                                                </button>
                                                <span
                                                    className={`badge ${isCleaning(entry) ? 'neutral' : ''}`}
                                                >
                                                    {isCleaning(entry)
                                                        ? 'Cleaned'
                                                        : entry.inkIds.length >
                                                            1
                                                          ? 'Ink mix'
                                                          : 'Refill'}
                                                </span>
                                            </div>
                                            <p className="small muted">
                                                {pen
                                                    ? penDescription(pen)
                                                    : 'Historical inventory entry'}
                                            </p>
                                            <InkNames
                                                entry={entry}
                                                model={model}
                                            />
                                            {entry.notes && (
                                                <p className="journal-notes">
                                                    {entry.notes}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            className="icon-button"
                                            aria-label={`${canEdit ? 'Edit' : 'View'} ${penLabel(pen)} entry from ${formatDate(entry.date)}`}
                                            onClick={() =>
                                                onOpen({
                                                    kind: 'refill',
                                                    draft: entry,
                                                })
                                            }
                                        >
                                            <Icon
                                                name={
                                                    canEdit ? 'edit' : 'arrow'
                                                }
                                            />
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
            {entries.length > limit && (
                <div className="load-more">
                    <span className="small muted">
                        Showing {Math.min(limit, entries.length)} of{' '}
                        {entries.length}
                    </span>
                    <button
                        className="button secondary"
                        onClick={() => setLimit((value) => value + 30)}
                    >
                        Show 30 more entries
                    </button>
                </div>
            )}
        </>
    );
}
