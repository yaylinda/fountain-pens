import { withReferences, pilotReferences, wearingeulReferences } from './referenceFixtures';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getInkReference, referenceHex } from '../src/lib/inkReference';
import {
    byPenName,
    deriveCollection,
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

test('matching pen models sort by nib width before color', () => {
    const falcons = [
        { ...pen('broad'), color: 'Black', nibSize: 'Broad' },
        { ...pen('medium'), color: 'Brown', nibSize: 'Medium' },
        { ...pen('fine-v2'), color: 'Sapphire (v2)', nibSize: 'Fine' },
        { ...pen('extra-fine'), color: 'Burgundy', nibSize: 'Extra Fine' },
        { ...pen('fine'), color: 'Sapphire', nibSize: 'Fine' },
    ];
    assert.deepEqual(falcons.sort(byPenName).map((item) => [item.nibSize, item.color]), [
        ['Extra Fine', 'Burgundy'],
        ['Fine', 'Sapphire'],
        ['Fine', 'Sapphire (v2)'],
        ['Medium', 'Brown'],
        ['Broad', 'Black'],
    ]);
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
    assert.equal(result.activePens.length, 3);
});
test('all inks in a mix retain their own usage and latest pairing relationships', () => {
    const result = deriveCollection(fixture, '2025-01-03');
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
test('search accepts accented names, partial words, and unordered terms', () => {
    assert.ok(matches('nepal kyanite', 'Kyanite du Népal'));
    assert.ok(matches('pilot fine', 'Pilot Falcon', 'Extra Fine'));
    assert.ok(!matches('sailor fine', 'Pilot Falcon', 'Extra Fine'));
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
        needsRefill: true,
        hasUnsavedChanges: true,
    });
    assert.deepEqual(payload, {
        date: '2025-01-02',
        penId: 'a',
        inkIds: ['red', 'blue'],
        notes: 'nice flow',
    });
    assert.ok(isCleaning({ ...payload, inkIds: ['NONE'] }));
});
test('refill purity persists on refills and clears for pure fills or cleanings', () => {
    const draft = { ...fixture.entries[1], notPure: true };
    assert.equal(refillPayload(draft).notPure, true);
    assert.equal(refillPayload({ ...draft, notPure: false }).notPure, undefined);
    assert.equal(refillPayload({ ...draft, inkIds: ['NONE'] }).notPure, undefined);
});
test('recorded swatches override references and unknown inks never get invented colors', () => {
    assert.equal(
        getSwatch(withReferences({ ...ink('x'), name: 'Happy Holidays' }))?.hex,
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
});

test('Wearingeul references cover the owned collection with traceable, valid colors', () => {
    const owned = JSON.parse(readFileSync('src/data/inks.json', 'utf8'))
        .filter((item: { brand: string }) => item.brand === 'Wearingeul').map(withReferences);
    assert.equal(wearingeulReferences.length, 21);
    assert.equal(new Set(wearingeulReferences.map((item) => item.inkId)).size, 21);
    for (const item of owned) {
        const reference = getInkReference(item);
        assert.ok(reference, `Missing reference for ${item.name}`);
        assert.ok(reference.description && reference.sources.length);
        const hex = referenceHex(reference);
        if (hex) assert.match(hex, /^#[0-9a-f]{6}$/i);
    }
});

test('manufacturer swatches keep custom colors, brand boundaries, and inventory identity', () => {
    const mermaid = withReferences({
        id: '5400c69c-d66a-4e64-8d53-9f1b05124a15', brand: 'Wearingeul',
        name: 'The Little Mermaid', collection: '',
    });
    assert.equal(getSwatch(mermaid)?.hex, '#64b1bf');
    assert.equal(getSwatch({ ...mermaid, colorHex: '#123456' })?.source, 'Your color');
    assert.equal(getSwatch({ ...mermaid, colorHex: '#123456' })?.hex, '#123456');
    assert.equal(getSwatch({ ...mermaid, name: 'Corrected inventory label' })?.hex, '#64b1bf');
    assert.equal(getInkReference({ id: 'new-unresearched-ink', name: mermaid.name, brand: mermaid.brand, collection: '' }), undefined);
    assert.ok(getInkReference(withReferences({ ...mermaid, id: 'ink_57' }))?.properties.includes('Color Change'));
    assert.ok(getInkReference(withReferences({ ...mermaid, id: 'ink_57' }))?.colorGuideProperties?.includes('Color Shading'));
});

test('Pilot references cover every owned ink with sourced observations and no invented swatches', () => {
    const owned = JSON.parse(readFileSync('src/data/inks.json', 'utf8'))
        .filter((item: { brand: string }) => item.brand === 'Pilot').map(withReferences);
    assert.equal(pilotReferences.length, 15);
    assert.deepEqual(new Set(pilotReferences.map((item) => item.inkId)), new Set(owned.map((item: { id: string }) => item.id)));
    for (const item of owned) {
        const reference = getInkReference(item)!;
        assert.equal(reference.name, item.name);
        assert.ok(reference.description);
        assert.equal(referenceHex(reference), undefined);
        assert.ok(reference.sources.length);
        assert.ok(reference.writing);
    }
    assert.equal(getInkReference({ id: 'unresearched-pilot', name: 'Hotaru-Bi', brand: 'Pilot', collection: '' }), undefined);
});
