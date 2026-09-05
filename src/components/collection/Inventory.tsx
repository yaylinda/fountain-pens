import { useSearchParams } from 'react-router-dom';
import {
    byName,
    formatDate,
    inkLabel,
    isCleaning,
    matches,
    penDescription,
    penLabel,
    type Collection,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import { EmptyState, Icon, InkNames, SearchField, Swatch } from './Primitives';

interface Props {
    kind: 'pens' | 'inks';
    collection: Collection;
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}
export default function Inventory({
    kind,
    collection,
    model,
    onOpen,
    canEdit,
}: Props) {
    const [params, setParams] = useSearchParams();
    const query = params.get('q') || '';
    const brand = params.get('brand') || '';
    const status = params.get('status') || 'all';
    const sort = params.get('sort') || 'name';
    const nib = params.get('nib') || '';
    const isPens = kind === 'pens';
    const update = (key: string, value: string) =>
        setParams(
            (previous) => {
                const next = new URLSearchParams(previous);
                if (value && value !== 'all') next.set(key, value);
                else next.delete(key);
                return next;
            },
            { replace: true },
        );
    const items = isPens
        ? collection.pens
        : collection.inks.filter((ink) => ink.id !== 'NONE');
    const brands = [...new Set(items.map((item) => item.brand))].sort(byName);
    const statuses = isPens
        ? [
              ['all', 'All pens'],
              ['inked', 'Inked'],
              ['empty', 'Empty'],
              ['archived', 'Archived'],
          ]
        : [
              ['all', 'All inks'],
              ['in-use', 'In use'],
              ['untried', 'Untried'],
              ['archived', 'Archived'],
          ];
    const pens = collection.pens
        .filter((pen) => {
            const entry = model.latest.get(pen.id);
            const inked = !!entry && !isCleaning(entry);
            return (
                (status === 'archived' ? pen.archived : !pen.archived) &&
                (!brand || pen.brand === brand) &&
                (!nib || pen.nibSize === nib) &&
                (status !== 'inked' || inked) &&
                (status !== 'empty' || !inked) &&
                matches(
                    query,
                    penLabel(pen),
                    penDescription(pen),
                    ...(entry?.inkIds.map((id) =>
                        inkLabel(model.inkById.get(id)),
                    ) || []),
                )
            );
        })
        .sort(
            (a, b) =>
                (sort === 'uses'
                    ? model.penCount(b.id) - model.penCount(a.id)
                    : sort === 'recent'
                      ? (model.latest.get(b.id)?.date || '').localeCompare(
                            model.latest.get(a.id)?.date || '',
                        )
                      : 0) ||
                byName(penLabel(a), penLabel(b)) ||
                byName(penDescription(a), penDescription(b)),
        );
    const inks = collection.inks
        .filter(
            (ink) =>
                ink.id !== 'NONE' &&
                (status === 'archived' ? ink.archived : !ink.archived) &&
                (!brand || ink.brand === brand) &&
                (status !== 'in-use' || model.currentPens(ink.id).length > 0) &&
                (status !== 'untried' || model.inkCount(ink.id) === 0) &&
                matches(query, ink.brand, ink.name, ink.collection),
        )
        .sort(
            (a, b) =>
                (sort === 'uses'
                    ? model.inkCount(b.id) - model.inkCount(a.id)
                    : sort === 'recent'
                      ? (
                            model.inkHistory.get(b.id)?.[0]?.date || ''
                        ).localeCompare(
                            model.inkHistory.get(a.id)?.[0]?.date || '',
                        )
                      : 0) || byName(inkLabel(a), inkLabel(b)),
        );
    const count = isPens ? pens.length : inks.length;
    const filtered = !!(query || brand || nib || status !== 'all');
    return (
        <>
            <header className="page-header">
                <div>
                    <p className="eyebrow">The collection</p>
                    <h1>{isPens ? 'Fountain pens' : 'The ink cabinet'}</h1>
                    <p className="page-intro">
                        {isPens
                            ? 'Every nib, every finish, every favorite pairing.'
                            : 'A world of color, ready for your next page.'}
                    </p>
                </div>
                {canEdit && (
                    <button
                        className="button primary"
                        onClick={() => onOpen({ kind: isPens ? 'pen' : 'ink' })}
                    >
                        <Icon name="plus" />
                        Add {isPens ? 'a pen' : 'an ink'}
                    </button>
                )}
            </header>
            <div className="filter-tabs" aria-label={`${kind} status`}>
                {statuses.map(([value, label]) => (
                    <button
                        key={value}
                        aria-pressed={status === value}
                        className={status === value ? 'active' : ''}
                        onClick={() => update('status', value)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="collection-toolbar">
                <SearchField
                    value={query}
                    onChange={(value) => update('q', value)}
                    placeholder={
                        isPens
                            ? 'Search pens, nibs, or current ink…'
                            : 'Search inks, brands, or collections…'
                    }
                />
                <label className="select-label">
                    <span className="sr-only">Brand</span>
                    <select
                        value={brand}
                        onChange={(event) =>
                            update('brand', event.target.value)
                        }
                    >
                        <option value="">All brands</option>
                        {brands.map((value) => (
                            <option key={value}>{value}</option>
                        ))}
                    </select>
                </label>
                {isPens && (
                    <label className="select-label">
                        <span className="sr-only">Nib size</span>
                        <select
                            value={nib}
                            onChange={(event) =>
                                update('nib', event.target.value)
                            }
                        >
                            <option value="">All nibs</option>
                            {[
                                ...new Set(
                                    collection.pens
                                        .map((pen) => pen.nibSize)
                                        .filter(Boolean),
                                ),
                            ]
                                .sort(byName)
                                .map((value) => (
                                    <option key={value}>{value}</option>
                                ))}
                        </select>
                    </label>
                )}
                <label className="select-label">
                    <span className="sr-only">Sort collection</span>
                    <select
                        value={sort}
                        onChange={(event) => update('sort', event.target.value)}
                    >
                        <option value="name">Name A–Z</option>
                        <option value="uses">Most used</option>
                        <option value="recent">Recently inked</option>
                    </select>
                </label>
            </div>
            <div className="results-line">
                <span aria-live="polite">
                    {count} {kind}
                    {filtered ? ' found' : ' in your collection'}
                </span>
                {filtered && (
                    <button className="text-link" onClick={() => setParams({})}>
                        Clear filters <Icon name="close" />
                    </button>
                )}
            </div>
            {!count ? (
                <EmptyState
                    title={
                        filtered
                            ? 'No matches on this shelf'
                            : `Room for your first ${isPens ? 'pen' : 'ink'}`
                    }
                >
                    {filtered
                        ? 'Try a different search or clear your filters.'
                        : 'Add a few details to begin your collection.'}
                </EmptyState>
            ) : isPens ? (
                <div className="pen-table-wrap">
                    <table className="pen-table">
                        <thead>
                            <tr>
                                <th scope="col">Pen / finish</th>
                                <th scope="col">Nib</th>
                                <th scope="col">Latest ink</th>
                                <th scope="col">Refills</th>
                                <th scope="col">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {pens.map((pen) => (
                                <tr key={pen.id}>
                                    <td>
                                        <button
                                            className="inventory-name"
                                            data-focus-key={`pen-${pen.id}`}
                                            onClick={() =>
                                                onOpen({
                                                    kind: 'pen',
                                                    item: pen,
                                                })
                                            }
                                        >
                                            <span className="overline">
                                                {pen.brand}
                                            </span>
                                            <strong>{pen.model}</strong>
                                            <span className="small muted">
                                                {pen.color ||
                                                    'No finish recorded'}
                                            </span>
                                        </button>
                                    </td>
                                    <td data-label="Nib">
                                        <span>{pen.nibSize || '—'}</span>
                                        <span className="small muted block">
                                            {pen.nibType}
                                        </span>
                                    </td>
                                    <td data-label="Latest ink">
                                        <InkNames
                                            entry={model.latest.get(pen.id)}
                                            model={model}
                                        />
                                        <span className="small muted block">
                                            {formatDate(
                                                model.latest.get(pen.id)?.date,
                                            )}
                                        </span>
                                    </td>
                                    <td
                                        data-label="Refills"
                                        className="tabular"
                                    >
                                        {model.penCount(pen.id)}
                                    </td>
                                    <td className="row-actions">
                                        <button
                                            className="icon-button"
                                            aria-label={`${canEdit ? 'Edit' : 'View'} ${penLabel(pen)}, ${penDescription(pen)}`}
                                            data-focus-key={`pen-${pen.id}`}
                                            onClick={() =>
                                                onOpen({
                                                    kind: 'pen',
                                                    item: pen,
                                                })
                                            }
                                        >
                                            <Icon
                                                name={
                                                    canEdit ? 'edit' : 'arrow'
                                                }
                                            />
                                        </button>
                                        {canEdit && !pen.archived && (
                                            <button
                                                className="button subtle small-button"
                                                onClick={() =>
                                                    onOpen({
                                                        kind: 'refill',
                                                        draft: {
                                                            penId: pen.id,
                                                            date: '',
                                                            inkIds:
                                                                model.latest.get(
                                                                    pen.id,
                                                                )?.inkIds || [],
                                                            notes: '',
                                                        },
                                                    })
                                                }
                                            >
                                                Refill
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="ink-grid">
                    {inks.map((ink) => {
                        const current = model.currentPens(ink.id);
                        return (
                            <button
                                key={ink.id}
                                className="ink-card"
                                data-focus-key={`ink-${ink.id}`}
                                onClick={() =>
                                    onOpen({ kind: 'ink', item: ink })
                                }
                            >
                                <div className="ink-card-color">
                                    <Swatch ink={ink} large />
                                    <span className="ink-card-action">
                                        <Icon
                                            name={canEdit ? 'edit' : 'arrow'}
                                        />
                                    </span>
                                </div>
                                <span className="overline">{ink.brand}</span>
                                <h2>{ink.name}</h2>
                                <span className="ink-collection">
                                    {ink.collection || 'Standard collection'}
                                </span>
                                <span className="ink-card-footer">
                                    <span>
                                        {model.inkCount(ink.id)
                                            ? `${model.inkCount(ink.id)} refills`
                                            : 'Not tried yet'}
                                    </span>
                                    {current.length > 0 && (
                                        <span className="status-dot">
                                            In {current.length}{' '}
                                            {current.length === 1
                                                ? 'pen'
                                                : 'pens'}
                                        </span>
                                    )}
                                    {ink.archived && <span>Archived</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}
