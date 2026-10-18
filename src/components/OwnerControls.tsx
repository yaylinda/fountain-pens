import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabaseClient';
import { activateCollection, isCollectionSaving } from '../services/dataService';

/** Viewing is public. Auth only enables the database-approved owner's controls. */
export function OwnerControls({ canEdit }: { canEdit: boolean }) {
    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(false);
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const accountButton = useRef<HTMLButtonElement>(null);
    const emailInput = useRef<HTMLInputElement>(null);
    const form = useRef<HTMLFormElement>(null);
    const restoreFocus = useRef(false);

    useEffect(() => {
        try {
            const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
                // Only restore focus if authentication removes the active form.
                if (next && form.current?.contains(document.activeElement)) restoreFocus.current = true;
                activateCollection(next?.user.id || null);
                setSession(next);
                setReady(true);
                if (next) { setOpen(false); setPassword(''); }
            });
            return () => data.subscription.unsubscribe();
        } catch { setReady(true); setError('The collection connection is not configured.'); }
    }, []);
    useEffect(() => {
        if (open) {
            if (busy) form.current?.focus();
            else emailInput.current?.focus();
        }
    }, [open, busy]);
    useEffect(() => {
        if (!open) return;
        const shell = document.querySelector<HTMLElement>('.app-shell');
        if (!shell) return;
        const previous = shell.inert;
        shell.inert = true;
        return () => { shell.inert = previous; };
    }, [open]);
    useEffect(() => {
        if (!busy && restoreFocus.current && (!open || error)) {
            // Browsers blur disabled controls while the request is pending.
            if (document.activeElement === document.body || form.current?.contains(document.activeElement) || document.activeElement === accountButton.current) {
                if (open) emailInput.current?.focus();
                else accountButton.current?.focus();
            }
            restoreFocus.current = false;
        }
    }, [open, session, busy, error]);

    const close = () => {
        if (busy) return;
        restoreFocus.current = true;
        setOpen(false); setPassword(''); setError('');
    };
    const signIn = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy) return;
        restoreFocus.current = true;
        setBusy(true); setError('');
        try {
            const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
            if (error) setError('Sign-in failed. Check your email and password.');
            else setPassword('');
        } catch { setError('Unable to sign in. Check your connection.'); }
        finally { setBusy(false); }
    };
    const signOut = async () => {
        if (busy) return;
        if (isCollectionSaving()) { setError('Wait for the current save to finish.'); return; }
        restoreFocus.current = true;
        setBusy(true); setError('');
        try {
            const { error } = await getSupabase().auth.signOut({ scope: 'local' });
            if (error) setError('Could not sign out. Please try again.');
        } catch { setError('Could not sign out. Please try again.'); }
        finally { setBusy(false); }
    };

    return <section className="owner-controls" aria-label="Collection access">
        <div className="access-bar">
            <p className={`access-mode${canEdit ? ' is-owner' : ''}`} role="status">
                <strong>{!ready ? 'Checking access…' : canEdit ? 'Editing' : session ? 'View only' : 'Public view'}</strong>
            </p>
            <button ref={accountButton} className="text-link account-button" disabled={busy || !ready}
                aria-expanded={session ? undefined : open} aria-controls={session ? undefined : 'owner-sign-in'}
                onClick={session ? signOut : () => open ? close() : setOpen(true)}>
                {session ? (busy ? 'Signing out…' : 'Sign out') : 'Owner sign in'}
            </button>
        </div>
        {session && !canEdit && <p className="access-note">This account can view the collection only. Editing is reserved for Linda.</p>}
        {error && !open && <p className="access-error" role="alert">{error}</p>}
        {open && !session && createPortal(<div className="owner-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}>
            <form ref={form} id="owner-sign-in" className="owner-sign-in" onSubmit={signIn}
            role="dialog" aria-modal="true" tabIndex={-1}
            aria-labelledby="owner-sign-in-title" aria-describedby="owner-sign-in-note" aria-busy={busy}
            onKeyDown={event => {
                if (event.key === 'Escape') { event.preventDefault(); close(); }
                if (event.key !== 'Tab') return;
                const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('input, button')].filter(element => !element.matches(':disabled'));
                const first = controls[0], last = controls[controls.length - 1];
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && (document.activeElement === first || document.activeElement === form.current)) {
                    event.preventDefault(); last?.focus();
                } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === form.current)) {
                    event.preventDefault(); first.focus();
                }
            }}>
            <div>
                <button type="button" className="owner-dialog-close" aria-label="Close sign in" disabled={busy} onClick={close}>×</button>
                <h2 id="owner-sign-in-title">Owner sign in</h2>
                <p id="owner-sign-in-note" className="muted small">Sign in to edit Linda’s collection. Everyone is welcome to browse.</p>
            </div>
            <fieldset disabled={busy} className="owner-sign-in-fields">
                <legend className="sr-only">Owner credentials</legend>
                <label className="field"><span>Email</span><input ref={emailInput} name="email" aria-describedby={error ? 'owner-sign-in-error' : undefined} type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={e => setEmail(e.target.value)} /></label>
                <label className="field"><span>Password</span><input name="password" aria-describedby={error ? 'owner-sign-in-error' : undefined} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
                {error && <p id="owner-sign-in-error" className="access-error" role="alert">{error}</p>}
                <div className="owner-sign-in-actions">
                    <button className="button primary small-button" type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
                    <button className="text-link account-button" type="button" onClick={close}>Cancel</button>
                </div>
            </fieldset>
        </form></div>, document.body)}
    </section>;
}
