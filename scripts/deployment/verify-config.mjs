// Deliberately reports only field names, never environment values.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const project = JSON.parse(await readFile('.vercel/project.json', 'utf8'));
assert.equal(project.orgId, process.env.VERCEL_ORG_ID, 'Vercel organization mismatch');
assert.equal(project.projectId, process.env.VERCEL_PROJECT_ID, 'Vercel project mismatch');
const url = process.env.VITE_SUPABASE_URL;
assert.ok(url && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url), 'Missing or invalid VITE_SUPABASE_URL');
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key?.startsWith('sb_publishable_'), 'VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable key');
const allowedPublicVariables = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
for (const name of Object.keys(process.env)) {
  if (!name.startsWith('VITE_')) continue;
  assert.ok(allowedPublicVariables.has(name), 'Unexpected public build variable; only the approved Supabase URL and publishable key are allowed');
}
console.log('Verified project identity and public Supabase build configuration.');
