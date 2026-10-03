import { pathToFileURL } from 'node:url';

const CHECK_NAME = 'Supabase Preview';
const DETAILS_URL = 'https://supabase.com/dashboard/project/dtdzbjxrqsrhfifxsebi';
const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 15 * 1000;

// GitHub supplies check IDs in creation order. Use all runs, not only completed
// runs: a newer pending/failed attempt must supersede an older success.
export async function waitForSupabase({
  env = process.env,
  fetchImpl = fetch,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (env.GITHUB_REPOSITORY !== 'yaylinda/fountain-pens' ||
      env.GITHUB_EVENT_NAME !== 'push' || env.GITHUB_REF !== 'refs/heads/main' ||
      !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || !env.GH_TOKEN) {
    throw new Error('Supabase gate requires an authenticated main push in the production repository.');
  }
  const deadline = now() + TIMEOUT_MS;
  const remaining = () => {
    const ms = deadline - now();
    if (ms <= 0) throw new Error('Timed out waiting for a successful Supabase schema check.');
    return ms;
  };

  while (true) {
    let latest;
    for (let page = 1; ; page++) {
      const timeout = Math.min(30_000, remaining());
      let runs;
      try {
        const url = new URL(`https://api.github.com/repos/yaylinda/fountain-pens/commits/${env.GITHUB_SHA}/check-runs`);
        url.search = new URLSearchParams({ check_name: CHECK_NAME, filter: 'all', per_page: '100', page: String(page) });
        const response = await fetchImpl(url, {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${env.GH_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
          redirect: 'error',
          signal: AbortSignal.timeout(timeout),
        });
        if (!response.ok) throw new Error();
        runs = (await response.json()).check_runs;
        if (!Array.isArray(runs)) throw new Error();
      } catch {
        // Never log API bodies, check output, request headers or raw exceptions.
        throw new Error('Unable to read Supabase schema checks from GitHub.');
      }
      remaining();
      for (const run of runs) {
        if (run.head_sha === env.GITHUB_SHA && run.name === CHECK_NAME &&
            run.app?.slug === 'supabase' && run.details_url === DETAILS_URL &&
            Number.isSafeInteger(run.id) && (!latest || run.id > latest.id)) {
          latest = run;
        }
      }
      if (runs.length < 100) break;
    }
    if (latest?.status === 'completed') {
      if (latest.conclusion !== 'success') {
        throw new Error('The latest Supabase schema check did not succeed; production deployment is blocked.');
      }
      return;
    }
    // Missing checks may still be registering. Missing or pending checks at the
    // deadline fail closed; unrelated app/job checks cannot satisfy the gate.
    await sleep(Math.min(POLL_MS, remaining()));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await waitForSupabase();
    console.log('Supabase schema check succeeded for the production commit.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
