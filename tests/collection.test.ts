import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    deriveCollection,
    formatDate,
    getSwatch,
    isCleaning,
    matches,
    refillPayload,
    validateRefill,
    type Collection,
} from '../src/lib/collection';

const pen = (id: string) => ({
    id,
    brand: 'Pilot',
    model: 'Falcon',
    color: 'Black',
    nibSize: 'Fine',
    nibType: 'Gold, 14k',
});
const ink = (id: string) => ({
    id,
    brand: 'Diamine',
    collection: '',
    name: id,
});
const fixture: Collection = {
    pens: [
        pen('a'),
        pen('b'),
        pen('unused'),
        { ...pen('archived'), archived: true },
    ],
    inks: [
        ink('red'),
        ink('blue'),
        ink('unused'),
        ink('NONE'),
        { ...ink('archived'), archived: true },
    ],
    entries: [
        {
            index: 0,
            date: '2025-01-01',
            penId: 'a',
            inkIds: ['red'],
            notes: '',
        },
        {
            index: 1,
            date: '2025-01-02',
            penId: 'a',
            inkIds: ['red', 'blue'],
            notes: '',
        },
        {
            index: 2,
            date: '2025-01-02',
            penId: 'a',
            inkIds: ['NONE'],
            notes: '',
        },
        {
            index: 3,
            date: '2025-01-02',
            penId: 'b',
            inkIds: ['red', 'blue'],
            notes: '',
        },
        {
            index: 4,
            date: '2099-01-01',
            penId: 'b',
            inkIds: ['NONE'],
            notes: '',
        },
    ],
};

test('latest pairings use date and original array position, including same-day cleanings', () => {
    const result = deriveCollection(fixture, '2025-01-03');
    assert.equal(result.latest.get('a')?.index, 2);
    assert.equal(result.latest.get('b')?.index, 3);
    assert.deepEqual(
        result.inked.map((value) => value.id),
        ['b'],
    );
    assert.deepEqual(
        result.currentPens('blue').map((value) => value.id),
        ['b'],
    );
});
test('cleaning placeholder and archived inventory are excluded from active totals', () => {
    const result = deriveCollection(fixture, '2025-01-03');
    assert.equal(result.activeInks.length, 3);
    assert.equal(result.activePens.length, 3);
    assert.equal(result.refills.length, 3);
    assert.equal(result.penCount('a'), 2);
    assert.equal(result.inkCount('blue'), 2);
    assert.deepEqual(
        result.untried.map((value) => value.id),
        ['unused'],
    );
    assert.equal(result.penHistory.get('a')?.length, 3);
});
test('all inks in a mix retain their own usage and latest pairing relationships', () => {
    const result = deriveCollection(fixture, '2025-01-03');
    assert.equal(result.inkCount('red'), 3);
    assert.equal(result.inkCount('blue'), 2);
    assert.equal(result.currentPens('red').length, 1);
    assert.equal(result.currentPens('blue').length, 1);
});
test('deleting the latest event restores the previous pair without reindexing a filtered view', () => {
    const result = deriveCollection(
        {
            ...fixture,
            entries: fixture.entries.filter((entry) => entry.index !== 2),
        },
        '2025-01-03',
    );
    assert.equal(result.latest.get('a')?.index, 1);
    assert.deepEqual(result.latest.get('a')?.inkIds, ['red', 'blue']);
});
test('deriving display state does not reorder or mutate the source collections', () => {
    const before = JSON.stringify(fixture);
    deriveCollection(fixture);
    assert.equal(JSON.stringify(fixture), before);
});
test('missing inventory references remain readable without crashing', () => {
    const result = deriveCollection({
        pens: [],
        inks: [],
        entries: fixture.entries,
    });
    assert.equal(result.journal.length, 5);
    assert.equal(result.inked.length, 0);
    assert.equal(result.penById.get('a'), undefined);
    assert.equal(result.inkById.get('red'), undefined);
});
test('search accepts accented names, partial words, and unordered terms', () => {
    assert.ok(matches('nepal kyanite', 'Kyanite du Népal'));
    assert.ok(matches('pilot fine', 'Pilot Falcon', 'Extra Fine'));
    assert.ok(!matches('sailor fine', 'Pilot Falcon', 'Extra Fine'));
});
test('calendar dates stay on the same day in the user time zone', () => {
    assert.equal(formatDate('2025-01-01'), 'Jan 1, 2025');
    assert.equal(formatDate('2025-01-01', true), 'Jan 1');
});
test('refill validation rejects invalid dates, unknown references, and mixed cleaning entries', () => {
    const valid = {
        date: '2025-01-01',
        penId: 'a',
        inkIds: ['red'],
        notes: '',
    };
    assert.equal(validateRefill(valid, fixture), undefined);
    for (const date of ['', '2025-02-30', '2025-13-01', '2099-01-01'])
        assert.ok(validateRefill({ ...valid, date }, fixture));
    assert.ok(validateRefill({ ...valid, penId: 'missing' }, fixture));
    assert.ok(validateRefill({ ...valid, inkIds: [] }, fixture));
    assert.ok(validateRefill({ ...valid, inkIds: ['missing'] }, fixture));
    assert.ok(validateRefill({ ...valid, inkIds: ['NONE', 'red'] }, fixture));
    assert.equal(
        validateRefill({ ...valid, inkIds: ['NONE'] }, fixture),
        undefined,
    );
});
test('payloads preserve simple JSON records and discard display-only indices and joins', () => {
    const payload = refillPayload({
        ...fixture.entries[1],
        inkIds: ['red', 'red', 'blue'],
        notes: '  nice flow  ',
    });
    assert.deepEqual(payload, {
        date: '2025-01-02',
        penId: 'a',
        inkIds: ['red', 'blue'],
        notes: 'nice flow',
    });
    assert.ok(isCleaning({ ...payload, inkIds: ['NONE'] }));
});
test('recorded swatches override references and unknown inks never get invented colors', () => {
    assert.equal(
        getSwatch({ ...ink('x'), name: 'Happy Holidays' })?.hex,
        '#404898',
    );
    assert.equal(
        getSwatch({ ...ink('x'), colorHex: '#123456' })?.hex,
        '#123456',
    );
    assert.equal(getSwatch(ink('unknown-reference')), undefined);
    assert.equal(getSwatch({ ...ink('x'), colorHex: 'bad-color' }), undefined);
});
test('the real source inventory is coherent and legacy index fields do not determine event identity', () => {
    const data = (name: string) =>
        JSON.parse(readFileSync(`src/data/${name}.json`, 'utf8'));
    const pens = data('pens');
    const inks = data('inks');
    const entries = data('refillLog').map(
        (entry: Record<string, unknown>, index: number) => ({
            ...entry,
            index,
        }),
    );
    const result = deriveCollection({ pens, inks, entries });
    assert.equal(
        new Set(pens.map((value: { id: string }) => value.id)).size,
        pens.length,
    );
    assert.equal(
        new Set(inks.map((value: { id: string }) => value.id)).size,
        inks.length,
    );
    for (const entry of entries) {
        assert.ok(result.penById.has(entry.penId));
        for (const id of entry.inkIds)
            assert.ok(id === 'NONE' || result.inkById.has(id));
    }
    assert.equal(
        result.activeInks.length,
        inks.filter(
            (value: { id: string; archived?: boolean }) =>
                value.id !== 'NONE' && !value.archived,
        ).length,
    );
});
