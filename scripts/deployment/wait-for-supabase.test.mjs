import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForSupabase } from './wait-for-supabase.mjs';

const env = {
  GITHUB_REPOSITORY: 'yaylinda/fountain-pens',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'a'.repeat(40),
  GH_TOKEN: 'DO_NOT_LEAK',
};
const success = {
  id: 100,
  head_sha: env.GITHUB_SHA,
  name: 'Supabase Preview',
  app: { slug: 'supabase' },
  details_url: 'https://supabase.com/dashboard/project/dtdzbjxrqsrhfifxsebi',
  status: 'completed',
  conclusion: 'success',
  output: { text: 'DO_NOT_LEAK' },
};

function harness(pages, change = {}) {
  let time = 0;
  const requests = [];
  const options = {
    env: { ...env, ...change },
    now: () => time,
    sleep: async (ms) => { time += ms; },
    fetchImpl: async (url, init) => {
      requests.push(url);
      assert.equal(url.origin, 'https://api.github.com');
      assert.equal(url.pathname, `/repos/yaylinda/fountain-pens/commits/${env.GITHUB_SHA}/check-runs`);
      assert.equal(url.searchParams.get('check_name'), 'Supabase Preview');
      assert.equal(url.searchParams.get('filter'), 'all');
      assert.equal(url.searchParams.get('per_page'), '100');
      assert.equal(url.searchParams.has('status'), false);
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers.Authorization, `Bearer ${env.GH_TOKEN}`);
      assert.ok(init.signal instanceof AbortSignal);
      const runs = pages[Math.min(requests.length - 1, pages.length - 1)];
      return { ok: true, json: async () => ({ check_runs: runs }) };
    },
  };
  return { options, requests, elapsed: () => time };
}

test('missing → pending → success releases only after completion', async () => {
  const h = harness([[], [{ ...success, status: 'in_progress', conclusion: null }], [success]]);
  await waitForSupabase(h.options);
  assert.equal(h.requests.length, 3);
  assert.equal(h.elapsed(), 30_000);
});

test('all non-success completed conclusions block without waiting', async () => {
  for (const conclusion of ['failure', 'skipped', 'neutral', 'cancelled', 'timed_out', 'action_required', 'stale', null]) {
    const h = harness([[{ ...success, conclusion }]]);
    await assert.rejects(waitForSupabase(h.options), /did not succeed/);
    assert.equal(h.elapsed(), 0);
  }
});

test('newest ID wins even if an old success completes later or appears first', async () => {
  const old = { ...success, completed_at: '2030-01-01T00:00:00Z' };
  const pending = { ...success, id: 101, status: 'queued', conclusion: null };
  const h = harness([[old, pending], [{ ...pending, status: 'completed', conclusion: 'failure' }, old]]);
  await assert.rejects(waitForSupabase(h.options), /did not succeed/);
  assert.equal(h.requests.length, 2);
});

test('paginates and finds newer failure after a full page containing success', async () => {
  const h = harness([
    Array.from({ length: 100 }, (_, id) => ({ ...success, id: id + 1 })),
    [{ ...success, id: 101, conclusion: 'failure' }],
  ]);
  await assert.rejects(waitForSupabase(h.options), /did not succeed/);
  assert.deepEqual(h.requests.map((url) => url.searchParams.get('page')), ['1', '2']);
});

test('missing, pending, wrong app/name/SHA/project never release and time out', async () => {
  for (const runs of [
    [],
    [{ ...success, status: 'in_progress' }],
    [{ ...success, app: { slug: 'github-actions' } }],
    [{ ...success, name: 'Deploy production' }],
    [{ ...success, head_sha: 'b'.repeat(40) }],
    [{ ...success, details_url: `${success.details_url}-other-project` }],
    [{ ...success, details_url: success.details_url.replace('supabase.com', 'supabase.com.evil.test') }],
  ]) {
    const h = harness([runs]);
    await assert.rejects(waitForSupabase(h.options), /Timed out/);
    assert.equal(h.elapsed(), 600_000);
    assert.equal(h.requests.length, 40);
  }
});

test('forks, PRs, dispatch, non-main refs, malformed SHA and absent token fail before API access', async () => {
  for (const change of [
    { GITHUB_REPOSITORY: 'fork/fountain-pens' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_EVENT_NAME: 'workflow_dispatch' },
    { GITHUB_REF: 'refs/heads/other' },
    { GITHUB_SHA: 'main' },
    { GH_TOKEN: '' },
  ]) {
    const h = harness([[success]], change);
    await assert.rejects(waitForSupabase(h.options), /requires an authenticated main push/);
    assert.equal(h.requests.length, 0);
  }
});

test('API failures redact raw exceptions and bodies', async () => {
  for (const fetchImpl of [
    async () => { throw new Error('DO_NOT_LEAK'); },
    async () => ({ ok: false, json: async () => { throw new Error('DO_NOT_LEAK'); } }),
    async () => ({ ok: true, json: async () => ({ output: 'DO_NOT_LEAK' }) }),
  ]) {
    const h = harness([]);
    await assert.rejects(waitForSupabase({ ...h.options, fetchImpl }), {
      message: 'Unable to read Supabase schema checks from GitHub.',
    });
  }
});
