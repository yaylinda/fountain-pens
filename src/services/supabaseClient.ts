import type { Database } from './database.types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function publicConfig(env: Record<string, unknown>) {
    const url = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (typeof url !== 'string' || typeof key !== 'string' || !key.startsWith('sb_publishable_'))
        throw new Error('Collection connection is not configured. Set the Supabase URL and publishable key.');
    const parsed = new URL(url);
    if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Invalid collection URL.');
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))
        throw new Error('The collection connection requires HTTPS.');
    return { url, key };
}
let client: SupabaseClient<Database> | undefined;
export function getSupabase() {
    if (!client) {
        const { url, key } = publicConfig(import.meta.env);
        client = createClient<Database>(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    }
    return client;
}
