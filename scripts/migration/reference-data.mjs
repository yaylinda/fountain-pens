// Offline migration input only. Nothing in src imports these fixtures at runtime.
import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
export const catalogs = ['wearingeul', 'pilot'].map(brand => read(`src/data/${brand}-inks.json`));
export const swatches = read('scripts/output.json');
export const inventory = read('src/data/inks.json').filter(ink => ink.id !== 'NONE');
export const watermanId = '3c8ab1e4-d304-460a-8d4d-54ae180adbb6';
export const watermanSource = { label: 'Waterman product page', url: 'https://www.waterman.com/pens/l%E2%80%99essence-du-bleu/car%C3%A8ne-fountain-pen-lessence-du-bleu-gift-box/SAP_2166344.html' };
export const referenceRows = catalogs.flatMap(catalog => catalog.inks.map(({ description, sources, ...reference }) => {
    const ink = inventory.find(ink => ink.id === reference.inkId && ink.brand === catalog.brand);
    if (!ink) throw new Error(`Unmatched reference ID ${reference.inkId}`);
    return { id: ink.id, brand: ink.brand, details: description, sources, reference };
}));
export const swatchRows = inventory.filter(ink => swatches[ink.name]).map(ink => ({ id: ink.id, brand: ink.brand, swatch: swatches[ink.name] }));
const literal = value => `'${JSON.stringify(value, null, 2).replaceAll("'", "''")}'::jsonb`;
export function seedSql() {
    return `-- Generated from preserved offline fixtures by scripts/migration/generate-reference-seed.mjs.
-- Match existing rows by stable ID AND expected brand; never create phantom inventory.
-- Empty fresh databases are valid. Missing targets in populated inventory or wrong brands abort deployment.
do $$
declare r jsonb;
begin
 for r in select value from jsonb_array_elements(${literal(referenceRows)}) loop
  if exists(select 1 from public.inks) and not exists(select 1 from public.inks where id=r->>'id') then raise exception 'Missing reference inventory ID %',r->>'id'; end if;
  if exists(select 1 from public.inks where id=r->>'id' and brand<>r->>'brand') then raise exception 'Reference brand mismatch for %',r->>'id'; end if;
  update public.inks set details=r->>'details',sources=r->'sources',reference=r->'reference' where id=r->>'id' and brand=r->>'brand';
 end loop;
 for r in select value from jsonb_array_elements(${literal(swatchRows)}) loop
  if exists(select 1 from public.inks) and not exists(select 1 from public.inks where id=r->>'id') then raise exception 'Missing reference inventory ID %',r->>'id'; end if;
  if exists(select 1 from public.inks where id=r->>'id' and brand<>r->>'brand') then raise exception 'Swatch brand mismatch for %',r->>'id'; end if;
  update public.inks set swatch_reference=r->'swatch' where id=r->>'id' and brand=r->>'brand';
 end loop;
 if exists(select 1 from public.pens) and not exists(select 1 from public.pens where id='${watermanId}') then raise exception 'Missing Waterman inventory ID'; end if;
 if exists(select 1 from public.pens where id='${watermanId}' and brand<>'Waterman') then raise exception 'Waterman ID brand mismatch'; end if;
 update public.pens set sources=sources || ${literal([watermanSource])}
 where id='${watermanId}' and brand='Waterman' and not sources @> ${literal([{url:watermanSource.url}])};
end $$;
`;
}
