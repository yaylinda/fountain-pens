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
    nibMaterial,
    type DeskFilters,
    type DeskGroup,
    type DeskOrder,
    type DeskState,
    readDeskState,
} from '../../lib/writingDesk';
import { FavoriteMark, EmptyState, Icon, InkNames, RefillPurityMark, Swatch } from './Primitives';
import RefillQueue from './RefillQueue';
import DeskPalette from './DeskPalette';

interface Props {
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}
export default function Overview({ model, onOpen, canEdit }: Props) {
    const [params, setParams] = useSearchParams();
    const state = readDeskState(params.get('desk'));
    const { filters, group, order, selectedInk, view, filtersOpen } = state;
    const update = (patch: Partial<DeskState>, replace = false) => {
        const next = { ...state, ...patch };
        if (JSON.stringify(next) === JSON.stringify(state)) return;
        const nextParams = new URLSearchParams(params);
        nextParams.set('desk', JSON.stringify(next));
        setParams(nextParams, { replace });
    };
    const browsePens = params.get('pens') === '1';
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
    const togglePens = () => {
        const next = new URLSearchParams(params);
        if (browsePens) next.delete('pens'); else next.set('pens', '1');
        next.set('desk', JSON.stringify({ ...state, selectedInk: '' }));
        setParams(next);
    };
    const colorRanks = useMemo(() => deskColorRanks(model), [model]);
    const base = deskRows(model, { brands: {}, nib: '', inkBrand: '' }, 'color', 'none', '', colorRanks);
    const groups = deskRows(model, browsePens ? filters : { brands: {}, nib: '', inkBrand: '' }, browsePens ? order : 'pen', browsePens ? group : 'none', selectedInk, colorRanks);
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
    const brands = [...new Set(model.inked.map((p) => p.brand))].sort(byName);
    const inkBrands = [
        ...new Set(
            model.inked
                .flatMap((p) => model.latest.get(p.id)?.inkIds || [])
                .map((id) => model.inkById.get(id)?.brand)
                .filter((b): b is string => !!b),
        ),
    ].sort(byName);
    const changeFilters = (next: DeskFilters) =>
        update({ filters: next, selectedInk: '', view: '' });
    const preset = (name: string) =>
        update({
            view: name,
            selectedInk: '',
            group: name === 'By color' ? 'color' : 'none',
            order: 'color',
            filters: {
                brands:
                    name === 'Lamy'
                        ? { Lamy: 'include' }
                        : name === 'TWSBI'
                          ? { TWSBI: 'include' }
                          : name === 'Non-TWSBI'
                            ? { TWSBI: 'exclude' }
                            : {},
                nib: name === 'Gold nibs' ? 'Gold' : '',
                inkBrand: '',
            },
        });
    return (
        <>
            <header className="page-header">
                <div>
                    <p className="eyebrow">Ready to write</p>
                    <h1>The writing desk</h1>
                    <p className="page-intro">
                        Find a color, explore a pairing, make it your own.
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
            <DeskPalette key={canEdit ? 'owner' : 'public'} inks={palette} saved={model.palette} palettes={model.palettes}
                activeId={params.get('palette') || ''} onPaletteChange={setPalette}
                penCounts={new Map(palette.map(ink => [ink.id, model.currentPens(ink.id).length]))}
                canEdit={canEdit} selectedInk={selectedInk} onSelect={setSelectedInk} refills={paletteRefills} />
            {!selectedInk && <button className="desk-browse-toggle" aria-expanded={browsePens} aria-controls="desk-pen-browser" onClick={togglePens}>
                <span>{browsePens ? 'Hide inked pens' : 'Browse inked pens'} <span className="count">{model.inked.length}</span></span>
                <span aria-hidden="true">{browsePens ? '−' : '+'}</span>
            </button>}
            {browsePens && <div id="desk-pen-browser">
            <div className="desk-presets" aria-label="Quick views">
                {[
                    'All pens',
                    'Lamy',
                    'TWSBI',
                    'Non-TWSBI',
                    'Gold nibs',
                    'By color',
                ].map((name) => (
                    <button
                        key={name}
                        className="button subtle small-button"
                        aria-pressed={view === name}
                        onClick={() => preset(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <div className="desk-controls">
                <button
                    className="desk-filter-toggle"
                    aria-expanded={filtersOpen}
                    aria-controls="desk-filters"
                    onClick={() => update({ filtersOpen: !filtersOpen }, true)}
                >
                    {filtersOpen ? 'Hide filters' : 'Filter pens'}
                    {Object.keys(filters.brands).length +
                    Number(!!filters.nib) +
                    Number(!!filters.inkBrand)
                        ? ' · active'
                        : ''}
                </button>

                <label>
                    Group by
                    <select
                        value={group}
                        onChange={(e) => {
                            update({
                                group: e.target.value as DeskGroup,
                                view: '',
                            });
                        }}
                    >
                        <option value="none">No grouping</option>
                        <option value="pen">Pen brand</option>
                        <option value="nib">Nib material</option>
                        <option value="ink">Ink brand</option>
                        <option value="color">Ink color family</option>
                    </select>
                </label>
                <label>
                    Order by
                    <select
                        value={order}
                        onChange={(e) => {
                            update({
                                order: e.target.value as DeskOrder,
                                view: '',
                            });
                        }}
                    >
                        <option value="color">Ink color · rainbow</option>
                        <option value="pen">Pen name</option>
                        <option value="ink">Ink name</option>
                        <option value="recent">Recently filled</option>
                    </select>
                </label>
                <button
                    className="text-link"
                    onClick={() => preset('All pens')}
                >
                    Reset
                </button>
                {filtersOpen && (
                    <div className="desk-filter-content" id="desk-filters">
                        <fieldset>
                            <legend>Pen brands</legend>
                            {brands.map((brand) => (
                                <label key={brand}>
                                    {brand}
                                    <select
                                        aria-label={`${brand} filter`}
                                        value={filters.brands[brand] || ''}
                                        onChange={(e) => {
                                            const next = { ...filters.brands };
                                            if (e.target.value)
                                                next[brand] = e.target.value as
                                                    | 'include'
                                                    | 'exclude';
                                            else delete next[brand];
                                            changeFilters({
                                                ...filters,
                                                brands: next,
                                            });
                                        }}
                                    >
                                        <option value="">Any</option>
                                        <option value="include">Include</option>
                                        <option value="exclude">Exclude</option>
                                    </select>
                                </label>
                            ))}
                        </fieldset>
                        <label>
                            Nib material
                            <select
                                value={filters.nib}
                                onChange={(e) =>
                                    changeFilters({
                                        ...filters,
                                        nib: e.target.value,
                                    })
                                }
                            >
                                <option value="">All materials</option>
                                {[...new Set(model.inked.map(nibMaterial))]
                                    .sort(byName)
                                    .map((n) => (
                                        <option key={n}>{n}</option>
                                    ))}
                            </select>
                        </label>
                        <label>
                            Ink brand
                            <select
                                value={filters.inkBrand}
                                onChange={(e) =>
                                    changeFilters({
                                        ...filters,
                                        inkBrand: e.target.value,
                                    })
                                }
                            >
                                <option value="">All ink brands</option>
                                {inkBrands.map((b) => (
                                    <option key={b}>{b}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}
            </div>
            </div>}
            {(browsePens || selectedInk || !model.inked.length) && <>
            <div className="desk-results-summary" aria-live="polite">
                <span>
                    {browsePens ? `${count} of ${model.inked.length} inked pens` : `${count} ${count === 1 ? 'pen' : 'pens'}`}
                    {refillCount > 0 && ` · ${refillCount} need${refillCount === 1 ? 's' : ''} refill`}
                    {selectedInk && model.inkById.get(selectedInk)
                        ? ` · ${inkLabel(model.inkById.get(selectedInk))}`
                        : ''}
                </span>
                <span>
                    {browsePens && Object.entries(filters.brands)
                        .map(
                            ([b, mode]) =>
                                `${mode === 'exclude' ? 'Without' : 'Only'} ${b}`,
                        )
                        .concat(
                            filters.nib ? [`${filters.nib} nibs`] : [],
                            filters.inkBrand ? [filters.inkBrand] : [],
                        )
                        .join(' · ')}
                </span>
            </div>
            {!count && (
                <EmptyState
                    title={
                        model.inked.length
                            ? 'No pens match this selection'
                            : 'A fresh page awaits'
                    }
                >
                    {model.inked.length ? (
                        <button
                            className="text-link"
                            onClick={() => preset('All pens')}
                        >
                            Show all inked pens
                        </button>
                    ) : (
                        'Log a refill to bring your pens and colors to the desk.'
                    )}
                </EmptyState>
            )}
            {groups.map(([name, rows]) => (
                <section className="desk-group" key={name}>
                    <h2>
                        {!browsePens && selectedInk ? `Pens with ${model.inkById.get(selectedInk)?.name || 'this ink'}` : name} <span className="count">{rows.length}</span>
                    </h2>
                    <div className="desk-pairings">
                        {rows.map(({ pen, entry, inks }) => (
                            <article className="desk-pairing" key={pen.id}>
                                <div className="desk-pairing-swatches">
                                    {inks.map((ink) => (
                                        <Swatch key={ink.id} ink={ink} large />
                                    ))}
                                </div>
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
                                            {inks.map((ink) => (
                                                <div key={ink.id}>
                                                    <button
                                                        className="name-link"
                                                        aria-label={`View ${inkLabel(ink)}`}
                                                        data-focus-key={`desk-ink-${pen.id}-${ink.id}`}
                                                        onClick={() =>
                                                            onOpen({ kind: 'ink', item: ink })
                                                        }
                                                    >
                                                        {ink.name}<FavoriteMark item={ink} />
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
            <RefillQueue model={model} onOpen={onOpen} canEdit={canEdit} />
        </>
    );
}
