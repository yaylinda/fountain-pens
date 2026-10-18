import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Ink, Pen } from './models/types';
import type { JournalEntry } from './lib/collection';
import { useCollection } from './hooks/useCollection';
import { useCollectionNavigation } from './hooks/useCollectionNavigation';
import CollectionTabs from './components/collection/CollectionTabs';
import { useEditorNavigation } from './hooks/useEditorNavigation';
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
import { FavoritesContext } from './context/FavoritesContext';
import { setFavorite, getPenById, getInkById } from './services/dataService';
import { SAVE_CELEBRATION, type SaveOrigin } from './lib/saveCelebration';

import { OwnerControls } from './components/OwnerControls';
const navItems: { to: string; label: string; icon: IconName }[] = [
    { to: '/', label: 'The desk', icon: 'desk' },
    { to: '/collection', label: 'Collection', icon: 'collection' },
    { to: '/journal', label: 'Refill journal', icon: 'journal' },
];

export default function App() {
    const { collection, model, loading, error, warning, refresh, retry } =
        useCollection();
    const {
        editor,
        editorRequested,
        editorKey,
        onOpen,
        onClose,
        onDirty,
        onSaved: finishEditing,
        pending,
        keepEditing,
        discard,
    } = useEditorNavigation(model);
    useEffect(() => {
        let disposed = false;
        let generation = 0;
        let stop: (() => void) | undefined;
        const saved = (event: Event) => {
            const current = ++generation;
            const origin = (event as CustomEvent<SaveOrigin>).detail;
            void import('./lib/inkCeremony').then(({ playInkCeremony }) => {
                if (disposed || current !== generation) return;
                stop?.();
                stop = playInkCeremony(origin);
            }).catch(() => { /* Decoration must never change persistence results. */ });
        };
        window.addEventListener(SAVE_CELEBRATION, saved);
        return () => {
            disposed = true;
            stop?.();
            window.removeEventListener(SAVE_CELEBRATION, saved);
        };
    }, []);
    const [message, setMessage] = useState('');
    const [favoriteBusy, setFavoriteBusy] = useState(false);
    const location = useLocation();
    const collectionNavigation = useCollectionNavigation();
    const canEdit = collection.canEdit === true;
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [location.pathname]);
    useEffect(() => {
        if (!message) return;
        const timeout = window.setTimeout(() => setMessage(''), 4500);
        return () => window.clearTimeout(timeout);
    }, [message]);
    useEffect(() => {
        document.title = `${editor ? (editor.kind === 'refill' ? 'Refill' : editor.kind === 'pen' ? 'Pen details' : 'Ink details') : (location.pathname === '/pens' ? 'Pens · Collection' : location.pathname === '/inks' ? 'Inks · Collection' : navItems.find((item) => item.to === location.pathname)?.label) || 'Collection'} · Ink & nib`;
    }, [editor, location.pathname]);
    const onSaved = (
        text: string,
        item?: Pen | Ink,
        entry?: JournalEntry | null,
    ) => {
        refresh();
        setMessage(text);
        finishEditing(item, entry);
    };
    const toggleFavorite = async (kind: 'pen' | 'ink', id: string) => {
        if (!canEdit || favoriteBusy) return;
        const item = kind === 'pen' ? getPenById(id) : getInkById(id);
        if (!item) return;
        const favorite = !item.favorite;
        setFavoriteBusy(true);
        const saving = setFavorite(kind, id, favorite);
        refresh();
        const saved = await saving;
        refresh();
        setFavoriteBusy(false);
        setMessage(saved ? (favorite ? 'Added to favorites.' : 'Removed from favorites.') : 'Favorite could not be saved. Please try again.');
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
        <FavoritesContext.Provider value={{ canEdit, busy: favoriteBusy, toggle: toggleFavorite }}>
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
                <Link to="/" className="wordmark">
                    <span className="brand-mark">
                        <Icon name="pen" />
                    </span>
                    <span>
                        Ink <em>&</em> nib
                    </span>
                </Link>
                <nav aria-label="Main navigation">
                    {navItems.map((item) => item.to === '/collection' ? (
                        <Link key={item.to} to={collectionNavigation.home}
                            className={collectionNavigation.active ? 'active' : undefined}
                            aria-current={collectionNavigation.active ? 'page' : undefined}>
                            <Icon name={item.icon} /><span>{item.label}</span>
                        </Link>
                    ) : (
                        <NavLink end={item.to === '/'} key={item.to} to={item.to}>
                            <Icon name={item.icon} /><span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="profile">
                        <span className="profile-monogram">L</span>
                        <span>
                            Linda’s collection
                        </span>
                    </div>
                    <OwnerControls canEdit={canEdit} />
                </div>
            </aside>
            <main id="main-content" tabIndex={-1} className="main-content">
                {warning && <p role="alert">{warning} <button className="text-link" onClick={retry}>Refresh collection</button></p>}
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
                                onClick={keepEditing}
                            >
                                Keep editing
                            </button>
                            <button
                                className="button secondary small-button"
                                onClick={discard}
                            >
                                Discard changes
                            </button>
                        </div>
                    </div>
                )}
                {collectionNavigation.active && !loading && !error && <CollectionTabs
                    targets={collectionNavigation.targets} pens={model.activePens.length} inks={model.activeInks.length} />}
                {loading ? (
                    <div className="loading-state" role="status">
                        <Icon name="pen" />
                        <h1>Opening your collection…</h1>

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
                ) : editorRequested && !editor ? (
                    <EmptyState
                        title="This item is no longer available"
                        action={
                            <button
                                className="button primary"
                                onClick={onClose}
                            >
                                Back to the collection
                            </button>
                        }
                    >
                        It may have been removed. Your collection is still here.
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
                            <Route path="/collection" element={<Navigate to={collectionNavigation.home} replace />} />
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
                                        title="Page not found"
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
        </div>
        </FavoritesContext.Provider>
    );
}
