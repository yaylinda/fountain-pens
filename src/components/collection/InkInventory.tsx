import type { Ink } from '../../models/types';
import type { InventoryLayout } from '../../hooks/useInventoryLayout';
import {
    formatDate,
    inkLabel,
    penLabel,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import { Icon, Swatch } from './Primitives';

interface Props {
    inks: Ink[];
    layout: InventoryLayout;
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}
export default function InkInventory({
    inks,
    layout,
    model,
    onOpen,
    canEdit,
}: Props) {
    if (layout === 'list')
        return (
            <div className="pen-table-wrap">
                <table
                    className="pen-table ink-table"
                    aria-label="Ink inventory"
                >
                    <thead>
                        <tr>
                            <th scope="col">Ink</th>
                            <th scope="col">Collection</th>
                            <th scope="col">Current pens / latest use</th>
                            <th scope="col">Refills</th>
                            <th scope="col">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {inks.map((ink) => {
                            const current = model.currentPens(ink.id);
                            const latest = model.inkHistory.get(ink.id)?.[0];
                            return (
                                <tr key={ink.id}>
                                    <td>
                                        <button
                                            type="button"
                                            className="inventory-name ink-list-name"
                                            data-focus-key={`ink-${ink.id}`}
                                            onClick={() =>
                                                onOpen({
                                                    kind: 'ink',
                                                    item: ink,
                                                })
                                            }
                                        >
                                            <Swatch ink={ink} />
                                            <span>
                                                <span className="overline">
                                                    {ink.brand}
                                                </span>
                                                <strong>{ink.name}</strong>
                                                {ink.archived && (
                                                    <span className="small muted">
                                                        Archived
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    </td>
                                    <td data-label="Collection">
                                        {ink.collection || (
                                            <span className="muted">
                                                Standard collection
                                            </span>
                                        )}
                                    </td>
                                    <td data-label="Current pens">
                                        <span className="mobile-field-label">
                                            Current pens
                                        </span>
                                        <span className="ink-current-pens">
                                            {current.length ? (
                                                current.map((pen) => (
                                                    <span key={pen.id}>
                                                        {penLabel(pen)}
                                                        <span className="small muted block">
                                                            {[
                                                                pen.color,
                                                                pen.nibSize,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="muted">
                                                    Not in a pen
                                                </span>
                                            )}
                                        </span>
                                        <span className="small muted block">
                                            {latest
                                                ? `Last used ${formatDate(latest.date)}`
                                                : 'Not tried yet'}
                                        </span>
                                    </td>
                                    <td
                                        data-label="Refills"
                                        className="tabular"
                                    >
                                        {model.inkCount(ink.id)}
                                    </td>
                                    <td className="row-actions">
                                        <button
                                            type="button"
                                            className="icon-button"
                                            data-focus-key={`ink-${ink.id}`}
                                            aria-label={`${canEdit ? 'Edit' : 'View'} ${inkLabel(ink)}`}
                                            onClick={() =>
                                                onOpen({
                                                    kind: 'ink',
                                                    item: ink,
                                                })
                                            }
                                        >
                                            <Icon
                                                name={
                                                    canEdit ? 'edit' : 'arrow'
                                                }
                                            />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    return (
        <div className="ink-grid">
            {inks.map((ink) => {
                const current = model.currentPens(ink.id);
                return (
                    <button
                        type="button"
                        key={ink.id}
                        className="ink-card"
                        data-focus-key={`ink-${ink.id}`}
                        onClick={() => onOpen({ kind: 'ink', item: ink })}
                    >
                        <div className="ink-card-color">
                            <Swatch ink={ink} large />
                            <span className="ink-card-action">
                                <Icon name={canEdit ? 'edit' : 'arrow'} />
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
                                    {current.length === 1 ? 'pen' : 'pens'}
                                </span>
                            )}
                            {ink.archived && <span>Archived</span>}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
