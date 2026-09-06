import {
    byPenName,
    penDescription,
    penLabel,
    realInkIds,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import { InkNames } from './Primitives';

export default function RefillQueue({ model, onOpen, canEdit }: {
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}) {
    const pens = model.activePens.filter((pen) => pen.needsRefill).sort(byPenName);
    if (!pens.length) return null;

    return (
        <details className="desk-refill-queue" open>
            <summary>
                Needs refill <span className="count">{pens.length}</span>
            </summary>
            <ul>
                {pens.map((pen) => {
                    const entry = model.latest.get(pen.id);
                    return (
                        <li key={pen.id}>
                            <button
                                className="name-link desk-refill-pen"
                                data-focus-key={`desk-queue-pen-${pen.id}`}
                                onClick={() => onOpen({ kind: 'pen', item: pen })}
                            >
                                <strong>{penLabel(pen)}</strong>
                                <span className="small muted">{penDescription(pen)}</span>
                            </button>
                            <div className="desk-refill-ink">
                                <InkNames
                                    entry={entry}
                                    model={model}
                                    details
                                    onOpenInk={(ink) => onOpen({ kind: 'ink', item: ink })}
                                />
                            </div>
                            {canEdit && (
                                <button
                                    className="button subtle small-button"
                                    aria-label={`Refill ${penLabel(pen)}, ${penDescription(pen)}`}
                                    data-focus-key={`desk-queue-refill-${pen.id}`}
                                    onClick={() => onOpen({
                                        kind: 'refill',
                                        draft: {
                                            penId: pen.id,
                                            inkIds: entry ? realInkIds(entry) : [],
                                            date: '',
                                            notes: '',
                                        },
                                    })}
                                >
                                    Refill
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
        </details>
    );
}
