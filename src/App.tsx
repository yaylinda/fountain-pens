import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Link,
    NavLink,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom';
import type { Ink, Pen } from './models/types';
import type { EditorState } from './lib/collection';
import { useCollection } from './hooks/useCollection';
import { useLocalNetwork } from './context/LocalNetworkContext';
import { useDirtyState } from './context/DirtyStateContext';
import Overview from './components/collection/Overview';
import Inventory from './components/collection/Inventory';
import Journal from './components/collection/Journal';
import { EntityEditor } from './components/collection/EntityEditor';
import { RefillEditor } from './components/collection/RefillEditor';
import {
    EmptyState,
    Icon,
    type IconName,
} from './components/collection/Primitives';
import './App.css';

const SaveDialog = lazy(() => import('./components/SaveDialog'));
const navItems: { to: string; label: string; icon: IconName }[] = [
    { to: '/', label: 'The desk', icon: 'desk' },
    { to: '/pens', label: 'Fountain pens', icon: 'pen' },
    { to: '/inks', label: 'Ink cabinet', icon: 'ink' },
    { to: '/journal', label: 'Refill journal', icon: 'journal' },
];

export default function App() {
    const { collection, model, loading, error, refresh, retry } =
        useCollection();
    const { isLocal, isLoading: networkLoading } = useLocalNetwork();
    const { isDirty: hasSyncChanges } = useDirtyState();
    const [editor, setEditor] = useState<EditorState | null>(null);
    const [editorKey, setEditorKey] = useState(0);
    const [dirty, setDirty] = useState(false);
    const [pending, setPending] = useState<(() => void) | null>(null);
    const [message, setMessage] = useState('');
    const [syncOpen, setSyncOpen] = useState(false);
    const opener = useRef<HTMLElement | null>(null);
    const returnPosition = useRef({ top: 0, focusKey: '' });
    const navigate = useNavigate();
    const location = useLocation();
    const canEdit = isLocal && !networkLoading;
    const onDirty = useCallback((value: boolean) => setDirty(value), []);
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [location.pathname]);
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
        if (!message) return;
        const timeout = window.setTimeout(() => setMessage(''), 4500);
        return () => window.clearTimeout(timeout);
    }, [message]);
    useEffect(() => {
        document.title = `${editor ? (editor.kind === 'refill' ? 'Refill' : editor.kind === 'pen' ? 'Pen details' : 'Ink details') : navItems.find((item) => item.to === location.pathname)?.label || 'Collection'} · Ink & nib`;
    }, [editor, location.pathname]);
    const confirmIfDirty = (action: () => void) => {
        if (dirty) setPending(() => action);
        else action();
    };
    const openDirect = (next: EditorState) => {
        setEditor(next);
        setEditorKey((value) => value + 1);
        setDirty(false);
        setPending(null);
        window.scrollTo({ top: 0 });
    };
    const onOpen = (next: EditorState) => {
        if (next.kind !== 'refill' && next.returnTo) {
            openDirect({
                ...next,
                returnTo: { ...next.returnTo, hasUnsavedChanges: true },
            });
            return;
        }
        confirmIfDirty(() => {
            if (!editor) {
                opener.current = document.activeElement as HTMLElement;
                returnPosition.current = {
                    top: window.scrollY,
                    focusKey: opener.current?.dataset.focusKey || '',
                };
            }
            openDirect(next);
        });
    };
    const closeDirect = (restorePosition = true) => {
        setEditor(null);
        setDirty(false);
        setPending(null);
        window.setTimeout(() => {
            const returnedItem =
                restorePosition && returnPosition.current.focusKey
                    ? [
                          ...document.querySelectorAll<HTMLElement>(
                              '[data-focus-key]',
                          ),
                      ].find(
                          (element) =>
                              element.dataset.focusKey ===
                              returnPosition.current.focusKey,
                      )
                    : undefined;
            const target =
                returnedItem ||
                (restorePosition && opener.current?.isConnected
                    ? opener.current
                    : document.getElementById('main-content'));
            target?.focus({ preventScroll: true });
            window.scrollTo({
                top: restorePosition ? returnPosition.current.top : 0,
            });
        }, 0);
    };
    const onClose = () =>
        confirmIfDirty(() => {
            if (editor && editor.kind !== 'refill' && editor.returnTo)
                openDirect({ kind: 'refill', draft: editor.returnTo });
            else closeDirect();
        });
    const onSaved = (text: string, item?: Pen | Ink) => {
        refresh();
        setMessage(text);
        setDirty(false);
        if (editor && editor.kind !== 'refill' && editor.returnTo && item) {
            const draft = { ...editor.returnTo };
            if (editor.kind === 'pen') draft.penId = item.id;
            else
                draft.inkIds = [
                    ...draft.inkIds.filter((id) => id !== 'NONE'),
                    item.id,
                ];
            openDirect({ kind: 'refill', draft });
        } else closeDirect();
    };
    const backLabel =
        location.pathname === '/pens'
            ? 'pens'
            : location.pathname === '/inks'
              ? 'inks'
              : location.pathname === '/journal'
                ? 'your journal'
                : 'the desk';
    const editorProps = {
        collection,
        model,
        canEdit,
        onClose,
        onDirty,
        onSaved,
        onOpen,
        backLabel,
    };
    return (
        <div className="app-shell">
            <a
                className="skip-link"
                href="#main-content"
                onClick={(event) => {
                    event.preventDefault();
                    document.getElementById('main-content')?.focus();
                }}
            >
                Skip to collection
            </a>
            <aside className="sidebar">
                <Link
                    to="/"
                    className="wordmark"
                    onClick={(event) => {
                        if (editor) {
                            event.preventDefault();
                            confirmIfDirty(() => {
                                closeDirect(false);
                                navigate('/');
                            });
                        }
                    }}
                >
                    <span className="brand-mark">
                        <Icon name="pen" />
                    </span>
                    <span>
                        Ink <em>&</em> nib
                        <span className="wordmark-caption">
                            A collection, well kept.
                        </span>
                    </span>
                </Link>
                <span className="nav-caption overline">
                    Your writing corner
                </span>
                <nav aria-label="Main navigation">
                    {navItems.map((item) => (
                        <NavLink
                            end={item.to === '/'}
                            key={item.to}
                            to={item.to}
                            onClick={(event) => {
                                if (editor) {
                                    event.preventDefault();
                                    confirmIfDirty(() => {
                                        closeDirect(false);
                                        navigate(item.to);
                                    });
                                }
                            }}
                        >
                            <Icon name={item.icon} />
                            <span>{item.label}</span>
                            {!loading && item.to === '/pens' && (
                                <span className="nav-count">
                                    {model.activePens.length}
                                </span>
                            )}
                            {!loading && item.to === '/inks' && (
                                <span className="nav-count">
                                    {model.activeInks.length}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="sidebar-note">
                        <span className="sidebar-flourish" aria-hidden="true">
                            Aa
                        </span>
                        <p>
                            For the love of
                            <br />
                            putting pen to paper.
                        </p>
                    </div>
                    {canEdit && (
                        <details className="data-tools">
                            <summary>Data tools</summary>
                            <button
                                className="text-link"
                                disabled={!hasSyncChanges}
                                onClick={() => setSyncOpen(true)}
                            >
                                {hasSyncChanges
                                    ? 'Review changes to sync'
                                    : 'No changes to sync'}
                            </button>
                        </details>
                    )}
                    <div className="profile">
                        <span className="profile-monogram">L</span>
                        <span>
                            Linda’s collection
                            <span className="small muted block">
                                Pens, inks & possibilities
                            </span>
                        </span>
                    </div>
                </div>
            </aside>
            <main id="main-content" tabIndex={-1} className="main-content">
                <div className="topline">
                    <span>THE PERSONAL STATIONERY ARCHIVE</span>
                    <span className="topline-date">
                        {new Intl.DateTimeFormat('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        }).format(new Date())}
                    </span>
                </div>
                {!isLocal && (
                    <p className="read-only-note">
                        Your collection is in view-only mode outside your home
                        network.
                    </p>
                )}
                {pending && (
                    <div className="draft-notice" role="alert">
                        <div>
                            <strong>Keep your unfinished changes?</strong>
                            <p>
                                You have edits in this workspace that haven’t
                                been saved.
                            </p>
                        </div>
                        <div>
                            <button
                                className="button primary small-button"
                                onClick={() => setPending(null)}
                            >
                                Keep editing
                            </button>
                            <button
                                className="button secondary small-button"
                                onClick={() => {
                                    const action = pending;
                                    setPending(null);
                                    setDirty(false);
                                    action();
                                }}
                            >
                                Discard changes
                            </button>
                        </div>
                    </div>
                )}
                {loading || networkLoading ? (
                    <div className="loading-state" role="status">
                        <Icon name="pen" />
                        <h1>Opening your collection…</h1>
                        <p>A moment to find your place.</p>
                    </div>
                ) : error ? (
                    <EmptyState
                        title="Your collection couldn’t be opened"
                        action={
                            <button className="button primary" onClick={retry}>
                                Try again
                            </button>
                        }
                    >
                        Your inventory hasn’t been changed. Try loading it
                        again.
                    </EmptyState>
                ) : editor ? (
                    <div key={editorKey} className="page-enter">
                        {editor.kind === 'refill' ? (
                            <RefillEditor editor={editor} {...editorProps} />
                        ) : (
                            <EntityEditor editor={editor} {...editorProps} />
                        )}
                    </div>
                ) : (
                    <div className="page-enter" key={location.pathname}>
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <Overview
                                        model={model}
                                        onOpen={onOpen}
                                        canEdit={canEdit}
                                    />
                                }
                            />
                            <Route
                                path="/pens"
                                element={
                                    <Inventory
                                        kind="pens"
                                        collection={collection}
                                        model={model}
                                        onOpen={onOpen}
                                        canEdit={canEdit}
                                    />
                                }
                            />
                            <Route
                                path="/inks"
                                element={
                                    <Inventory
                                        kind="inks"
                                        collection={collection}
                                        model={model}
                                        onOpen={onOpen}
                                        canEdit={canEdit}
                                    />
                                }
                            />
                            <Route
                                path="/journal"
                                element={
                                    <Journal
                                        model={model}
                                        onOpen={onOpen}
                                        canEdit={canEdit}
                                    />
                                }
                            />
                            <Route
                                path="*"
                                element={
                                    <EmptyState
                                        title="A page out of place"
                                        action={
                                            <Link
                                                className="button primary"
                                                to="/"
                                            >
                                                Back to the desk
                                            </Link>
                                        }
                                    >
                                        This page isn’t in your collection.
                                    </EmptyState>
                                }
                            />
                        </Routes>
                    </div>
                )}
                <footer className="page-footer">
                    <span>Ink & nib</span>
                    <span>A little order. More room to write.</span>
                </footer>
            </main>
            <div className="live-notice" role="status" aria-live="polite">
                {message && (
                    <div className="notice-message">
                        <Icon name="check" />
                        {message}
                        <button
                            className="icon-button"
                            aria-label="Dismiss notification"
                            onClick={() => setMessage('')}
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                )}
            </div>
            {syncOpen && (
                <Suspense
                    fallback={
                        <div className="notice-message">
                            Opening data tools…
                        </div>
                    }
                >
                    <SaveDialog
                        open={syncOpen}
                        onClose={() => setSyncOpen(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}
