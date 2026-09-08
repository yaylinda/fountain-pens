import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCollection } from '../src/lib/collection';
import { deskColorRanks, deskRows, inkColor } from '../src/lib/writingDesk';
import { perceptualColor, sortInksByColor } from '../src/lib/colorOrder';
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

const swatchInks = (hexes: string[]): Ink[] => hexes.map((colorHex, i) => ({
    id: `swatch-${i}`, name: `Swatch ${i}`, brand: 'Test', collection: '', colorHex,
}));

test('perceptual conversion matches reference sRGB colors', () => {
    const red = perceptualColor('#ff0000');
    assert.ok(Math.abs(red.light - 0.627955) < 0.00001);
    assert.ok(Math.abs(red.a - 0.224863) < 0.00001);
    assert.ok(Math.abs(red.b - 0.125846) < 0.00001);
    assert.ok(Math.abs(perceptualColor('#ffffff').light - 1) < 0.00001);
    assert.ok(perceptualColor('#ffffff').chroma < 0.00001);
    assert.equal(perceptualColor('#000000').light, 0);
});

test('balanced green, teal, turquoise, blue, and violet-blue swatches retain their progression', () => {
    const samples = swatchInks(['#2C9867', '#219783', '#2199A3', '#288CAD', '#447ED0', '#686DCB']);
    assert.deepEqual(sortInksByColor([...samples].reverse()), samples);
});

const variedSwatches = () => swatchInks([
    '#2C9867', '#204840', '#4EADAF', '#244957',
    '#189bcb', '#9AB2CA', '#00357c', '#b8b7f1',
]);

test('nearby hues trade places to soften lightness jumps without reversing distant hues', () => {
    const samples = variedSwatches();
    const original = structuredClone(samples);
    const hueOrder = [...samples].sort((a, b) =>
        perceptualColor(a.colorHex!).hue - perceptualColor(b.colorHex!).hue);
    const smooth = sortInksByColor(samples);
    const jumps = (list: Ink[]) => list.slice(1).reduce((sum, ink, index) => {
        const a = perceptualColor(list[index].colorHex!);
        const b = perceptualColor(ink.colorHex!);
        return sum + (a.light - b.light) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;
    }, 0);
    assert.ok(jumps(smooth) < jumps(hueOrder) * 0.8, 'reduce abrupt jumps substantially');
    for (let i = 0; i < smooth.length; i++) {
        for (let j = i + 1; j < smooth.length; j++) {
            assert.ok(perceptualColor(smooth[i].colorHex!).hue -
                perceptualColor(smooth[j].colorHex!).hue <= 30);
        }
    }
    assert.deepEqual(sortInksByColor([...samples].reverse()), smooth);
    assert.deepEqual(samples, original, 'do not mutate inventory or its swatches');
    assert.deepEqual(new Set(smooth.map((ink) => ink.id)), new Set(samples.map((ink) => ink.id)));
});

test('neutrals run dark to light after colors, followed by missing swatches', () => {
    const samples = swatchInks(['#eeeeee', '#447ED0', '#222222', '#999999']);
    const missing = { id: 'missing', name: 'No reference swatch', brand: 'Test', collection: '' };
    assert.deepEqual(sortInksByColor([missing, ...samples]), [samples[1], samples[2], samples[3], samples[0], missing]);
    assert.deepEqual(sortInksByColor([]), []);
    assert.deepEqual(sortInksByColor([missing]), [missing]);
    const twins = [{ ...samples[1], id: 'b' }, { ...samples[1], id: 'a' }];
    assert.deepEqual(sortInksByColor(twins).map((ink) => ink.id), ['a', 'b']);
});

test('desk rows share palette ranks and retain their order through filters and selections', () => {
    const samples = variedSwatches();
    const samplePens = samples.map((ink, i) => ({
        ...pens[0], id: ink.id, brand: i % 2 ? 'Pilot' : 'Lamy', model: ink.name,
    }));
    const collection = deriveCollection({
        inks: samples,
        pens: samplePens,
        entries: samplePens.map((pen, index) => ({
            penId: pen.id, inkIds: [pen.id], date: `2026-09-0${index + 1}`, notes: '', index,
        })),
    }, '2026-09-08');
    const ranks = deskColorRanks(collection);
    const filters = { brands: {}, nib: '', inkBrand: '' };
    const all = deskRows(collection, filters, 'color', 'none', '', ranks)[0][1];
    assert.deepEqual(all.map((row) => row.inks[0].id), [...ranks.keys()]);
    const filtered = deskRows(collection, { ...filters, brands: { Pilot: 'exclude' } }, 'color', 'none')[0][1];
    assert.deepEqual(filtered.map((row) => row.pen.id), all.filter((row) => row.pen.brand !== 'Pilot').map((row) => row.pen.id));
    const selected = deskRows(collection, filters, 'color', 'none', samples[3].id, ranks)[0][1];
    assert.deepEqual(selected.map((row) => row.pen.id), [samples[3].id]);
    assert.deepEqual(deskRows(collection, filters, 'recent', 'none')[0][1].map((row) => row.pen.id), samplePens.map((pen) => pen.id).reverse());
});
