import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLegacy, validDate } from '../../scripts/migration/legacy.mjs';
import { sourceFixture } from './fixtures.mjs';
const map=source=>mapLegacy(source,'2026-01-10');
test('preserves text IDs, duplicate events, notes, order and queue; removes only sentinel',()=>{
 const result=map(sourceFixture());
 assert.equal(result.pens[0].id,'pen_old'); assert.equal(result.pens[0].needs_refill,true);
 assert.equal(result.inks.length,2); assert.equal(result.inks[0].color_hex,null);
 assert.deepEqual(result.events.map(x=>[x.id,x.sequence]),[['legacy-refill-1','1'],['legacy-refill-2','2'],['legacy-refill-3','3']]);
 assert.equal(result.events[0].notes,'Écriture 日本語'); assert.equal(result.events[2].kind,'cleaning');
 assert.deepEqual(result.links.map(x=>x.ink_id),['ink_b','ink_a','ink_b','ink_a']);
});
for (const [name,mutate] of Object.entries({
 'duplicate inventory':s=>s['pens.json'].push(s['pens.json'][0]),
 'duplicate links':s=>s['refillLog.json'][0].inkIds=['ink_a','ink_a'],
 'mixed NONE':s=>s['refillLog.json'][0].inkIds=['NONE','ink_a'],
 'orphan':s=>s['refillLog.json'][0].penId='missing',
 'invalid leap day':s=>s['refillLog.json'][0].date='2025-02-29',
 'unknown field':s=>s['pens.json'][0].owner_id='bad',
 'bad boolean':s=>s['pens.json'][0].favorite='false',
 'bad color':s=>s['inks.json'][1].colorHex='red',
 'cleaning residual':s=>s['refillLog.json'][2].notPure=true,
 'NUL':s=>s['refillLog.json'][0].notes='a\0b'
})) test(`rejects ${name}`,()=>{const s=sourceFixture(); mutate(s); assert.throws(()=>map(s));});
test('future dates require review, empty links map to cleaning, real leap day accepted',()=>{
 const s=sourceFixture(); s['refillLog.json'][2].inkIds=[];
 const r=mapLegacy(s,'2024-02-29'); assert.equal(r.findings.length,3); assert.equal(r.events[2].kind,'cleaning');
 assert.equal(validDate('0000-01-01'),false);
});

// The committed migration is frozen, reviewable evidence of all offline inputs.
test('reference seed is reproducible and includes every rich field and matched swatch', async () => {
 const { seedSql, referenceRows, swatchRows } = await import('../../scripts/migration/reference-data.mjs');
 const { readFile } = await import('node:fs/promises');
 assert.equal(await readFile('supabase/migrations/20261003171529_seed_collection_references.sql','utf8'),seedSql());
 assert.equal(new Set(referenceRows.map(r=>r.id)).size,36);
 assert.equal(new Set(swatchRows.map(r=>r.id)).size,123);
});
