import { useState } from 'react';
import {
    addRefillLog,
    deleteRefillLog,
    updateRefillLog,
    updatePen,
} from '../../services/dataService';
import {
    EMPTY_INK_ID,
    byName,
    formatDate,
    inkLabel,
    isCleaning,
    matches,
    penDescription,
    penLabel,
    refillPayload,
    today,
    validateRefill,
    type EditorState,
    type RefillDraft,
} from '../../lib/collection';
import { EmptyState, Icon, SearchField, Swatch } from './Primitives';
import {
    Field,
    ErrorMessage,
    EditorHeading,
    RefillIntentField,
    type EditorProps as SharedProps,
} from './EditorFields';
import { useDraft } from '../../hooks/useDraft';

export function RefillEditor({
    editor,
    collection,
    model,
    canEdit,
    onClose,
    onDirty,
    onSaved,
    onOpen,
    backLabel,
}: SharedProps & { editor: Extract<EditorState, { kind: 'refill' }> }) {
    const [initial] = useState<RefillDraft>(() => ({
        date: editor.draft?.date || today(),
        penId: editor.draft?.penId || '',
        inkIds: editor.draft?.inkIds || [],
        notes: editor.draft?.notes || '',
        needsRefill: editor.draft?.needsRefill,
        ...(editor.draft?.index !== undefined
            ? { index: editor.draft.index }
            : {}),
    }));
    const [draft, setDraft] = useState(initial);
    const [penQuery, setPenQuery] = useState('');
    const [inkQuery, setInkQuery] = useState('');
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    useDraft(initial, draft, onDirty, editor.draft?.hasUnsavedChanges);
    const editing = draft.index !== undefined;
    const cleaning = draft.inkIds.includes(EMPTY_INK_ID);
    const selectedPen = model.penById.get(draft.penId);
    // Queue intent belongs to the pen today, not to historical journal edits.
    // New entries win same-day ties because they are appended to the source array.
    const updatesRefillQueue =
        !editing &&
        !!selectedPen &&
        draft.date <= today() &&
        draft.date >= (model.latest.get(draft.penId)?.date || '');
    const selectedInks = draft.inkIds
        .filter((id) => id !== EMPTY_INK_ID)
        .map((id) => model.inkById.get(id));
    const availablePens = collection.pens
        .filter(
            (pen) =>
                (!pen.archived || pen.id === draft.penId) &&
                matches(penQuery, penLabel(pen), penDescription(pen)),
        )
        .sort(
            (a, b) =>
                byName(penLabel(a), penLabel(b)) ||
                byName(penDescription(a), penDescription(b)),
        );
    const availableInks = collection.inks
        .filter(
            (ink) =>
                ink.id !== EMPTY_INK_ID &&
                (!ink.archived || draft.inkIds.includes(ink.id)) &&
                matches(inkQuery, inkLabel(ink), ink.collection),
        )
        .sort((a, b) => byName(inkLabel(a), inkLabel(b)));
    const last = draft.penId
        ? model.penHistory
              .get(draft.penId)
              ?.find(
                  (entry) =>
                      entry.index !== draft.index &&
                      !isCleaning(entry) &&
                      entry.date <= draft.date,
              )
        : undefined;
    const toggleInk = (id: string) =>
        setDraft((previous) => ({
            ...previous,
            inkIds: previous.inkIds.includes(id)
                ? previous.inkIds.filter((value) => value !== id)
                : [
                      ...previous.inkIds.filter(
                          (value) => value !== EMPTY_INK_ID,
                      ),
                      id,
                  ],
        }));
    const save = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canEdit) return;
        const problem = validateRefill(draft, collection);
        if (problem) {
            setError(problem);
            return;
        }
        const payload = refillPayload(draft);
        const saved =
            draft.index !== undefined
                ? updateRefillLog(payload, draft.index)
                : addRefillLog(payload);
        if (updatesRefillQueue && selectedPen) {
            const needsRefill = cleaning
                ? (draft.needsRefill ?? selectedPen.needsRefill ?? false)
                : false;
            if (needsRefill !== !!selectedPen.needsRefill)
                updatePen({ ...selectedPen, needsRefill });
        }
        onSaved(
            editing
                ? 'Journal entry updated.'
                : cleaning
                  ? 'Cleaning recorded.'
                  : 'Refill added to your journal.',
            undefined,
            saved,
        );
    };
    return (
        <>
            <EditorHeading
                label={backLabel}
                title={
                    editing
                        ? `${canEdit ? 'Edit' : 'View'} journal entry`
                        : 'A fresh fill'
                }
                onClose={onClose}
            />
            <div className="editor-layout">
                <form
                    className="editor-form refill-form"
                    onSubmit={save}
                    noValidate
                >
                    <ErrorMessage message={error} />
                    <fieldset disabled={!canEdit} className="form-fields">
                        <div className="refill-start">
                            <Field label="Date">
                                <input
                                    type="date"
                                    value={draft.date}
                                    max={today()}
                                    onChange={(event) =>
                                        setDraft((previous) => ({
                                            ...previous,
                                            date: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </Field>
                            <fieldset className="event-switch">
                                <legend>Entry type</legend>
                                <label className={!cleaning ? 'selected' : ''}>
                                    <input
                                        type="radio"
                                        name="event-type"
                                        checked={!cleaning}
                                        onChange={() =>
                                            setDraft((previous) => ({
                                                ...previous,
                                                inkIds: [],
                                            }))
                                        }
                                    />
                                    Refill
                                </label>
                                <label className={cleaning ? 'selected' : ''}>
                                    <input
                                        type="radio"
                                        name="event-type"
                                        checked={cleaning}
                                        onChange={() =>
                                            setDraft((previous) => ({
                                                ...previous,
                                                inkIds: [EMPTY_INK_ID],
                                            }))
                                        }
                                    />
                                    Cleaned & empty
                                </label>
                            </fieldset>
                        </div>
                        <section
                            className="picker-section"
                            aria-labelledby="choose-pen"
                        >
                            <div className="section-heading">
                                <h2 id="choose-pen">
                                    <span className="step-number">01</span>{' '}
                                    Choose your pen
                                </h2>
                                {canEdit && (
                                    <button
                                        type="button"
                                        className="text-link"
                                        onClick={() =>
                                            onOpen({
                                                kind: 'pen',
                                                returnTo: draft,
                                            })
                                        }
                                    >
                                        <Icon name="plus" />
                                        New pen
                                    </button>
                                )}
                            </div>
                            {selectedPen && (
                                <div className="selected-pen">
                                    <Icon name="pen" />
                                    <span>
                                        <strong>{penLabel(selectedPen)}</strong>
                                        <span className="small muted block">
                                            {penDescription(selectedPen)}
                                        </span>
                                    </span>
                                    <Icon name="check" />
                                </div>
                            )}
                            <SearchField
                                value={penQuery}
                                onChange={setPenQuery}
                                placeholder="Find a pen by brand, model, finish, or nib…"
                            />
                            <div
                                className="choice-list pen-choices"
                                role="group"
                                aria-label="Choose a pen"
                            >
                                {availablePens.map((pen) => (
                                    <label
                                        key={pen.id}
                                        className={`choice ${pen.id === draft.penId ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="refill-pen"
                                            value={pen.id}
                                            checked={pen.id === draft.penId}
                                            onChange={() =>
                                                setDraft((previous) => ({
                                                    ...previous,
                                                    penId: pen.id,
                                                    needsRefill: undefined,
                                                }))
                                            }
                                        />
                                        <span>
                                            <strong>{penLabel(pen)}</strong>
                                            <span className="small muted block">
                                                {penDescription(pen)}
                                                {pen.archived
                                                    ? ' · Archived'
                                                    : ''}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                                {!availablePens.length && (
                                    <p className="picker-empty">
                                        {collection.pens.length
                                            ? 'No matching pens. Try another search.'
                                            : 'Add your first pen to get started.'}
                                    </p>
                                )}
                            </div>
                        </section>
                        {cleaning && updatesRefillQueue && (
                            <RefillIntentField
                                checked={
                                    draft.needsRefill ??
                                    selectedPen?.needsRefill ??
                                    false
                                }
                                onChange={(needsRefill) =>
                                    setDraft((previous) => ({
                                        ...previous,
                                        needsRefill,
                                    }))
                                }
                                description="Check if you plan to refill this pen. Leave unchecked to store it empty."
                            />
                        )}
                        {!cleaning &&
                            updatesRefillQueue &&
                            selectedPen?.needsRefill && (
                                <p className="small muted">
                                    Logging this fill will take the pen off your
                                    refill queue.
                                </p>
                            )}
                        {!cleaning && (
                            <section
                                className="picker-section"
                                aria-labelledby="choose-ink"
                            >
                                <div className="section-heading">
                                    <h2 id="choose-ink">
                                        <span className="step-number">02</span>{' '}
                                        Choose your ink
                                    </h2>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="text-link"
                                            onClick={() =>
                                                onOpen({
                                                    kind: 'ink',
                                                    returnTo: draft,
                                                })
                                            }
                                        >
                                            <Icon name="plus" />
                                            New ink
                                        </button>
                                    )}
                                </div>
                                <p className="small muted">
                                    Choose one ink, or select several for a mix.
                                </p>
                                {last && canEdit && (
                                    <button
                                        type="button"
                                        className="last-pairing"
                                        onClick={() =>
                                            setDraft((previous) => ({
                                                ...previous,
                                                inkIds: last.inkIds.filter(
                                                    (id) => id !== EMPTY_INK_ID,
                                                ),
                                            }))
                                        }
                                    >
                                        <Icon name="journal" />
                                        <span>
                                            Use last pairing:{' '}
                                            <strong>
                                                {last.inkIds
                                                    .map(
                                                        (id) =>
                                                            model.inkById.get(
                                                                id,
                                                            )?.name ||
                                                            'Unknown ink',
                                                    )
                                                    .join(' + ')}
                                            </strong>
                                        </span>
                                        <Icon name="arrow" />
                                    </button>
                                )}
                                {selectedInks.length > 0 && (
                                    <div className="selected-inks">
                                        {draft.inkIds
                                            .filter((id) => id !== EMPTY_INK_ID)
                                            .map((id) => (
                                                <button
                                                    type="button"
                                                    key={id}
                                                    className="ink-token"
                                                    onClick={() =>
                                                        toggleInk(id)
                                                    }
                                                    aria-label={`Remove ${model.inkById.get(id)?.name || 'missing ink'} from refill`}
                                                >
                                                    <Swatch
                                                        ink={model.inkById.get(
                                                            id,
                                                        )}
                                                    />
                                                    {model.inkById.get(id)
                                                        ?.name || 'Missing ink'}
                                                    <Icon name="close" />
                                                </button>
                                            ))}
                                    </div>
                                )}
                                <SearchField
                                    value={inkQuery}
                                    onChange={setInkQuery}
                                    placeholder="Find an ink by name, brand, or collection…"
                                />
                                <div
                                    className="choice-list ink-choices"
                                    role="group"
                                    aria-label="Choose one or more inks"
                                >
                                    {availableInks.map((ink) => (
                                        <label
                                            key={ink.id}
                                            className={`choice ${draft.inkIds.includes(ink.id) ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={draft.inkIds.includes(
                                                    ink.id,
                                                )}
                                                onChange={() =>
                                                    toggleInk(ink.id)
                                                }
                                            />
                                            <Swatch ink={ink} />
                                            <span>
                                                <strong>{ink.name}</strong>
                                                <span className="small muted block">
                                                    {ink.brand}
                                                    {ink.collection
                                                        ? ` · ${ink.collection}`
                                                        : ''}
                                                    {ink.archived
                                                        ? ' · Archived'
                                                        : ''}
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                    {!availableInks.length && (
                                        <p className="picker-empty">
                                            {model.activeInks.length
                                                ? 'No matching inks. Try another search.'
                                                : 'Add an ink to start your next pairing.'}
                                        </p>
                                    )}
                                </div>
                            </section>
                        )}
                        <section className="picker-section">
                            <Field label="Notes" optional>
                                <textarea
                                    value={draft.notes}
                                    onChange={(event) =>
                                        setDraft((previous) => ({
                                            ...previous,
                                            notes: event.target.value,
                                        }))
                                    }
                                    rows={4}
                                    placeholder={
                                        cleaning
                                            ? 'A quick rinse, a deep clean, or a nib adjustment…'
                                            : 'How does it write? Any mixing ratio, paper, or first impressions worth keeping?'
                                    }
                                />
                            </Field>
                        </section>
                    </fieldset>
                    {canEdit && (
                        <div className="form-actions">
                            <button type="submit" className="button primary">
                                <Icon name="check" />
                                {editing
                                    ? 'Save changes'
                                    : cleaning
                                      ? 'Log cleaning'
                                      : 'Log refill'}
                            </button>
                            <button
                                type="button"
                                className="button subtle"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {editing && canEdit && (
                        <div className="delete-area">
                            {confirmDelete ? (
                                <>
                                    <p>
                                        Delete this journal entry? Your pen’s
                                        latest pairing will be recalculated.
                                    </p>
                                    <button
                                        type="button"
                                        className="button danger"
                                        onClick={() => {
                                            deleteRefillLog(draft.index!);
                                            onSaved(
                                                'Journal entry deleted.',
                                                undefined,
                                                null,
                                            );
                                        }}
                                    >
                                        Delete entry
                                    </button>
                                    <button
                                        type="button"
                                        className="button subtle"
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        Keep entry
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="text-link danger-text"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    Delete this entry
                                </button>
                            )}
                        </div>
                    )}
                </form>
                <aside className="editor-aside">
                    <section className="refill-preview">
                        <p className="eyebrow">
                            {cleaning ? 'A little care' : 'The pairing'}
                        </p>
                        <div className="preview-mark">
                            {cleaning ? (
                                <Icon name="pen" />
                            ) : selectedInks.length ? (
                                selectedInks.map((ink, index) => (
                                    <Swatch
                                        key={ink?.id || index}
                                        ink={ink}
                                        large
                                    />
                                ))
                            ) : (
                                <Icon name="ink" />
                            )}
                        </div>
                        <h2>
                            {selectedPen
                                ? penLabel(selectedPen)
                                : 'A pen, an ink, a fresh page.'}
                        </h2>
                        {selectedPen && (
                            <p className="muted small">
                                {penDescription(selectedPen)}
                            </p>
                        )}
                        <div className="preview-rule" />
                        <h3>
                            {cleaning
                                ? 'Cleaned & empty'
                                : selectedInks.length
                                  ? selectedInks
                                        .map(
                                            (ink) => ink?.name || 'Missing ink',
                                        )
                                        .join(' + ')
                                  : 'Your ink goes here'}
                        </h3>
                        <p className="small muted">
                            {cleaning
                                ? 'This pen will be marked empty from this entry’s date.'
                                : selectedInks
                                      .map((ink) => ink?.brand)
                                      .filter(
                                          (brand, index, all) =>
                                              brand &&
                                              all.indexOf(brand) === index,
                                      )
                                      .join(' · ') ||
                                  'Choose an ink to bring the pairing together.'}
                        </p>
                        <time dateTime={draft.date}>
                            {formatDate(draft.date)}
                        </time>
                        {draft.notes && (
                            <p className="preview-notes">{draft.notes}</p>
                        )}
                    </section>
                    {selectedPen && last && (
                        <section className="previous-fill">
                            <span className="overline">
                                Last refill before this entry
                            </span>
                            <h3>
                                {last.inkIds
                                    .map(
                                        (id) =>
                                            model.inkById.get(id)?.name ||
                                            'Missing ink',
                                    )
                                    .join(' + ')}
                            </h3>
                            <p className="small muted">
                                {formatDate(last.date)}
                            </p>
                        </section>
                    )}
                    {!collection.pens.length && (
                        <EmptyState title="Make it yours">
                            Add a pen using “New pen”, then come right back to
                            this refill.
                        </EmptyState>
                    )}
                </aside>
            </div>
        </>
    );
}
