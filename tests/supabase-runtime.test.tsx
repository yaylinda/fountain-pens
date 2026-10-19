import test from 'node:test';
import assert from 'node:assert/strict';
import { publicConfig } from '../src/services/supabaseClient';
import { collectionDto } from '../src/services/collectionAdapter';
import { deriveCollection, today } from '../src/lib/collection';
import * as service from '../src/services/dataService';

const pen = { id: 'p', brand: 'Pilot', model: 'Test', color: '', nibSize: '', nibType: '', favorite: false, archived: false, needsRefill: true };
const ink = { id: 'i', brand: 'Ink', name: 'Test', collection: '', colorHex: null, favorite: false, archived: false };
const event = { id: 'e', sequence: '9007199254740993', penId: 'p', date: '2026-01-01', kind: 'refill', inkIds: ['i'], notes: 'Test', notPure: false };
const snapshot = () => ({ pens: [{ ...pen }], inks: [{ ...ink }], events: [{ ...event }], canEdit: true, asOf: '2026-10-03' });
let readFailure = false;
let writeCode = '';
globalThis.fetch = async (input, init) => {
    const name = String(input).split('/').at(-1);
    const body = JSON.parse(String(init?.body || '{}'));
    if (name === 'get_collection') return readFailure ? new Response('Unavailable', { status: 503 }) : Response.json(snapshot());
    if (writeCode) return Response.json({ code: writeCode, message: 'Sensitive internal SQL context' }, { status: 400 });
    if (name === 'update_refill_event') return Response.json({ event: { ...event, ...body.p_entry }, pen });
    throw new Error(`Unexpected RPC ${name}`);
};

test('public config rejects secret keys and remote insecure URLs', () => {
    for (const key of ['sb_secret_private', 'eyJ.service-role', '', undefined]) assert.throws(() => publicConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: key }));
    assert.throws(() => publicConfig({ VITE_SUPABASE_URL: 'http://example.com', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }));
});
test('adapter preserves bigint ordering, cleaning and archived history beyond 1000 rows', () => {
    const input = snapshot();
    input.events.unshift({ ...event, id: 'latest', kind: 'cleaning', inkIds: [], sequence: '9007199254740994' });
    input.inks = Array.from({ length: 1101 }, (_, n) => ({ ...ink, id: n ? `i-${n}` : 'i' }));
    const c = collectionDto(input), model = deriveCollection(c, '2026-10-03');
    assert.equal(c.inks.length, 1101); assert.equal(model.latest.get('p')?.id, 'latest'); assert.equal(model.inked.length, 0);
    assert.throws(() => collectionDto({ ...input, events: [{ ...event, sequence: Number('9007199254740993') }] }));
    assert.throws(() => collectionDto({ ...input, pens: [] }));
    assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});
test('confirmed refill write survives failed refetch; rejected writes preserve data and sanitize errors', async () => {
    service.activateCollection('synthetic-owner'); await service.loadData(true);
    readFailure = true;
    const saved = await service.updateRefillLog({ ...event, notes: 'Corrected' }, event);
    assert.equal(saved.notes, 'Corrected');
    assert.equal(service.getCollection().entries[0].notes, 'Corrected');
    assert.match(service.getCollectionWarning(), /^Saved\./);
    writeCode = '40001';
    await assert.rejects(service.updateRefillLog({ ...event, notes: 'Rejected' }, event), e => e instanceof service.CollectionError && !e.message.includes('SQL'));
    assert.equal(service.getCollection().entries[0].notes, 'Corrected');
});
test('auth changes immediately revoke editing without discarding public data', async () => {
    service.activateCollection(null);
    assert.equal(service.getCollection().canEdit, false);
    assert.equal(service.getCollection().pens[0].id, pen.id);
    await assert.rejects(service.updateRefillLog(event, event), /Only the collection owner/);
});
