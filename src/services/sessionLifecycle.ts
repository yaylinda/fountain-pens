import { getSupabase } from './supabaseClient';
let explicit = false;
export const isExplicitSignOut = () => explicit;
export async function signOutCollection() {
    explicit = true;
    try { return await getSupabase().auth.signOut({ scope: 'local' }); }
    finally { explicit = false; }
}
