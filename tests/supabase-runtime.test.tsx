import { useState } from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window','document','navigator','HTMLElement','HTMLInputElement','Node','Element','MutationObserver','Event','MouseEvent','KeyboardEvent']) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Auth cross-tab channels are exercised separately; Node channels keep this synthetic worker alive.
Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined });
const { render, screen, waitFor, cleanup, act } = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const service = await import('../src/services/dataService');
const { publicConfig, getSupabase } = await import('../src/services/supabaseClient');
const { collectionDto } = await import('../src/services/collectionAdapter');
const { deriveCollection, today } = await import('../src/lib/collection');
const { AuthGate } = await import('../src/components/AuthGate');
const pen = { id: 'p', version: '1', brand: 'Pilot', model: 'Test', color: '', nibSize: '', nibType: '', favorite: false, archived: false, needsRefill: true };
const ink = { id: 'i', version: '1', brand: 'Ink', name: 'Test', collection: '', colorHex: null, favorite: false, archived: false };
const event = { id: 'e', version: '1', sequence: '9007199254740993', penId: 'p', date: '2026-01-01', kind: 'refill', inkIds: ['i'], notes: 'Test', notPure: false };
const snapshot = () => ({ pens: [{ ...pen }], inks: [{ ...ink }], events: [{ ...event }], asOf: '2026-10-03' });
let backend = snapshot();
let readFailure = false;
let loseResponse = false;
let writeCode = '';
let pauseRead: Promise<void> | undefined;
const requests: { name: string; body: Record<string, unknown> }[] = [];
const receipts = new Map<string, unknown>();
let loginFail = false;
const owner = '00000000-0000-4000-8000-000000000001';
globalThis.fetch = async (input, init) => {
    const url = String(input);
    const name = url.split('/').at(-1)!;
    const body = JSON.parse(String(init?.body || '{}'));
    if (url.includes('/auth/v1/token')) {
        if (loginFail) return Response.json({ msg: 'Private provider error', error_code: 'invalid_credentials' }, { status: 400 });
        const token = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: owner, exp: Math.floor(Date.now()/1000)+3600 }))}.synthetic`;
        return Response.json({ access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user: { id: owner, email: 'owner@example.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} } });
    }
    if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
    requests.push({ name, body });
    if (name === 'get_collection') {
        const captured = structuredClone(backend);
        if (pauseRead) await pauseRead;
        return readFailure ? new Response('Unavailable', { status: 503 }) : Response.json(captured);
    }
    if (writeCode) return Response.json({ code: writeCode, message: 'Sensitive internal SQL context' }, { status: 400 });
    if (!receipts.has(body.p_request_id)) {
        if (name === 'update_pen' || name === 'create_pen') {
            const updated = { ...body.p_item, id: body.p_id || `new-${receipts.size}`, version: '2' };
            backend.pens = [...backend.pens.filter(p => p.id !== updated.id), updated];
            receipts.set(body.p_request_id, { item: updated });
        } else if (name === 'create_refill_event') {
            const created = { ...body.p_entry, id: `new-${receipts.size}`, version: '1', sequence: '9007199254740994' };
            backend.events.push(created);
            backend.pens[0] = { ...backend.pens[0], needsRefill: false, version: '2' };
            receipts.set(body.p_request_id, { event: created, pen: backend.pens[0] });
        } else throw new Error(`Unexpected synthetic RPC ${name}`);
    }
    if (loseResponse) throw new TypeError('Simulated lost response after commit');
    return Response.json(receipts.get(body.p_request_id));
};
const reset = () => { service.activateCollection(null); service.activateCollection(owner); backend = snapshot(); readFailure = false; loseResponse = false; writeCode = ''; pauseRead = undefined; receipts.clear(); requests.length = 0; };

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
test('reads deduplicate; sign-out discards late responses and owner cache', async () => {
    reset(); let release!: () => void;
    pauseRead = new Promise(resolve => { release = resolve; });
    const a = service.loadData(), b = service.loadData();
    await waitFor(() => assert.equal(requests.length, 1));
    service.activateCollection(null); release(); await Promise.all([a,b]);
    assert.equal(service.isDataLoaded(), false); assert.deepEqual(service.getCollection().pens, []);
    await assert.rejects(service.loadData(), /Sign in/);
});
test('confirmed write survives failed refetch and celebrates only acknowledgement', async () => {
    reset(); await service.loadData();
    let celebrations = 0; const listener = () => { celebrations++; };
    window.addEventListener('ink-and-nib:saved', listener);
    readFailure = true;
    const saved = await service.updatePen({ ...pen, color: 'Blue' });
    assert.equal(saved.color, 'Blue'); assert.equal(service.getPenById('p')?.color, 'Blue');
    assert.match(service.getCollectionWarning(), /^Saved\./); assert.equal(celebrations, 1);
    writeCode = '40001';
    await assert.rejects(service.updatePen({ ...pen, color: 'Red' }), e => e instanceof service.CollectionError && e.code === 'conflict' && !e.message.includes('SQL'));
    assert.equal(celebrations, 1); assert.equal(service.getPenById('p')?.color, 'Blue');
    window.removeEventListener('ink-and-nib:saved', listener);
});
test('lost response retry reuses request UUID and atomic refill response without duplicating', async () => {
    reset(); await service.loadData(); loseResponse = true;
    const entry = { date: '2026-01-02', penId: 'p', inkIds: ['i'], notes: 'Mixture', notPure: true };
    await assert.rejects(service.addRefillLog(entry), /outcome is unknown/);
    assert.equal(backend.events.length, 2); assert.equal(service.getCollection().entries.length, 1);
    await assert.rejects(service.addRefillLog({ ...entry, notes: 'Changed draft' }), /previous save is unconfirmed/);
    loseResponse = false;
    await service.addRefillLog(entry);
    const writes = requests.filter(r => r.name === 'create_refill_event');
    assert.equal(writes[0].body.p_request_id, writes.at(-1)?.body.p_request_id);
    assert.equal(backend.events.length, 2); assert.equal(service.getCollection().entries.length, 2);
    assert.equal(service.getPenById('p')?.needsRefill, false);
    assert.equal(requests.some(r => r.name === 'update_pen'), false);
});
test('owner auth UI has no signup, handles failure, signs in, and clears collection on sign-out', async () => {
    service.activateCollection(null); loginFail = true;
    const user = userEvent.setup({ document: dom.window.document });
    function Draft() { const [value, setValue] = useState(''); return <><p>Private collection</p><label>Unfinished notes<input value={value} onChange={e => setValue(e.target.value)} /></label></>; }
    render(<AuthGate><Draft /></AuthGate>);
    await screen.findByRole('button', { name: 'Sign in' });
    assert.equal(screen.queryByRole('button', { name: /sign up/i }), null);
    await user.type(screen.getByLabelText('Email'), 'owner@example.test');
    await user.type(screen.getByLabelText('Password'), 'synthetic-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Sign-in failed. Check your email and password, then try again.');
    loginFail = false;
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Private collection');
    await service.loadData(); assert.equal(service.getCollection().pens.length, 1);
    await user.type(screen.getByLabelText('Unfinished notes'), 'Keep this draft');
    // An automatic session loss hides private UI, clears the cache and retains only component drafts.
    await act(async () => { await getSupabase().auth.signOut({ scope: 'local' }); });
    await screen.findByRole('button', { name: 'Sign in' });
    assert.equal(screen.queryByRole('textbox', { name: 'Unfinished notes' }), null);
    assert.equal(service.getCollection().pens.length, 0);
    await user.type(screen.getByLabelText('Password'), 'synthetic-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('textbox', { name: 'Unfinished notes' });
    assert.equal(screen.getByLabelText('Unfinished notes').value, 'Keep this draft');
    await act(async () => { await (await import('../src/services/sessionLifecycle')).signOutCollection(); });
    await screen.findByRole('button', { name: 'Sign in' });
    assert.equal(screen.queryByText('Private collection'), null); assert.equal(service.getCollection().pens.length, 0);
    cleanup(); await getSupabase().auth.stopAutoRefresh();
});
