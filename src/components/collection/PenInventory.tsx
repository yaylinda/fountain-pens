import type { Pen } from '../../models/types';
import type { InventoryLayout } from '../../hooks/useInventoryLayout';
import {
    EMPTY_INK_ID,
    formatDate,
    penDescription,
    penLabel,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import { Icon, InkNames } from './Primitives';

interface Props {
    pens: Pen[];
    layout: InventoryLayout;
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}
function PenActions({
    pen,
    model,
    onOpen,
    canEdit,
}: Omit<Props, 'pens' | 'layout'> & { pen: Pen }) {
    return (
        <span className="pen-actions">
            <button
                type="button"
                className="icon-button"
                aria-label={`${canEdit ? 'Edit' : 'View'} ${penLabel(pen)}, ${penDescription(pen)}`}
                data-focus-key={`pen-${pen.id}`}
                onClick={() => onOpen({ kind: 'pen', item: pen })}
            >
                <Icon name={canEdit ? 'edit' : 'arrow'} />
            </button>
            {canEdit && !pen.archived && (
                <button
                    type="button"
                    className="button subtle small-button"
                    data-focus-key={`pen-${pen.id}`}
                    onClick={() =>
                        onOpen({
                            kind: 'refill',
                            draft: {
                                penId: pen.id,
                                date: '',
                                inkIds:
                                    model.latest
                                        .get(pen.id)
                                        ?.inkIds.filter(
                                            (id) => id !== EMPTY_INK_ID,
                                        ) || [],
                                notes: '',
                            },
                        })
                    }
                >
                    Refill
                </button>
            )}
        </span>
    );
}
export default function PenInventory({
    pens,
    layout,
    model,
    onOpen,
    canEdit,
}: Props) {
    if (layout === 'grid')
        return (
            <div className="pen-grid">
                {pens.map((pen) => (
                    <article
                        className="pen-card"
                        key={pen.id}
                        aria-labelledby={`pen-card-${pen.id}`}
                    >
                        <div className="pen-card-heading">
                            <span className="overline">{pen.brand}</span>
                            {pen.archived && (
                                <span className="badge neutral">Archived</span>
                            )}
                        </div>
                        <h2 id={`pen-card-${pen.id}`}>
                            <button
                                type="button"
                                className="name-link"
                                data-focus-key={`pen-${pen.id}`}
                                onClick={() =>
                                    onOpen({ kind: 'pen', item: pen })
                                }
                            >
                                {pen.model}
                            </button>
                        </h2>
                        <p className="pen-card-finish">
                            {pen.color || 'No finish recorded'}
                        </p>
                        <dl className="pen-card-details">
                            <div>
                                <dt>Nib</dt>
                                <dd>
                                    {[pen.nibSize, pen.nibType]
                                        .filter(Boolean)
                                        .join(' · ') ||
                                        'No nib details recorded'}
                                </dd>
                            </div>
                            <div>
                                <dt>Latest ink</dt>
                                <dd>
                                    <InkNames
                                        entry={model.latest.get(pen.id)}
                                        model={model}
                                    />
                                    <span className="small muted block">
                                        {formatDate(
                                            model.latest.get(pen.id)?.date,
                                        )}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                        <div className="pen-card-footer">
                            <span className="small muted">
                                {model.penCount(pen.id)} refills
                            </span>
                            <PenActions
                                pen={pen}
                                model={model}
                                onOpen={onOpen}
                                canEdit={canEdit}
                            />
                        </div>
                    </article>
                ))}
            </div>
        );
    return (
        <div className="pen-table-wrap">
            <table className="pen-table" aria-label="Pen inventory">
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
                                    type="button"
                                    className="inventory-name"
                                    data-focus-key={`pen-${pen.id}`}
                                    onClick={() =>
                                        onOpen({ kind: 'pen', item: pen })
                                    }
                                >
                                    <span className="overline">
                                        {pen.brand}
                                    </span>
                                    <strong>{pen.model}</strong>
                                    <span className="small muted">
                                        {pen.color || 'No finish recorded'}
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
                                    {formatDate(model.latest.get(pen.id)?.date)}
                                </span>
                            </td>
                            <td data-label="Refills" className="tabular">
                                {model.penCount(pen.id)}
                            </td>
                            <td className="row-actions">
                                <PenActions
                                    pen={pen}
                                    model={model}
                                    onOpen={onOpen}
                                    canEdit={canEdit}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
