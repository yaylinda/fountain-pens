// Test-only snapshots simulating the migrated Supabase fields.
import wearingeul from '../src/data/wearingeul-inks.json';
import pilot from '../src/data/pilot-inks.json';
import swatches from '../scripts/output.json';
import type { Ink } from '../src/models/types';
import type { InkReference } from '../src/lib/inkReference';
export const wearingeulReferences: InkReference[] = wearingeul.inks;
export const pilotReferences: InkReference[] = pilot.inks;
export function withReferences<T extends Ink>(ink: T): T & Ink {
    const catalog = ink.brand === 'Wearingeul' ? wearingeul : ink.brand === 'Pilot' ? pilot : undefined;
    const entry = catalog?.inks.find(r => r.inkId === ink.id);
    const { description, sources, ...reference } = entry || {};
    return { ...ink, ...(entry ? { details: description, sources, reference } : {}),
        swatchReference: (swatches as Record<string, Ink['swatchReference']>)[ink.name] } as T & Ink;
}
