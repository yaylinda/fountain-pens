import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const mappingVersion = 'legacy-json-v1';
const names = ['pens.json', 'inks.json', 'refillLog.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (at, message) => { throw new Error(`${at}: ${message}`); };
function shape(row, keys, at) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) fail(at, 'expected object');
  for (const key of Object.keys(row)) if (!keys.includes(key)) fail(at, `unknown field ${key}`);
}
function text(row, key, at, nonempty = false) {
  if (typeof row[key] !== 'string' || row[key].includes('\0') || (nonempty && !row[key])) fail(at, `invalid ${key}`);
  return row[key];
}
function bool(row, key, at) {
  if (row[key] === undefined) return false;
  if (typeof row[key] !== 'boolean') fail(at, `invalid ${key}`);
  return row[key];
}
export function validDate(value) {
  return typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) && value.slice(0,4) !== '0000'
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function mapLegacy(source, asOf) {
  if (!validDate(asOf)) throw new Error('explicit valid asOf date required');
  for (const name of names) if (!Array.isArray(source[name])) fail(name, 'expected array');
  const unique = (rows, label) => {
    if (new Set(rows.map(x => x.id)).size !== rows.length) fail(label, 'duplicate inventory ID');
  };
  const pens = source['pens.json'].map((r,i) => {
    const at = `pens.json[${i}]`;
    shape(r,['id','brand','model','color','nibSize','nibType','archived','favorite','needsRefill'],at);
    return { id:text(r,'id',at,true), brand:text(r,'brand',at), model:text(r,'model',at), color:text(r,'color',at),
      nib_size:text(r,'nibSize',at), nib_type:text(r,'nibType',at), archived:bool(r,'archived',at), favorite:bool(r,'favorite',at), needs_refill:bool(r,'needsRefill',at) };
  });
  const allInks = source['inks.json'].map((r,i) => {
    const at = `inks.json[${i}]`;
    shape(r,['id','brand','collection','name','colorHex','archived','favorite'],at);
    if (r.colorHex !== undefined && (typeof r.colorHex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(r.colorHex))) fail(at,'invalid colorHex');
    return { id:text(r,'id',at,true),brand:text(r,'brand',at),collection:text(r,'collection',at),name:text(r,'name',at),
      color_hex:r.colorHex ?? null,archived:bool(r,'archived',at),favorite:bool(r,'favorite',at) };
  });
  unique(pens,'pens.json'); unique(allInks,'inks.json');
  const inks = allInks.filter(x => x.id !== 'NONE');
  const penIds=new Set(pens.map(x=>x.id)), inkIds=new Set(inks.map(x=>x.id));
  const links=[], findings=[];
  const events=source['refillLog.json'].map((r,i) => {
    const at=`refillLog.json[${i}]`;
    shape(r,['date','penId','inkIds','notes','notPure','index'],at);
    if (r.index !== undefined && (!Number.isSafeInteger(r.index) || r.index<0)) fail(at,'invalid legacy index');
    if (!validDate(r.date)) fail(at,'invalid date');
    if (!penIds.has(r.penId)) fail(at,'unknown pen');
    if (!Array.isArray(r.inkIds) || r.inkIds.some(x=>typeof x!=='string') || new Set(r.inkIds).size!==r.inkIds.length) fail(at,'invalid/duplicate ink links');
    if (r.inkIds.includes('NONE') && r.inkIds.length!==1) fail(at,'mixed NONE');
    const ids=r.inkIds.filter(x=>x!=='NONE');
    if (ids.some(x=>!inkIds.has(x))) fail(at,'unknown ink');
    const not_pure=bool(r,'notPure',at);
    if (!ids.length && not_pure) fail(at,'cleaning cannot have residual ink');
    const id=`legacy-refill-${i+1}`;
    ids.forEach((ink_id,position)=>links.push({event_id:id,ink_id,position}));
    if (r.date>asOf) findings.push({at,code:'future-date',date:r.date});
    return {id,pen_id:r.penId,occurred_on:r.date,kind:ids.length?'refill':'cleaning',notes:text(r,'notes',at),not_pure,sequence:String(i+1)};
  });
  return {pens,inks,events,links,findings};
}
export async function capture(sourceDir, asOf) {
  const source={}, files=[];
  for (const name of names) {
    const bytes=await readFile(join(sourceDir,name));
    files.push({name,bytes:bytes.length,sha256:hash(bytes)});
    source[name]=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }
  const mapped=mapLegacy(source,asOf);
  return {mapped, manifest:{mappingVersion,sourceSha256:hash(files.map(x=>`${x.name}:${x.sha256}\n`).join('')),files,asOf,
    counts:Object.fromEntries(['pens','inks','events','links'].map(k=>[k,mapped[k].length])),findings:mapped.findings}};
}

// Field-for-field canonical readback; maintenance metadata is intentionally excluded.
export async function reconcile(client, mapped) {
  for (const [key,table] of Object.entries({pens:'pens',inks:'inks',events:'refill_events',links:'refill_event_inks'})) {
    const fields=key==='pens'?['id','brand','model','color','nib_size','nib_type','archived','favorite','needs_refill']:
      key==='inks'?['id','brand','collection','name','color_hex','archived','favorite']:
      key==='events'?['id','pen_id','occurred_on','kind','notes','not_pure','sequence']:['event_id','ink_id','position'];
    const columns=fields.map(f=>f==='occurred_on'||f==='sequence'?`${f}::text as ${f}`:f).join(',');
    const actual=(await client.query(`select ${columns} from public.${table}`)).rows;
    const canonical=rows=>rows.map(r=>JSON.stringify(fields.map(f=>r[f]))).sort();
    if (JSON.stringify(canonical(actual))!==JSON.stringify(canonical(mapped[key]))) throw new Error(`reconciliation failed: ${key}`);
  }
}

// Operator library only: no production connection/secret discovery and no browser entry point.
export async function importLegacy(client, captureResult, {ownerId,importId='legacy-json-v1',targetIdentity}) {
  const {mapped,manifest}=captureResult;
  if (!ownerId || !targetIdentity || !importId) throw new Error('explicit owner/import/target required');
  if (mapped.findings.length) throw new Error('unresolved source findings; review before import');
  const receiptManifest={...manifest,ownerId,targetIdentity};
  await client.query('begin');
  try {
    const owner=(await client.query('select user_id::text,time_zone from private.collection_owner')).rows;
    if (owner.length!==1 || owner[0].user_id!==ownerId || owner[0].time_zone!=='America/Chicago') throw new Error('owner mapping mismatch');
    const old=(await client.query('select * from private.data_imports where id=$1',[importId])).rows[0];
    if (old) {
      // Capture date is review context, not source identity. All other manifest fields must match.
      const identity=m=>JSON.stringify([m.mappingVersion,m.sourceSha256,m.files.map(f=>[f.name,f.bytes,f.sha256]),m.ownerId,m.targetIdentity]);
      if (old.owner_id!==ownerId || old.mapping_version!==mappingVersion || old.source_sha256!==manifest.sourceSha256 || identity(old.manifest)!==identity(receiptManifest)) throw new Error('import receipt mismatch');
      await client.query('commit'); return {status:'already-imported',counts:manifest.counts};
    }
    for (const table of ['pens','inks','refill_events','refill_event_inks']) {
      if ((await client.query(`select exists(select 1 from public.${table}) as populated`)).rows[0].populated) throw new Error('target collection is not empty');
    }
    for (const [key,table] of Object.entries({pens:'pens',inks:'inks',events:'refill_events',links:'refill_event_inks'})) {
      for (const row of mapped[key]) {
        const entry={...row,owner_id:ownerId},fields=Object.keys(entry);
        await client.query(`insert into public.${table} (${fields.join(',')}) values (${fields.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(entry));
      }
    }
    await client.query('set constraints all immediate');
    await reconcile(client,mapped);
    await client.query("select setval(pg_get_serial_sequence('public.refill_events','sequence'), greatest(coalesce(max(sequence),0),1), count(*)>0) from public.refill_events");
    await client.query('insert into private.data_imports(id,owner_id,source_sha256,mapping_version,manifest) values($1,$2,$3,$4,$5)',[importId,ownerId,manifest.sourceSha256,mappingVersion,receiptManifest]);
    await client.query('commit'); return {status:'imported',counts:manifest.counts};
  } catch (error) { await client.query('rollback'); throw error; }
}
