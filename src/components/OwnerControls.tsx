import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabaseClient';
import { activateCollection, isCollectionSaving } from '../services/dataService';

/** Viewing is public. Auth only enables the database-approved owner's controls. */
export function OwnerControls({ canEdit }: { canEdit: boolean }) {
    const [session, setSession] = useState<Session | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        try {
            const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
                activateCollection(next?.user.id || null);
                setSession(next);
            });
            return () => data.subscription.unsubscribe();
        } catch { setError('The collection connection is not configured.'); }
    }, []);
    const signIn = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setError('');
        try {
            const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
            if (error) setError('Sign-in failed. Check your email and password.');
            else setPassword('');
        } catch { setError('Unable to sign in. Check your connection.'); }
        finally { setBusy(false); }
    };
    if (session) return <div className="owner-controls">
        <p className="small muted">{canEdit ? 'Signed in as collection owner' : 'This account can view the collection only.'}</p>
        {error && <p role="alert">{error}</p>}
        <button className="text-link" disabled={busy} onClick={async () => {
            if (isCollectionSaving()) { setError('Wait for the current save to finish.'); return; }
            setBusy(true); setError('');
            try { const { error } = await getSupabase().auth.signOut({ scope: 'local' }); if (error) setError('Could not sign out. Please try again.'); }
            catch { setError('Could not sign out. Please try again.'); }
            finally { setBusy(false); }
        }}>Sign out</button>
    </div>;
    return <details className="data-tools owner-controls"><summary>Owner sign in</summary>
        <form onSubmit={signIn}>
            {error && <p role="alert">{error}</p>}
            <fieldset className="form-fields" disabled={busy}>
                <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
                <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
                <button className="button primary small-button" type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
            </fieldset>
        </form>
    </details>;
}
