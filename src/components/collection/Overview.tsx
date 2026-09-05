import { Link } from 'react-router-dom';
import {
    formatDate,
    inkLabel,
    penDescription,
    type CollectionModel,
    type EditorState,
} from '../../lib/collection';
import { EmptyState, EntryRows, Icon, InkNames, Swatch } from './Primitives';

interface Props {
    model: CollectionModel;
    onOpen: (editor: EditorState) => void;
    canEdit: boolean;
}
export default function Overview({ model, onOpen, canEdit }: Props) {
    const inked = [...model.inked].sort((a, b) =>
        (model.latest.get(b.id)?.date || '').localeCompare(
            model.latest.get(a.id)?.date || '',
        ),
    );
    const palette = [
        ...new Set(
            inked.flatMap((pen) => model.latest.get(pen.id)?.inkIds || []),
        ),
    ]
        .map((id) => model.inkById.get(id))
        .filter((ink) => !!ink)
        .slice(0, 9);
    return (
        <>
            <header className="page-header">
                <div>
                    <p className="eyebrow">Your personal collection</p>
                    <h1>The writing desk</h1>
                    <p className="page-intro">
                        Good pens. Beautiful inks. A little record of it all.
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
            <div className="collection-strip" aria-label="Collection overview">
                <Link to="/pens">
                    <strong>{model.activePens.length}</strong>
                    <span>fountain pens</span>
                    <Icon name="arrow" />
                </Link>
                <Link to="/inks">
                    <strong>{model.activeInks.length}</strong>
                    <span>inks in the collection</span>
                    <Icon name="arrow" />
                </Link>
                <Link to="/journal?type=refill">
                    <strong>{model.refills.length}</strong>
                    <span>refills recorded</span>
                    <Icon name="arrow" />
                </Link>
            </div>
            <div className="desk-layout">
                <section className="desk-main">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Ready to write</p>
                            <h2>
                                Currently inked{' '}
                                <span className="count">{inked.length}</span>
                            </h2>
                        </div>
                        <Link className="text-link" to="/pens?status=inked">
                            View all pens <Icon name="arrow" />
                        </Link>
                    </div>
                    <p className="section-caption">
                        Based on the latest entry for each pen.
                    </p>
                    {inked.length === 0 ? (
                        <EmptyState title="A fresh page awaits">
                            Log a refill to see your pen and ink pairings here.
                        </EmptyState>
                    ) : (
                        <div className="pairing-list">
                            {inked.slice(0, 6).map((pen) => {
                                const entry = model.latest.get(pen.id)!;
                                const ink = model.inkById.get(entry.inkIds[0]);
                                return (
                                    <article className="pairing" key={pen.id}>
                                        <Swatch ink={ink} large />
                                        <div className="pairing-info">
                                            <span className="overline">
                                                {pen.brand}
                                            </span>
                                            <button
                                                className="name-link"
                                                onClick={() =>
                                                    onOpen({
                                                        kind: 'pen',
                                                        item: pen,
                                                    })
                                                }
                                            >
                                                {pen.model}
                                            </button>
                                            <span className="small muted">
                                                {penDescription(pen)}
                                            </span>
                                            <InkNames
                                                entry={entry}
                                                model={model}
                                            />
                                            <time
                                                className="small muted"
                                                dateTime={entry.date}
                                            >
                                                Inked {formatDate(entry.date)}
                                            </time>
                                        </div>
                                        {canEdit && (
                                            <button
                                                className="button subtle small-button"
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
                                                Refill <Icon name="plus" />
                                            </button>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    {inked.length > 6 && (
                        <Link className="all-pens-link" to="/pens?status=inked">
                            See all {inked.length} inked pens{' '}
                            <Icon name="arrow" />
                        </Link>
                    )}
                </section>
                <aside className="desk-aside">
                    <section className="palette-section">
                        <p className="eyebrow">On your desk</p>
                        <h2>A palette in progress</h2>
                        <div className="palette-swatches">
                            {palette.map((ink) => (
                                <button
                                    key={ink.id}
                                    aria-label={`View ${inkLabel(ink)}`}
                                    onClick={() =>
                                        onOpen({ kind: 'ink', item: ink })
                                    }
                                >
                                    <Swatch ink={ink} large />
                                </button>
                            ))}
                            {!palette.length && (
                                <p className="muted">
                                    Your latest ink colors will appear here.
                                </p>
                            )}
                        </div>
                        <p className="small muted">
                            A glimpse of the inks in your pens. Swatches are
                            approximate.
                        </p>
                    </section>
                    <section className="untried-section">
                        <span className="overline">Something to discover</span>
                        <h2>{model.untried.length} inks, still unwritten.</h2>
                        <p>
                            Find a new favorite in the colors you haven’t tried
                            yet.
                        </p>
                        <Link className="text-link" to="/inks?status=untried">
                            Explore unused inks <Icon name="arrow" />
                        </Link>
                    </section>
                    <section>
                        <div className="section-heading">
                            <h2>Recent entries</h2>
                            <Link
                                className="text-link"
                                to="/journal"
                                aria-label="View full refill journal"
                            >
                                <Icon name="arrow" />
                            </Link>
                        </div>
                        {model.journal.length ? (
                            <EntryRows
                                entries={model.journal}
                                model={model}
                                limit={4}
                                onEdit={(entry) =>
                                    onOpen({ kind: 'refill', draft: entry })
                                }
                            />
                        ) : (
                            <p className="muted">
                                Your first refill starts the story.
                            </p>
                        )}
                    </section>
                </aside>
            </div>
        </>
    );
}
