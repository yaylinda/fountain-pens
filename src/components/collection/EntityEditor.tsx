import { useId, useState } from 'react';
import type { Ink, Pen } from '../../models/types';
import {
    addInk,
    addPen,
    deleteInk,
    deletePen,
    updateInk,
    updatePen,
} from '../../services/dataService';
import {
    EMPTY_INK_ID,
    byName,
    getSwatch,
    penLabel,
    type EditorState,
} from '../../lib/collection';
import { EntryRows, Icon, Swatch } from './Primitives';
import {
    Field,
    ErrorMessage,
    EditorHeading,
    RefillIntentField,
    type EditorProps as SharedProps,
} from './EditorFields';
import { useDraft } from '../../hooks/useDraft';
import { InkStory } from './InkStory';
type EntityEditorState = Extract<EditorState, { kind: 'pen' | 'ink' }>;

export function EntityEditor({
    editor,
    collection,
    model,
    canEdit,
    onClose,
    onDirty,
    onSaved,
    onOpen,
    backLabel,
}: SharedProps & { editor: EntityEditorState }) {
    const penMode = editor.kind === 'pen';
    const item = editor.item;
    const pen = penMode ? (editor.item as Pen | undefined) : undefined;
    const ink = !penMode ? (editor.item as Ink | undefined) : undefined;
    const [initial] = useState(() => ({
        brand: item?.brand || '',
        model: pen?.model || '',
        color: pen?.color || '',
        nibSize: pen?.nibSize || '',
        nibType: pen?.nibType || '',
        needsRefill: pen?.needsRefill || false,
        name: ink?.name || '',
        collection: ink?.collection || '',
        colorHex: ink?.colorHex || '',
    }));
    const [draft, setDraft] = useState(initial);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const prefix = useId();
    const hasEdits = useDraft(initial, draft, onDirty);
    const change = <Key extends keyof typeof draft>(
        key: Key,
        value: (typeof draft)[Key],
    ) => setDraft((previous) => ({ ...previous, [key]: value }));
    const history = item
        ? (penMode ? model.penHistory : model.inkHistory).get(item.id) || []
        : [];
    const options = (values: string[]) =>
        [...new Set(values.filter(Boolean))]
            .sort(byName)
            .map((value) => <option key={value} value={value} />);
    const previewInk: Ink = {
        id: ink?.id || '',
        brand: draft.brand,
        name: draft.name,
        collection: draft.collection,
        colorHex: draft.colorHex,
    };
    const swatch = getSwatch(previewInk);
    const save = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canEdit) return;
        if (
            !draft.brand.trim() ||
            !(penMode ? draft.model : draft.name).trim()
        ) {
            setError(
                `Add a brand and ${penMode ? 'model' : 'name'} to save this ${editor.kind}.`,
            );
            return;
        }
        if (
            !penMode &&
            draft.colorHex &&
            !/^#[\da-f]{6}$/i.test(draft.colorHex)
        ) {
            setError(
                'Use a six-digit color, such as #476C76, or leave the swatch blank.',
            );
            return;
        }
        if (penMode) {
            const data = {
                brand: draft.brand.trim(),
                model: draft.model.trim(),
                color: draft.color.trim(),
                nibSize: draft.nibSize.trim(),
                nibType: draft.nibType.trim(),
                ...(draft.needsRefill || pen?.needsRefill !== undefined
                    ? { needsRefill: draft.needsRefill }
                    : {}),
            };
            const saved = pen ? updatePen({ ...pen, ...data }) : addPen(data);
            onSaved(
                pen ? 'Pen updated.' : 'Pen added to your collection.',
                saved,
            );
        } else {
            const data = {
                brand: draft.brand.trim(),
                collection: draft.collection.trim(),
                name: draft.name.trim(),
                ...(draft.colorHex || ink?.colorHex
                    ? { colorHex: draft.colorHex }
                    : {}),
            };
            const saved = ink ? updateInk({ ...ink, ...data }) : addInk(data);
            onSaved(
                ink ? 'Ink updated.' : 'Ink added to your collection.',
                saved,
            );
        }
    };
    const archive = () => {
        if (!item || !canEdit || hasEdits) return;
        if (penMode) updatePen({ ...(item as Pen), archived: !item.archived });
        else updateInk({ ...(item as Ink), archived: !item.archived });
        onSaved(
            item.archived
                ? 'Returned to your collection.'
                : 'Archived. Your journal is preserved.',
        );
    };
    const remove = () => {
        if (!item || history.length || !canEdit || hasEdits) return;
        if (penMode) deletePen(item.id);
        else deleteInk(item.id);
        onSaved(`${penMode ? 'Pen' : 'Ink'} removed.`);
    };
    return (
        <>
            <EditorHeading
                label={editor.returnTo ? 'your refill' : backLabel}
                title={
                    item
                        ? `${canEdit ? 'Edit' : 'View'} ${penMode ? 'pen' : 'ink'}`
                        : `A new ${editor.kind}`
                }
                onClose={onClose}
            />
            <div className="editor-layout">
                <form className="editor-form" onSubmit={save} noValidate>
                    <div className="form-section-heading">
                        <span className="overline">
                            {penMode
                                ? 'The essentials'
                                : 'A place in the cabinet'}
                        </span>
                        <h2>
                            {item
                                ? penMode
                                    ? pen?.model
                                    : ink?.name
                                : penMode
                                  ? 'Meet your new pen'
                                  : 'Meet your new ink'}
                        </h2>
                        <p className="muted">
                            {penMode
                                ? 'Start with the brand and model. The little details can come later.'
                                : 'Start with the brand and name. Add a swatch to make it easy to spot.'}
                        </p>
                    </div>
                    <ErrorMessage message={error} />
                    <fieldset disabled={!canEdit} className="form-fields">
                        <div className="field-pair">
                            <Field label="Brand">
                                <input
                                    autoComplete="off"
                                    value={draft.brand}
                                    onChange={(event) =>
                                        change('brand', event.target.value)
                                    }
                                    list={`${prefix}-brands`}
                                    placeholder={
                                        penMode ? 'e.g. Pilot' : 'e.g. Diamine'
                                    }
                                    required
                                />
                                <datalist id={`${prefix}-brands`}>
                                    {options(
                                        (penMode
                                            ? collection.pens
                                            : model.activeInks
                                        ).map((value) => value.brand),
                                    )}
                                </datalist>
                            </Field>
                            <Field label={penMode ? 'Model' : 'Ink name'}>
                                <input
                                    value={penMode ? draft.model : draft.name}
                                    onChange={(event) =>
                                        change(
                                            penMode ? 'model' : 'name',
                                            event.target.value,
                                        )
                                    }
                                    list={
                                        penMode ? `${prefix}-models` : undefined
                                    }
                                    placeholder={
                                        penMode
                                            ? 'e.g. Custom 823'
                                            : 'e.g. Ancient Copper'
                                    }
                                    required
                                />
                                <datalist id={`${prefix}-models`}>
                                    {options(
                                        collection.pens
                                            .filter(
                                                (value) =>
                                                    !draft.brand ||
                                                    normalizeBrand(
                                                        value.brand,
                                                    ) ===
                                                        normalizeBrand(
                                                            draft.brand,
                                                        ),
                                            )
                                            .map((value) => value.model),
                                    )}
                                </datalist>
                            </Field>
                        </div>
                        {penMode ? (
                            <>
                                <Field label="Color / finish" optional>
                                    <input
                                        value={draft.color}
                                        onChange={(event) =>
                                            change('color', event.target.value)
                                        }
                                        placeholder="e.g. Amber"
                                    />
                                </Field>
                                <div className="field-pair">
                                    <Field label="Nib size" optional>
                                        <input
                                            value={draft.nibSize}
                                            onChange={(event) =>
                                                change(
                                                    'nibSize',
                                                    event.target.value,
                                                )
                                            }
                                            list={`${prefix}-nibs`}
                                            placeholder="e.g. Fine"
                                        />
                                        <datalist id={`${prefix}-nibs`}>
                                            {options([
                                                ...collection.pens.map(
                                                    (value) => value.nibSize,
                                                ),
                                                'Extra Fine',
                                                'Fine',
                                                'Medium',
                                                'Broad',
                                                'Stub',
                                            ])}
                                        </datalist>
                                    </Field>
                                    <Field label="Nib material" optional>
                                        <input
                                            value={draft.nibType}
                                            onChange={(event) =>
                                                change(
                                                    'nibType',
                                                    event.target.value,
                                                )
                                            }
                                            list={`${prefix}-materials`}
                                            placeholder="e.g. Gold, 14k"
                                        />
                                        <datalist id={`${prefix}-materials`}>
                                            {options(
                                                collection.pens.map(
                                                    (value) => value.nibType,
                                                ),
                                            )}
                                        </datalist>
                                    </Field>
                                </div>
                                <RefillIntentField
                                    checked={draft.needsRefill}
                                    onChange={(value) =>
                                        change('needsRefill', value)
                                    }
                                />
                            </>
                        ) : (
                            <>
                                <Field label="Collection" optional>
                                    <input
                                        value={draft.collection}
                                        onChange={(event) =>
                                            change(
                                                'collection',
                                                event.target.value,
                                            )
                                        }
                                        list={`${prefix}-collections`}
                                        placeholder="e.g. Inkvent"
                                    />
                                    <datalist id={`${prefix}-collections`}>
                                        {options(
                                            model.activeInks
                                                .filter(
                                                    (value) =>
                                                        !draft.brand ||
                                                        normalizeBrand(
                                                            value.brand,
                                                        ) ===
                                                            normalizeBrand(
                                                                draft.brand,
                                                            ),
                                                )
                                                .map(
                                                    (value) => value.collection,
                                                ),
                                        )}
                                    </datalist>
                                </Field>
                                <div className="color-field">
                                    <Field label="Swatch color" optional>
                                        <input
                                            value={draft.colorHex}
                                            onChange={(event) =>
                                                change(
                                                    'colorHex',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder={
                                                swatch?.hex || '#476C76'
                                            }
                                            maxLength={7}
                                            spellCheck={false}
                                        />
                                    </Field>
                                    <input
                                        type="color"
                                        aria-label="Choose swatch color"
                                        value={
                                            /^#[\da-f]{6}$/i.test(
                                                draft.colorHex,
                                            )
                                                ? draft.colorHex
                                                : swatch?.hex || '#756D75'
                                        }
                                        onChange={(event) =>
                                            change(
                                                'colorHex',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="text-link"
                                        onClick={() => change('colorHex', '')}
                                        disabled={!draft.colorHex}
                                    >
                                        Reset
                                    </button>
                                </div>
                                <p className="field-hint">
                                    Leave blank to use an existing reference
                                    swatch, when available. Screen colors are
                                    approximate.
                                </p>
                            </>
                        )}
                    </fieldset>
                    {canEdit && (
                        <div className="form-actions">
                            <button className="button primary" type="submit">
                                <Icon name="check" />
                                {item ? 'Save changes' : `Add ${editor.kind}`}
                            </button>
                            <button
                                className="button subtle"
                                type="button"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {item && canEdit && (
                        <details className="manage-item">
                            <summary>Manage this {editor.kind}</summary>
                            {hasEdits && (
                                <p className="field-hint">
                                    Save or cancel your edits before archiving
                                    or deleting.
                                </p>
                            )}
                            <p>
                                Archive items you no longer use. Their refill
                                history stays in your journal.
                            </p>
                            <button
                                type="button"
                                className="button secondary"
                                onClick={archive}
                                disabled={hasEdits}
                            >
                                <Icon name="archive" />
                                {item.archived
                                    ? 'Restore to collection'
                                    : `Archive ${editor.kind}`}
                            </button>
                            {!history.length && (
                                <div className="delete-area">
                                    {confirmDelete ? (
                                        <>
                                            <p>
                                                Remove this {editor.kind}{' '}
                                                permanently? There are no
                                                journal entries linked to it.
                                            </p>
                                            <button
                                                type="button"
                                                className="button danger"
                                                onClick={remove}
                                                disabled={hasEdits}
                                            >
                                                Delete {editor.kind}
                                            </button>
                                            <button
                                                type="button"
                                                className="button subtle"
                                                onClick={() =>
                                                    setConfirmDelete(false)
                                                }
                                            >
                                                Keep it
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className="text-link danger-text"
                                            onClick={() =>
                                                setConfirmDelete(true)
                                            }
                                        >
                                            Delete {editor.kind}
                                        </button>
                                    )}
                                </div>
                            )}
                        </details>
                    )}
                </form>
                <aside className="editor-aside">
                    {penMode ? (
                        <section className="specimen pen-specimen">
                            <Icon name="pen" />
                            <span className="overline">
                                {draft.brand || 'Your collection'}
                            </span>
                            <h2>{draft.model || 'A pen with a story'}</h2>
                            <p>
                                {[draft.color, draft.nibSize, draft.nibType]
                                    .filter(Boolean)
                                    .join(' · ') ||
                                    'The details make it yours.'}
                            </p>
                            {pen && (
                                <div className="specimen-foot">
                                    <strong>{model.penCount(pen.id)}</strong>{' '}
                                    refills recorded
                                </div>
                            )}
                        </section>
                    ) : (
                        <section className="specimen ink-specimen">
                            <Swatch ink={previewInk} large />
                            <span className="overline">
                                {draft.brand || 'Your collection'}
                            </span>
                            <h2>
                                {draft.name || 'A little color for your day'}
                            </h2>
                            <p>
                                {draft.collection || 'Your next favorite ink.'}
                            </p>
                            {swatch ? (
                                <span className="small muted">
                                    {swatch.source}
                                    {swatch.url && (
                                        <>
                                            {' '}
                                            ·{' '}
                                            <a
                                                href={swatch.url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Reference ↗
                                            </a>
                                        </>
                                    )}
                                </span>
                            ) : (
                                <span className="small muted">
                                    No swatch recorded yet
                                </span>
                            )}
                        </section>
                    )}
                    {ink && <InkStory ink={ink} expanded />}
                    {item && (
                        <section className="history-section">
                            <div className="section-heading">
                                <h2>
                                    {penMode
                                        ? 'This pen’s story'
                                        : 'On the page'}
                                </h2>
                                <span className="count">{history.length}</span>
                            </div>
                            {!penMode &&
                                model.currentPens(item.id).length > 0 && (
                                    <p className="small muted">
                                        Currently in{' '}
                                        {model
                                            .currentPens(item.id)
                                            .map(penLabel)
                                            .join(', ')}
                                        .
                                    </p>
                                )}
                            {history.length ? (
                                <EntryRows
                                    entries={history}
                                    model={model}
                                    onEdit={(entry) =>
                                        onOpen({ kind: 'refill', draft: entry })
                                    }
                                />
                            ) : (
                                <p className="muted">
                                    No refills yet. The first one is always a
                                    good excuse to write.
                                </p>
                            )}
                            {canEdit && !item.archived && (
                                <button
                                    className="button secondary full-width"
                                    onClick={() =>
                                        onOpen({
                                            kind: 'refill',
                                            draft: {
                                                date: '',
                                                penId: penMode ? item.id : '',
                                                inkIds: penMode
                                                    ? model.latest
                                                          .get(item.id)
                                                          ?.inkIds.filter(
                                                              (id) =>
                                                                  id !==
                                                                  EMPTY_INK_ID,
                                                          ) || []
                                                    : [item.id],
                                                notes: '',
                                            },
                                        })
                                    }
                                >
                                    <Icon name="plus" />
                                    Log a refill
                                </button>
                            )}
                        </section>
                    )}
                </aside>
            </div>
        </>
    );
}
const normalizeBrand = (value: string) => value.trim().toLocaleLowerCase();
