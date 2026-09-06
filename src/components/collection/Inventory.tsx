import { useSearchParams } from 'react-router-dom';
import { inkReferenceSearchText } from '../../lib/inkReference';
import {
    byName,
    inkLabel,
    isCleaning,
    matches,
    penDescription,
    penLabel,
    type Collection,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import { EmptyState, Icon, SearchField } from './Primitives';
import { useInventoryLayout } from '../../hooks/useInventoryLayout';
import PenInventory from './PenInventory';
import InkInventory from './InkInventory';

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
    const [layout, setLayout] = useInventoryLayout(kind);
    const isPens = kind === 'pens';
    const defaultStatus = isPens ? 'inked' : 'in-use';
    const query = params.get('q') || '';
    const brand = params.get('brand') || '';
    const status = params.get('status') || defaultStatus;
    const sort = params.get('sort') || 'name';
    const nib = params.get('nib') || '';
    const update = (key: string, value: string) =>
        setParams(
            (previous) => {
                const next = new URLSearchParams(previous);
                if (value && (key !== 'status' || value !== defaultStatus))
                    next.set(key, value);
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
              ['inked', 'Inked'],
              ['all', 'All pens'],
              ['empty', 'Empty'],
              ['needs-refill', 'Needs refill'],
              ['archived', 'Archived'],
          ]
        : [
              ['in-use', 'In use'],
              ['all', 'All inks'],
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
                (status !== 'needs-refill' || pen.needsRefill) &&
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
                matches(
                    query,
                    ink.brand,
                    ink.name,
                    ink.collection,
                    inkReferenceSearchText(ink),
                ),
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
            {isPens && (status === 'empty' || status === 'needs-refill') && (
                <p className="inventory-status-note small muted">
                    {status === 'needs-refill'
                        ? 'Pens you plan to refill. Log a fresh fill to take one off the list.'
                        : 'All empty pens, including those queued for a refill. Mark a pen “Needs refill” when you’re ready to use it again.'}
                </p>
            )}
            <div className="collection-toolbar">
                <SearchField
                    value={query}
                    onChange={(value) => update('q', value)}
                    placeholder={
                        isPens
                            ? 'Search pens, nibs, or current ink…'
                            : 'Search inks, authors, or properties…'
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
            <div className="results-line inventory-results-line">
                <span aria-live="polite">
                    {count} {kind}
                    {filtered ? ' found' : ' in your collection'}
                </span>
                <div className="inventory-view-actions">
                    {filtered && (
                        <button
                            className="text-link"
                            onClick={() => setParams({ status: 'all' })}
                        >
                            Clear filters <Icon name="close" />
                        </button>
                    )}
                    <div
                        className="layout-switch"
                        role="group"
                        aria-label="Inventory layout"
                    >
                        <button
                            type="button"
                            aria-label="List view"
                            aria-pressed={layout === 'list'}
                            onClick={() => setLayout('list')}
                        >
                            <Icon name="list" />
                            <span>List</span>
                        </button>
                        <button
                            type="button"
                            aria-label="Grid view"
                            aria-pressed={layout === 'grid'}
                            onClick={() => setLayout('grid')}
                        >
                            <Icon name="desk" />
                            <span>Grid</span>
                        </button>
                    </div>
                </div>
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
                <PenInventory
                    pens={pens}
                    layout={layout}
                    model={model}
                    onOpen={onOpen}
                    canEdit={canEdit}
                />
            ) : (
                <InkInventory
                    inks={inks}
                    layout={layout}
                    model={model}
                    onOpen={onOpen}
                    canEdit={canEdit}
                />
            )}
        </>
    );
}
