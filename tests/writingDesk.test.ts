import { reconcilePalette, movePalette, paletteDto, currentlyInkedColors } from '../src/lib/deskPalette';
import test from 'node:test';
import assert from 'node:assert/strict';
import { perceptualColor, sortInksByColor } from '../src/lib/colorOrder';
import type { Ink } from '../src/models/types';
const swatchInks = (hexes: string[]): Ink[] => hexes.map((colorHex, i) => ({
    id: `swatch-${i}`, name: `Swatch ${i}`, brand: 'Test', collection: '', colorHex,
}));

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
});

test('palette preserves dormant omissions, appends new colors and moves by stable identity', () => {
    const saved = [{ inkId: 'dormant', omitted: true }, { inkId: 'b', omitted: false }];
    const current = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as Ink[];
    const next = reconcilePalette(saved, current);
    assert.deepEqual(next.map(i => i.inkId), ['dormant', 'b', 'a', 'c']);
    assert.deepEqual(movePalette(next, 'c', 'b').map(i => i.inkId), ['dormant', 'c', 'b', 'a']);
    assert.equal(reconcilePalette(next, [{id:'dormant'}] as Ink[])[0].omitted, true);
    assert.equal(saved.length, 2);
    assert.deepEqual(paletteDto(next), next);
    assert.throws(() => paletteDto([{inkId:'a',omitted:false},{inkId:'a',omitted:true}]));
});


test('All follows current mixed refills without inheriting or changing saved omissions', async () => {
    const { deriveCollection } = await import('../src/lib/collection');
    const inks = swatchInks(['#854c48', '#376e78', '#675d91']);
    const saved = [{ inkId: inks[0].id, omitted: true }];
    const collection = {
        inks, pens: [{id:'p', brand:'Pilot', model:'Test', color:'', nibSize:'M', nibType:''}],
        entries: [{id:'fill', index:0, penId:'p', date:'2026-10-01', inkIds:[inks[0].id, inks[1].id], notes:''}],
        palettes: [{id:'custom', name:'Custom', items:saved}],
    };
    assert.deepEqual(new Set(currentlyInkedColors(inks, deriveCollection(collection)).map(i => i.id)), new Set([inks[0].id, inks[1].id]));
    assert.deepEqual(saved, [{inkId:inks[0].id, omitted:true}]);
    collection.entries.push({id:'clean', index:1, penId:'p', date:'2026-10-02', inkIds:[], notes:''});
    assert.deepEqual(currentlyInkedColors(inks, deriveCollection(collection)), []);
});

test('calendar-date display keeps American dates and relative days stable across time zones and DST', async () => {
    const { displayDate } = await import('../src/lib/displayDate');
    const previous = process.env.TZ;
    try {
        for (const zone of ['America/Los_Angeles', 'America/New_York', 'Pacific/Auckland', 'UTC']) {
            process.env.TZ = zone;
            assert.deepEqual(displayDate('2026-10-10', '2026-10-20'), { absolute: 'Oct 10, 2026', relative: '1 week ago' });
            assert.equal(displayDate('2026-10-20', '2026-10-20').relative, 'Today');
            assert.equal(displayDate('2026-03-08', '2026-03-09').relative, 'Yesterday');
            assert.equal(displayDate('2026-11-01', '2026-11-02').relative, 'Yesterday');
            assert.equal(displayDate('2026-01-01', '2025-12-31').relative, 'Tomorrow');
        }
    } finally { process.env.TZ = previous; }
});

test('relative dates use compact elapsed units at week, month and year boundaries', async () => {
    const { displayDate } = await import('../src/lib/displayDate');
    const base = Date.parse('2026-10-20T00:00:00Z');
    for (const [days, expected] of [[2,'2 days ago'],[6,'6 days ago'],[7,'1 week ago'],[14,'2 weeks ago'],[29,'4 weeks ago'],[30,'1 month ago'],[60,'2 months ago'],[364,'12 months ago'],[365,'1 year ago'],[730,'2 years ago']] as const) {
        const date = new Date(base-days*86400000).toISOString().slice(0,10);
        assert.equal(displayDate(date, '2026-10-20').relative, expected);
    }
    assert.equal(displayDate('2026-11-03','2026-10-20').relative,'in 2 weeks');
    assert.equal(displayDate('2024-02-29','2024-03-01').relative,'Yesterday');
});
