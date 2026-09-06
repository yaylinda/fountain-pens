import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCollection } from '../src/lib/collection';
import { deskRows, inkColor } from '../src/lib/writingDesk';
import type { Ink, Pen } from '../src/models/types';
const inks: Ink[] = [
    { id: 'red', name: 'Red', brand: 'A', collection: '', colorHex: '#ff0000' },
    {
        id: 'blue',
        name: 'Blue',
        brand: 'B',
        collection: '',
        colorHex: '#0000ff',
    },
];
const pens: Pen[] = ['Lamy', 'TWSBI', 'Pilot'].map((brand, i) => ({
    id: String(i),
    brand,
    model: 'Test',
    color: '',
    nibSize: 'Medium',
    nibType: i === 1 ? 'Steel' : 'Gold, 14k',
}));
const model = deriveCollection(
    {
        pens,
        inks,
        entries: pens.map((p, i) => ({
            penId: p.id,
            date: '2026-09-06',
            inkIds: i === 2 ? ['red', 'blue'] : [i ? 'blue' : 'red'],
            notes: '',
        })),
    },
    '2026-09-06',
);
test('pen exclusions combine with gold nib and ink brand filters', () => {
    const result = deskRows(
        model,
        { brands: { TWSBI: 'exclude' }, nib: 'Gold', inkBrand: 'B' },
        'color',
        'pen',
    );
    assert.deepEqual(
        result.map(([label, rows]) => [label, rows.map((r) => r.pen.id)]),
        [['Pilot', ['2']]],
    );
});
test('mixed inks remain one pairing and can be selected by either ink', () => {
    const result = deskRows(
        model,
        { brands: {}, nib: '', inkBrand: '' },
        'color',
        'color',
        'blue',
    );
    assert.equal(result.flatMap(([, rows]) => rows).length, 2);
    assert.equal(
        result.find(([label]) => label === 'Mixed inks')?.[1][0].inks.length,
        2,
    );
});
test('color sorting places red before blue and unknown colors last', () => {
    assert.equal(inkColor(inks[0]).family, 'Reds');
    assert.equal(inkColor(inks[1]).family, 'Blues');
    assert.ok(inkColor().hue > inkColor(inks[1]).hue);
    const rows = deskRows(
        model,
        {
            brands: { Lamy: 'include', TWSBI: 'include' },
            nib: '',
            inkBrand: '',
        },
        'color',
        'none',
    )[0][1];
    assert.deepEqual(
        rows.map((r) => r.pen.id),
        ['0', '1'],
    );
});
