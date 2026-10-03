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
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('VITE_')) continue;
  assert.ok(!/secret|service_role|password|token/i.test(name), 'Disallowed privileged VITE_ variable name');
  assert.ok(!value?.startsWith('sb_secret_'), 'Secret key cannot be included in browser configuration');
}
console.log('Verified project identity and public Supabase build configuration.');
