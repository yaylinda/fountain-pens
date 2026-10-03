import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window','document','navigator','HTMLElement','HTMLInputElement','Node','Element','MutationObserver','Event','MouseEvent','KeyboardEvent']) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.scrollTo = () => {};
// Auth cross-tab channels are exercised separately; Node channels keep this synthetic worker alive.
Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined });
const { render, screen, waitFor, cleanup } = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const service = await import('../src/services/dataService');
const { publicConfig, getSupabase } = await import('../src/services/supabaseClient');
const { collectionDto } = await import('../src/services/collectionAdapter');
const { deriveCollection, today } = await import('../src/lib/collection');

const pen = { id: 'p', brand: 'Pilot', model: 'Test', color: '', nibSize: '', nibType: '', favorite: false, archived: false, needsRefill: true };
const ink = { id: 'i', brand: 'Ink', name: 'Test', collection: '', colorHex: null, favorite: false, archived: false };
const event = { id: 'e', sequence: '9007199254740993', penId: 'p', date: '2026-01-01', kind: 'refill', inkIds: ['i'], notes: 'Test', notPure: false };
const snapshot = () => ({ pens: [{ ...pen }], inks: [{ ...ink }], events: [{ ...event }], canEdit: true, asOf: '2026-10-03' });
let backend = snapshot();
let readFailure = false;
let writeCode = '';
const requests: { name: string; body: Record<string, unknown> }[] = [];
let loginFail = false;
let logoutFail = false;
let releaseLogin: (() => void) | undefined;
let loginGate: Promise<void> | undefined;
const owner = '00000000-0000-4000-8000-000000000001';
globalThis.fetch = async (input, init) => {
    const url = String(input);
    const name = url.split('/').at(-1)!;
    const body = JSON.parse(String(init?.body || '{}'));
    if (url.includes('/auth/v1/token')) {
        if (loginGate) await loginGate;
        if (loginFail) return Response.json({ msg: 'Private provider error', error_code: 'invalid_credentials' }, { status: 400 });
        const token = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: owner, exp: Math.floor(Date.now()/1000)+3600 }))}.synthetic`;
        return Response.json({ access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user: { id: owner, email: 'owner@example.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} } });
    }
    if (url.includes('/auth/v1/logout')) return logoutFail ? Response.json({ msg: 'synthetic failure' }, { status: 400 }) : new Response(null, { status: 204 });
    requests.push({ name, body });
    if (name === 'get_collection') {
        const captured = structuredClone(backend);
        return readFailure ? new Response('Unavailable', { status: 503 }) : Response.json(captured);
    }
    if (writeCode) return Response.json({ code: writeCode, message: 'Sensitive internal SQL context' }, { status: 400 });
    if (name === 'update_pen') {
        const updated = { ...body.p_item, id: body.p_id };
        backend.pens = [updated];
        return Response.json({ item: updated });
    }
    throw new Error(`Unexpected RPC ${name}`);
};
const reset = async () => { service.activateCollection(owner); backend = snapshot(); readFailure = false; writeCode = ''; requests.length = 0; await service.loadData(true); };

test('public config rejects secret keys and remote insecure URLs', () => {
    for (const key of ['sb_secret_private', 'eyJ.service-role', '', undefined]) assert.throws(() => publicConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: key }));
    assert.throws(() => publicConfig({ VITE_SUPABASE_URL: 'http://example.com', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }));
});
test('adapter preserves bigint ordering, cleaning and archived history beyond 1000 rows', () => {
    const input = snapshot();
    input.events.unshift({ ...event, id: 'latest', kind: 'cleaning', inkIds: [], sequence: '9007199254740994' });
    input.inks = Array.from({ length: 1101 }, (_, n) => ({ ...ink, id: n ? `i-${n}` : 'i' }));
    const c = collectionDto(input), model = deriveCollection(c, '2026-10-03');
    assert.equal(c.inks.length, 1101); assert.equal(model.latest.get('p')?.id, 'latest'); assert.equal(model.inked.length, 0); assert.equal(model.inkCount('i'), 1);
    assert.throws(() => collectionDto({ ...input, events: [{ ...event, sequence: Number('9007199254740993') }] }));
    assert.throws(() => collectionDto({ ...input, pens: [] }));
    assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});
test('confirmed write survives failed refetch and celebrates only acknowledgement', async () => {
    await reset();
    let celebrations = 0; const listener = () => { celebrations++; };
    window.addEventListener('ink-and-nib:saved', listener);
    readFailure = true;
    const saved = await service.updatePen({ ...pen, color: 'Blue' });
    assert.equal(saved.color, 'Blue'); assert.equal(service.getPenById('p')?.color, 'Blue');
    assert.match(service.getCollectionWarning(), /^Saved\./); assert.equal(celebrations, 1);
    writeCode = '40001';
    await assert.rejects(service.updatePen({ ...pen, color: 'Red' }), e => e instanceof service.CollectionError && !e.message.includes('SQL'));
    assert.equal(celebrations, 1); assert.equal(service.getPenById('p')?.color, 'Blue');
    window.removeEventListener('ink-and-nib:saved', listener);
});
test('public browsing and owner sign-in expose the same collection, with no public signup', async (t) => {
    t.after(async () => { cleanup(); await getSupabase().auth.stopAutoRefresh(); dom.window.close(); });
    backend = { ...snapshot(), canEdit: false }; readFailure = false; writeCode = '';
    service.activateCollection(null); await service.loadData(true);
    await assert.rejects(service.updatePen(pen), /Only the collection owner/);
    const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
    const { default: App } = await import('../src/App');
    const user = userEvent.setup({ document: dom.window.document });
    const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/pens'] });
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Fountain pens', exact: true });
    assert.ok(screen.getAllByText('Test').length > 0);
    assert.equal(screen.queryByRole('button', { name: 'Add a pen', exact: true }), null);
    await screen.findByText('Public view');
    assert.ok(screen.getByText('View only'));
    const trigger = screen.getByRole('button', { name: 'Owner sign in' });
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    await user.click(trigger);
    assert.equal(document.activeElement, screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Password'), 'discard-this');
    await user.keyboard('{Escape}');
    assert.equal(screen.queryByLabelText('Password'), null);
    assert.equal(document.activeElement, trigger);
    await user.keyboard('{Enter}');
    assert.equal((screen.getByLabelText('Password') as HTMLInputElement).value, '');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    assert.equal(document.activeElement, trigger);
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close sign in' }));
    assert.equal(screen.queryByLabelText('Email'), null);
    await user.click(trigger);
    assert.equal(screen.getByLabelText('Email').getAttribute('autocomplete'), 'username');
    assert.equal(screen.getByLabelText('Password').getAttribute('autocomplete'), 'current-password');
    await user.tab();
    assert.equal(document.activeElement, screen.getByLabelText('Password'));
    assert.equal(screen.queryByRole('button', { name: /sign up/i }), null);
    await user.type(screen.getByLabelText('Email'), 'owner@example.test');
    await user.type(screen.getByLabelText('Password'), 'synthetic-password');
    loginFail = true;
    loginGate = new Promise<void>(resolve => { releaseLogin = resolve; });
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    assert.ok((screen.getByRole('button', { name: 'Signing in…' }) as HTMLButtonElement).matches(':disabled'));
    assert.ok((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).matches(':disabled'));
    (document.activeElement as HTMLElement)?.blur(); // Match browser focus loss when controls disable.
    releaseLogin!(); loginGate = undefined;
    await screen.findByText('Sign-in failed. Check your email and password.');
    assert.equal(screen.getByLabelText('Email').getAttribute('aria-describedby'), 'owner-sign-in-error');
    assert.equal(document.activeElement, screen.getByLabelText('Email'));
    loginFail = false; backend.canEdit = true;
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    await screen.findByText('Owner mode');
    assert.ok(screen.getByText('Editing enabled'));
    assert.equal(screen.queryByLabelText('Password'), null);
    await waitFor(() => assert.equal(document.activeElement, screen.getByRole('button', { name: 'Sign out' })));
    logoutFail = true;
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByText('Could not sign out. Please try again.');
    assert.ok(screen.getByText('Owner mode'));
    logoutFail = false;
    assert.ok(screen.getByRole('button', { name: 'Add a pen', exact: true }));
    backend.canEdit = false;
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => assert.equal(service.getCollection().canEdit, false));
    assert.ok(screen.getAllByText('Test').length > 0);
    assert.equal(screen.queryByRole('button', { name: 'Add a pen', exact: true }), null);
    await screen.findByText('Public view');
    await user.click(screen.getByRole('button', { name: 'Owner sign in' }));
    await user.type(screen.getByLabelText('Password'), 'synthetic-password');
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    await screen.findByText('This account can view the collection only. Editing is reserved for Linda.');
    assert.ok(screen.getByText('View only'));
    assert.equal(screen.queryByText('Editing enabled'), null);
    assert.equal(screen.queryByRole('button', { name: 'Add a pen', exact: true }), null);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    cleanup(); router.dispose(); await getSupabase().auth.stopAutoRefresh(); dom.window.close();
});
