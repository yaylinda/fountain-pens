import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import type {
    CollectionModel,
    EditorState,
    RefillDraft,
    JournalEntry,
} from '../lib/collection';
import type { Ink, Pen } from '../models/types';

interface EditorHistory {
    parentKey: string;
    draftKey?: string;
}

/** Editors are history entries; inventory filters remain in the return URL. */
export function useEditorNavigation(model: CollectionModel) {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const kind = params.get('editor');
    const id = params.get('id');
    const history = location.state?.collectionEditor as
        EditorHistory | undefined;
    const drafts = useRef(new Map<string, RefillDraft>());
    const initialDrafts = useRef(new Map<string, RefillDraft>());
    const currentEditor = useRef<{ key: string; editor: EditorState | null }>({ key: '', editor: null });
    const savedEntries = useRef(new Map<string, JournalEntry | null>());
    const positions = useRef(
        new Map<string, { top: number; focusKey: string }>(),
    );
    const skipBlock = useRef(false);
    const [dirtyState, setDirtyState] = useState({ key: '', value: false });
    const dirty = dirtyState.key === location.key && dirtyState.value;
    const onDirty = useCallback(
        (value: boolean) => setDirtyState({ key: location.key, value }),
        [location.key],
    );
    const blocker = useBlocker(() => {
        if (skipBlock.current) {
            skipBlock.current = false;
            return false;
        }
        return dirty;
    });

    const returnTo = history
        ? drafts.current.get(history.parentKey)
        : undefined;
    let editor: EditorState | null = null;
    if (kind === 'pen' && (id === 'new' || model.penById.has(id || '')))
        editor = { kind, item: model.penById.get(id || ''), returnTo };
    if (kind === 'ink' && (id === 'new' || model.inkById.has(id || '')))
        editor = { kind, item: model.inkById.get(id || ''), returnTo };
    if (kind === 'refill') {
        const wasSaved = savedEntries.current.has(location.key);
        const expected = wasSaved
            ? savedEntries.current.get(location.key)
            : history?.draftKey ? initialDrafts.current.get(history.draftKey) : undefined;
        const entry = model.journal.find(entry => entry.id === (wasSaved ? expected?.id : id));
        const cached = drafts.current.get(location.key);
        if (expected !== null && ((id === 'new' && !wasSaved) || entry || expected))
            editor = {
                kind,
                draft:
                    id === 'new' && !wasSaved
                        ? cached || (history?.draftKey ? initialDrafts.current.get(history.draftKey) : undefined)
                        : entry
                          ? { ...entry, ...cached, index: entry.index }
                          : expected || undefined,
            };
    }

    if (currentEditor.current.key !== location.key) currentEditor.current = { key: location.key, editor };
    else if (!editor && kind && currentEditor.current.editor) editor = currentEditor.current.editor;

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    useEffect(() => {
        if (kind) {
            window.scrollTo({ top: 0 });
            return;
        }
        const position = positions.current.get(location.key);
        if (!position) return;
        const timeout = window.setTimeout(() => {
            const target = [
                ...document.querySelectorAll<HTMLElement>('[data-focus-key]'),
            ].find((element) => element.dataset.focusKey === position.focusKey);
            (target || document.getElementById('main-content'))?.focus({
                preventScroll: true,
            });
            window.scrollTo({ top: position.top });
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [location.key, kind]);

    const onOpen = (next: EditorState) => {
        positions.current.set(location.key, {
            top: window.scrollY,
            focusKey:
                (document.activeElement as HTMLElement)?.dataset.focusKey || '',
        });
        if (next.kind !== 'refill' && next.returnTo) {
            // The parent entry stays in history with its unfinished refill intact.
            drafts.current.set(location.key, {
                ...next.returnTo,
                hasUnsavedChanges: true,
            });
            skipBlock.current = true;
        }
        const draftKey = crypto.randomUUID();
        if (next.kind === 'refill' && next.draft) initialDrafts.current.set(draftKey, next.draft);
        const nextParams = new URLSearchParams(location.search);
        nextParams.set('editor', next.kind);
        nextParams.set(
            'id',
            next.kind === 'refill'
                ? next.draft?.id ?? 'new'
                : next.item?.id || 'new',
        );
        navigate(
            { pathname: location.pathname, search: nextParams.toString() },
            {
                state: {
                    collectionEditor: {
                        parentKey: location.key,
                        draftKey: next.kind === 'refill' ? draftKey : undefined,
                    } satisfies EditorHistory,
                },
            },
        );
    };
    const onClose = () => {
        if (history) navigate(-1);
        else {
            const nextParams = new URLSearchParams(location.search);
            nextParams.delete('editor');
            nextParams.delete('id');
            navigate(
                { pathname: location.pathname, search: nextParams.toString() },
                { replace: true },
            );
        }
    };
    const onSaved = (item?: Pen | Ink, entry?: JournalEntry | null) => {
        currentEditor.current = { key: '', editor: null };
        // Forward navigation to a saved creation must reopen it as an edit.
        if (entry !== undefined)
            savedEntries.current.set(location.key, entry);
        if (editor && editor.kind !== 'refill' && returnTo && history && item) {
            drafts.current.set(
                history.parentKey,
                editor.kind === 'pen'
                    ? { ...returnTo, penId: item.id, needsRefill: undefined }
                    : {
                          ...returnTo,
                          inkIds: [
                              ...returnTo.inkIds.filter((id) => id !== 'NONE'),
                              item.id,
                          ],
                      },
            );
        }
        drafts.current.delete(location.key);
        skipBlock.current = true;
        onDirty(false);
        onClose();
    };
    const discard = () => {
        if (blocker.state !== 'blocked') return;
        drafts.current.delete(location.key);
        onDirty(false);
        blocker.proceed();
    };
    return {
        editor,
        editorRequested: !!kind,
        editorKey: location.key,
        onOpen,
        onClose,
        onSaved,
        onDirty,
        pending: blocker.state === 'blocked',
        keepEditing: () => blocker.state === 'blocked' && blocker.reset(),
        discard,
    };
}
