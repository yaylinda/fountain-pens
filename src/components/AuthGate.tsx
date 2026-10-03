import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabaseClient';
import { isExplicitSignOut } from '../services/sessionLifecycle';
import { activateCollection } from '../services/dataService';

export function AuthGate({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [mountedOwner, setMountedOwner] = useState<string | null>(null);
    const previousOwner = useRef<string | null>(null);
    useEffect(() => {
        let active = true;
        try {
            const client = getSupabase();
            // INITIAL_SESSION is emitted after persisted-session recovery. Keep this
            // callback synchronous; do not make Auth calls under its internal lock.
            const { data } = client.auth.onAuthStateChange((_event, next) => {
                if (!active) return;
                if (next) { previousOwner.current = next.user.id; setMountedOwner(next.user.id); }
                else if (isExplicitSignOut()) { previousOwner.current = null; setMountedOwner(null); }
                else if (previousOwner.current) setError('Your session ended. Sign in with the same account to resume your unfinished draft.');
                activateCollection(next?.user.id || null);
                setSession(next); setLoading(false);
            });
            return () => { active = false; data.subscription.unsubscribe(); };
        } catch {
            setError('Collection connection is not configured. Contact the collection administrator.');
            setLoading(false);
        }
        return () => { active = false; };
    }, []);
    const signIn = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setError('');
        try {
            const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
            if (error) setError('Sign-in failed. Check your email and password, then try again.');
            else setPassword('');
        } catch { setError('Unable to sign in. Check your connection and try again.'); }
        finally { setBusy(false); }
    };
    if (loading) return <main className="loading-state" role="status"><h1>Opening your collection…</h1></main>;
    return <>{mountedOwner && <div hidden={!session} key={mountedOwner}>{children}</div>}{!session && <main className="main-content"><form className="editor-form" onSubmit={signIn}>
        <h1>Ink & nib</h1><p>Sign in to Linda’s private collection.</p>
        {error && <p role="alert">{error}</p>}
        <fieldset disabled={busy} className="form-fields">
            <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <button className="button primary" type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
        </fieldset>
        {mountedOwner && <button type="button" className="text-link" onClick={() => { previousOwner.current = null; setMountedOwner(null); setError(''); }}>Discard unfinished draft</button>}
    </form></main>}</>;
}
