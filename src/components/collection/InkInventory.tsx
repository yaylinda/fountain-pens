import type { Ink } from '../../models/types';
import type { InventoryLayout } from '../../hooks/useInventoryLayout';
import {
    formatDate,
    inkLabel,
    penLabel,
    penDescription,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import { Icon, Swatch } from './Primitives';
import { HoverDetails } from './HoverDetails';
import { InkStory } from './InkStory';
import { getInkReference, referenceByline } from '../../lib/inkReference';

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
                            const reference = getInkReference(ink);
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
                                                {reference && (
                                                    <span className="small muted">
                                                        {referenceByline(reference)}
                                                    </span>
                                                )}
                                                {ink.archived && (
                                                    <span className="small muted">
                                                        Archived
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                        <InkStory ink={ink} />
                                    </td>
                                    <td data-label="Collection">
                                        {ink.collection || reference?.inspiration.series || (
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
                const reference = getInkReference(ink);
                const current = model.currentPens(ink.id);
                return (
                    <article
                        key={ink.id}
                        className="ink-card"
                        aria-labelledby={`ink-card-${ink.id}`}
                    >
                        <button
                            type="button"
                            className="ink-card-main"
                            data-focus-key={`ink-${ink.id}`}
                            aria-label={`${canEdit ? 'Edit' : 'View'} ${inkLabel(ink)}`}
                            onClick={() => onOpen({ kind: 'ink', item: ink })}
                        >
                            <div className="ink-card-color">
                                <Swatch ink={ink} large />
                                <span className="ink-card-action">
                                    <Icon name={canEdit ? 'edit' : 'arrow'} />
                                </span>
                            </div>
                            <span className="overline">{ink.brand}</span>
                            <span
                                className="ink-card-name"
                                id={`ink-card-${ink.id}`}
                            >
                                {ink.name}
                            </span>
                            <span className="ink-collection">
                                {reference?.nameOrigin?.meaning || ink.collection ||
                                    (reference && referenceByline(reference)) ||
                                    'Standard collection'}
                            </span>
                        </button>
                        <InkStory ink={ink} />
                        <span className="ink-card-footer">
                            <span>
                                {model.inkCount(ink.id)
                                    ? `${model.inkCount(ink.id)} refills`
                                    : 'Not tried yet'}
                            </span>
                            {current.length > 0 && (
                                <HoverDetails
                                    className="status-dot"
                                    label={`Pens using ${inkLabel(ink)}`}
                                    details={
                                        <>
                                            <span className="overline">
                                                Currently inked
                                            </span>
                                            <ul className="detail-pen-list">
                                                {current.map((pen) => (
                                                    <li key={pen.id}>
                                                        <strong>
                                                            {penLabel(pen)}
                                                        </strong>
                                                        <span className="small muted block">
                                                            {penDescription(
                                                                pen,
                                                            )}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    }
                                >
                                    In {current.length}{' '}
                                    {current.length === 1 ? 'pen' : 'pens'}
                                </HoverDetails>
                            )}
                            {ink.archived && <span>Archived</span>}
                        </span>
                    </article>
                );
            })}
        </div>
    );
}
