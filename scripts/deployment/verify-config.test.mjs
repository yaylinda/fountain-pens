import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/deployment/verify-config.mjs');
test('production guard accepts public configuration and rejects wrong targets or secrets without leaking values', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fountain-deploy-'));
  try {
    mkdirSync(join(cwd, '.vercel'));
    writeFileSync(join(cwd, '.vercel/project.json'), JSON.stringify({ orgId: 'team_test', projectId: 'prj_test' }));
    const env = { VERCEL_ORG_ID: 'team_test', VERCEL_PROJECT_ID: 'prj_test', VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' };
    const run = (change) => spawnSync(process.execPath, [script], { cwd, env: { ...env, ...change }, encoding: 'utf8' });
    const legacyServiceRoleJwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'DO_NOT_LEAK'].join('.');
    assert.equal(run({}).status, 0);
    for (const change of [
      { VERCEL_PROJECT_ID: 'prj_wrong' },
      { VITE_SUPABASE_URL: 'http://localhost:54321' },
      { VITE_SUPABASE_PUBLISHABLE_KEY: '' },
      { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_DO_NOT_LEAK' },
      { VITE_SUPABASE_PUBLISHABLE_KEY: legacyServiceRoleJwt },
      { VITE_SERVICE_ROLE: legacyServiceRoleJwt },
      { VITE_SUPABASE_SECRET_KEY: 'sb_secret_DO_NOT_LEAK' },
      { VITE_SUPABASE_ANON_KEY: legacyServiceRoleJwt },
      { VITE_OTHER: legacyServiceRoleJwt },
      { VITE_THEME: 'harmless-but-unapproved' },
      { VITE_OTHER: 'sb_secret_DO_NOT_LEAK' },
    ]) {
      const result = run(change);
      assert.notEqual(result.status, 0);
      assert.ok(!`${result.stdout}${result.stderr}`.includes('DO_NOT_LEAK'));
    }
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
