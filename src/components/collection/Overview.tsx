import { useSearchParams } from 'react-router-dom';
import {
    byName,
    inkLabel,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import {
    deskRows,
    inkColor,
    nibMaterial,
    type DeskFilters,
    type DeskGroup,
    type DeskOrder,
    type DeskState,
    readDeskState,
} from '../../lib/writingDesk';
import { EmptyState, Icon, InkNames, Swatch } from './Primitives';

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
    const setSelectedInk = (value: string) => update({ selectedInk: value });
    const base = deskRows(model, filters, order, group);
    const groups = deskRows(model, filters, order, group, selectedInk);
    const count = groups.reduce((n, [, rows]) => n + rows.length, 0);
    const palette = [
        ...new Map(
            base.flatMap(([, rows]) =>
                rows.flatMap((r) => r.inks.map((i) => [i.id, i] as const)),
            ),
        ).values(),
    ].sort(
        (a, b) =>
            inkColor(a).hue - inkColor(b).hue ||
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
                        Arrange your pens for a little time on paper.
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
            <section className="desk-palette" aria-label="Current ink palette">
                <div className="section-heading">
                    <h2>
                        Your palette{' '}
                        <span className="count">{palette.length}</span>
                    </h2>
                    {selectedInk && (
                        <button
                            className="text-link"
                            onClick={() => setSelectedInk('')}
                        >
                            Show all colors
                        </button>
                    )}
                </div>
                <div className="desk-color-list">
                    {palette.map((ink) => (
                        <button
                            key={ink.id}
                            title={[ink.brand, ink.collection, ink.name]
                                .filter(Boolean)
                                .join(' · ')}
                            aria-label={`Filter to ${inkLabel(ink)}`}
                            aria-pressed={selectedInk === ink.id}
                            onClick={() =>
                                setSelectedInk(
                                    selectedInk === ink.id ? '' : ink.id,
                                )
                            }
                        >
                            <Swatch ink={ink} large />
                            <span>{ink.name}</span>
                        </button>
                    ))}
                </div>
                <p className="small muted">
                    Select a color to see its pens. Colors and color families
                    are approximate.
                </p>
            </section>
            <div className="desk-results-summary" aria-live="polite">
                <span>
                    {count} of {model.inked.length} inked pens
                    {selectedInk && model.inkById.get(selectedInk)
                        ? ` · ${inkLabel(model.inkById.get(selectedInk))}`
                        : ''}
                </span>
                <span>
                    {Object.entries(filters.brands)
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
                        {name} <span className="count">{rows.length}</span>
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
                                    <span className="overline">
                                        {pen.brand}
                                    </span>
                                    <button
                                        className="name-link"
                                        data-focus-key={`desk-pen-${pen.id}`}
                                        onClick={() =>
                                            onOpen({ kind: 'pen', item: pen })
                                        }
                                    >
                                        {pen.model} · {pen.color}
                                    </button>
                                    <span className="small muted">
                                        {pen.nibSize} · {pen.nibType}
                                    </span>
                                    {inks.length ? (
                                        <div className="desk-ink-details">
                                            {inks.map((ink) => (
                                                <div key={ink.id}>
                                                    <span>{ink.name}</span>
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
        </>
    );
}
