import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    byName,
    inkLabel,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import {
    deskRows,
    deskColorRanks,
    readDeskState,
} from '../../lib/writingDesk';
import { FavoriteMark, EmptyState, Icon, InkNames, RefillPurityMark, Swatch } from './Primitives';
import RefillQueue from './RefillQueue';
import DeskPalette from './DeskPalette';
import WritingHistory from './WritingHistory';

interface Props {
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}
export default function Overview({ model, onOpen, canEdit }: Props) {
    const [params, setParams] = useSearchParams();
    const state = readDeskState(params.get('desk'));
    const { selectedInk } = state;
    const setSelectedInk = (value: string) => {
        const next = new URLSearchParams(params);
        next.set('desk', JSON.stringify({ ...state, selectedInk: value }));
        next.delete('pens');
        setParams(next);
    };
    const setPalette = (id: string) => {
        const next = new URLSearchParams(params);
        next.set('palette', id);
        next.set('desk', JSON.stringify({ ...state, selectedInk: '' }));
        setParams(next, { replace: true });
    };
    const colorRanks = useMemo(() => deskColorRanks(model), [model]);
    const base = deskRows(model, { brands: {}, nib: '', inkBrand: '' }, 'color', 'none', '', colorRanks);
    const groups = selectedInk ? deskRows(model, { brands: {}, nib: '', inkBrand: '' }, 'pen', 'none', selectedInk, colorRanks) : [];
    const count = groups.reduce((n, [, rows]) => n + rows.length, 0);
    const refillCount = groups.reduce(
        (n, [, rows]) => n + rows.filter(({ pen }) => pen.needsRefill).length,
        0,
    );
    const paletteRefills = new Map<string, number>();
    for (const [, rows] of base) {
        for (const { pen, inks } of rows) {
            if (!pen.needsRefill) continue;
            for (const id of new Set(inks.map((ink) => ink.id))) {
                paletteRefills.set(id, (paletteRefills.get(id) || 0) + 1);
            }
        }
    }
    const palette = [
        ...new Map(
            base.flatMap(([, rows]) =>
                rows.flatMap((r) => r.inks.map((i) => [i.id, i] as const)),
            ),
        ).values(),
    ].sort(
        (a, b) =>
            (colorRanks.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
                (colorRanks.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
            byName(inkLabel(a), inkLabel(b)),
    );
    const selected = model.inkById.get(selectedInk);
    return (
        <div className="desk-page">
            <header className="page-header">
                <div>
                    <h1>My Desk</h1>
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
            <div className="desk-workspace">
            <DeskPalette key={canEdit ? 'owner' : 'public'} inks={palette} saved={model.palette} palettes={model.palettes}
                activeId={params.get('palette') || ''} onPaletteChange={setPalette}
                penCounts={new Map(palette.map(ink => [ink.id, model.currentPens(ink.id).length]))}
                canEdit={canEdit} selectedInk={selectedInk} onSelect={setSelectedInk} refills={paletteRefills} />
            <section className="desk-selection" aria-label="Selected ink and pens">
            {selected ? <header className="desk-selection-header">
                <Swatch ink={selected} large />
                <div>
                    <span className="overline">Selected ink</span>
                    <h2><button className="name-link" aria-label={`View ${inkLabel(selected)}`} data-focus-key={`desk-selected-ink-${selected.id}`} onClick={() => onOpen({ kind: 'ink', item: selected })}>{selected.name}<FavoriteMark item={selected} /></button></h2>
                    <span className="small muted">{[selected.brand, selected.collection].filter(Boolean).join(' · ')}</span>
                </div>
                <button className="text-link" aria-label="Close pen details" onClick={() => setSelectedInk('')}>Close</button>
            </header> : <EmptyState title={model.inked.length ? 'Select a color' : 'No inked pens'}>
                {model.inked.length ? 'Choose an ink to see its pens and log your writing.' : 'Log a refill to add an inked pen.'}
            </EmptyState>}
            {selectedInk && <>
            <div className="desk-results-summary" aria-live="polite">
                <span>{`${count} ${count === 1 ? 'pen' : 'pens'} with this ink`}{refillCount > 0 && ` · ${refillCount} need${refillCount === 1 ? 's' : ''} refill`}</span>
            </div>
            {!count && (
                <EmptyState
                    title={
                        model.inked.length
                            ? 'No pens match this selection'
                            : 'No inked pens'
                    }
                >
                    {model.inked.length ? (
                        <button
                            className="text-link"
                            onClick={() => setSelectedInk('')}
                        >
                            Back to palette
                        </button>
                    ) : (
                        'Log a refill to add an inked pen.'
                    )}
                </EmptyState>
            )}
            {groups.map(([name, rows]) => (
                <section className="desk-group" key={name}>
                    <div className="desk-pairings">
                        {rows.map(({ pen, entry, inks }) => (
                            <article className="desk-pairing" key={pen.id}>
                                <div className="pairing-info">
                                    <div className="desk-pen-status">
                                        <span className="overline">{pen.brand}</span>
                                        {pen.needsRefill && (
                                            <span className="badge refill-badge">Needs refill</span>
                                        )}
                                        {inks.length > 0 && <RefillPurityMark entry={entry} />}
                                    </div>
                                    <button
                                        className="name-link"
                                        data-focus-key={`desk-pen-${pen.id}`}
                                        onClick={() =>
                                            onOpen({ kind: 'pen', item: pen })
                                        }
                                    >
                                        {pen.model} · {pen.color}<FavoriteMark item={pen} />
                                    </button>
                                    <span className="small muted">
                                        {pen.nibSize} · {pen.nibType}
                                    </span>
                                    {inks.length ? (
                                        <div className="desk-ink-details">
                                            {inks.filter(ink => ink.id !== selectedInk).map((ink) => (
                                                <div key={ink.id}>
                                                    <button
                                                        className="name-link"
                                                        aria-label={`View ${inkLabel(ink)}`}
                                                        data-focus-key={`desk-ink-${pen.id}-${ink.id}`}
                                                        onClick={() =>
                                                            onOpen({ kind: 'ink', item: ink })
                                                        }
                                                    >
                                                        Also {ink.name}<FavoriteMark item={ink} />
                                                    </button>
                                                    <span className="small muted">
                                                        {[
                                                            ink.brand,
                                                            ink.collection,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <InkNames entry={entry} model={model} />
                                    )}
                                </div>
                                <WritingHistory entry={entry} logs={model.writingLogs} canEdit={canEdit} label={`${pen.brand} ${pen.model} ${pen.color}`} />
                                {canEdit && (
                                    <button
                                        className="button subtle small-button"
                                        aria-label={`Refill ${pen.brand} ${pen.model} ${pen.color}`}
                                        onClick={() =>
                                            onOpen({
                                                kind: 'refill',
                                                draft: {
                                                    penId: pen.id,
                                                    inkIds: entry.inkIds,
                                                    date: '',
                                                    notes: '',
                                                },
                                            })
                                        }
                                    >
                                        Refill
                                    </button>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            ))}
            </>}
            </section>
            </div>
            <RefillQueue model={model} onOpen={onOpen} canEdit={canEdit} />
        </div>
    );
}
