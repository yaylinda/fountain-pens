// Creates and removes only its own disposable PostgreSQL instance.
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { capture, importLegacy, reconcile } from '../../scripts/migration/legacy.mjs';
import { catalogs, referenceRows, swatchRows, watermanId, watermanSource } from '../../scripts/migration/reference-data.mjs';
import { ownerId, strangerId } from './fixtures.mjs';
const image='postgres@sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f';
const name=`fountain-crud-${randomUUID()}`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
let client;
try {
 docker('run','--rm','-d','--name',name,'--label','fountain-pens.disposable=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1::5432',image);
 const port=Number(docker('port',name,'5432/tcp').split(':').at(-1));
 for(let i=0;i<60;i++) {
  client=new pg.Client({host:'127.0.0.1',port,user:'postgres',database:'postgres'});
  try {await client.connect();break;} catch {await client.end();client=null;await setTimeout(250);}
 }
 assert.ok(client,'disposable postgres ready');
 // Managed-like install: non-superuser DB owner, auth access but NO grant option.
 await client.query(`create role anon nologin; create role authenticated nologin;
 create role migration_runner nologin nosuperuser bypassrls;
 alter database postgres owner to migration_runner;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 revoke all on schema auth from public;
 revoke all on function auth.uid() from public;
 grant usage on schema auth to anon,authenticated,migration_runner;
 grant execute on function auth.uid() to anon,authenticated,migration_runner;
 grant references on auth.users to migration_runner;
 insert into auth.users values ('${ownerId}'),('${strangerId}');
 set role migration_runner;`);
 assert.equal((await client.query("select rolsuper from pg_roles where rolname=current_user")).rows[0].rolsuper,false);
 assert.equal((await client.query("select has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') as allowed")).rows[0].allowed,false);
 for(const file of (await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()) await client.query(await readFile(`supabase/migrations/${file}`,'utf8'));
 await client.query('insert into private.collection_owner(user_id,time_zone) values($1,$2)',[ownerId,'America/Chicago']);
 await client.query('reset role');
 assert.equal((await client.query("select count(*)::int n from pg_roles where rolname='collection_writer'")).rows[0].n,0);
 assert.equal((await client.query("select to_regclass('private.mutation_receipts') x")).rows[0].x,null);
 const definers=(await client.query("select p.proname,p.proconfig,r.rolname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.prosecdef")).rows;
 assert.equal(definers.length,1); assert.equal(definers[0].proname,'is_owner'); assert.equal(definers[0].rolname,'migration_runner');
 assert.ok(definers[0].proconfig.includes('search_path=""'));
 for(const table of ['pens','inks','refill_events','refill_event_inks']) {
  const row=(await client.query('select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass',[`public.${table}`])).rows[0];
  assert.deepEqual(row,{relrowsecurity:true,relforcerowsecurity:true});
 }
 console.log('PASS PG17.11 non-superuser migration install without auth grant option or bespoke roles');
 const role=async(who,uid,fn)=>{
  await client.query('begin');
  try {await client.query(`set local role ${who}`);await client.query("select set_config('request.jwt.claim.sub',$1,true)",[uid??'']);const result=await fn();await client.query('commit');return result;}
  catch(e){await client.query('rollback');throw e;}
 };
 const rpc=async(name,args=[],who='authenticated',uid=ownerId)=>(await role(who,uid,()=>client.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args))).rows[0].result;
 const pen={brand:'Pilot',model:'Test',color:'Blue',nibSize:'Fine',nibType:'Gold',archived:false,favorite:false,needsRefill:true};
 const ink={brand:'Diamine',collection:'',name:'Test',colorHex:null,archived:false,favorite:false};
 for(const [who,uid] of [['anon',null],['authenticated',strangerId],['authenticated',null]]) {
  assert.equal((await rpc('get_collection',[],who,uid)).canEdit,false);
  await assert.rejects(rpc('create_pen',[pen],who,uid),e=>e.code==='42501');
  await assert.rejects(role(who,uid,()=>client.query('select * from private.collection_owner')),e=>e.code==='42501');
  await assert.rejects(role(who,uid,()=>client.query('insert into public.pens(owner_id,brand,model,color,nib_size,nib_type) values($1,$2,$3,$4,$5,$6)',[ownerId,'Bad','Bad','','',''])),e=>e.code==='42501');
 }
 const p=(await rpc('create_pen',[pen])).item;
 const a=(await rpc('create_ink',[ink])).item;
 const b=(await rpc('create_ink',[{...ink,name:'Second'}])).item;
 const changed=(await rpc('update_pen',[p.id,{...pen,model:'Changed',favorite:true}])).item;
 assert.equal(changed.model,'Changed'); assert.equal(changed.favorite,true);
 const entry={penId:p.id,date:'2026-01-02',kind:'refill',inkIds:[b.id,a.id],notes:'Public journal note',notPure:true};
 const event=(await rpc('create_refill_event',[entry])).event;
 const publicRead=await rpc('get_collection',[],'anon',null);
 assert.equal(publicRead.canEdit,false); assert.equal(publicRead.pens[0].needsRefill,false);
 assert.deepEqual(publicRead.events[0].inkIds,[b.id,a.id]); assert.equal(publicRead.events[0].notes,entry.notes);
 assert.equal((await rpc('get_collection')).canEdit,true);
 for(const [who,uid] of [['anon',null],['authenticated',strangerId]]) {
  for(const [name,args] of [['update_pen',[p.id,pen]],['delete_pen',[p.id]],['create_ink',[ink]],['update_ink',[a.id,ink]],['delete_ink',[a.id]],['create_refill_event',[entry]],['update_refill_event',[event.id,entry]],['delete_refill_event',[event.id]]])
   await assert.rejects(rpc(name,args,who,uid),e=>e.code==='42501');
 }
 assert.equal((await role('authenticated',strangerId,()=>client.query("update public.pens set model='forbidden' where id=$1",[p.id]))).rowCount,0);
 console.log('PASS public collection/journal reads, anonymous/stranger write denial and owner inventory CRUD');
 await rpc('update_pen',[p.id,{...pen,archived:true}]);
 assert.equal((await rpc('get_collection')).events.length,1);
 await assert.rejects(rpc('delete_pen',[p.id]),e=>e.code==='23503');
 await assert.rejects(rpc('delete_ink',[a.id]),e=>e.code==='23503');
 await rpc('update_pen',[p.id,pen]);
 await rpc('update_refill_event',[event.id,{...entry,notes:'Edited',inkIds:[a.id]}]);
 assert.equal((await rpc('get_collection')).pens[0].needsRefill,true,'historical edit leaves queue intent');
 const cleaning=(await rpc('create_refill_event',[{...entry,kind:'cleaning',inkIds:[],notPure:false,queueAfterCleaning:false}])).event;
 assert.equal((await rpc('get_collection')).pens[0].needsRefill,false);
 await rpc('delete_refill_event',[cleaning.id]);
 // A multi-ink write must roll back its event, links and queue together.
 await client.query(`create function private.fail_link() returns trigger language plpgsql as $$ begin raise exception 'test link failure'; end $$;
 create trigger test_fail_link before insert on public.refill_event_inks for each row execute function private.fail_link();`);
 const before=await rpc('get_collection');
 await assert.rejects(rpc('create_refill_event',[entry]),/test link failure/);
 await client.query('drop trigger test_fail_link on public.refill_event_inks; drop function private.fail_link()');
 assert.deepEqual(await rpc('get_collection'),before);
 await assert.rejects(rpc('create_refill_event',[{...entry,inkIds:[a.id,a.id]}]),e=>e.code==='22023');
 await rpc('delete_refill_event',[event.id]);
 await rpc('update_ink',[a.id,{...ink,archived:true}]); await rpc('update_ink',[a.id,ink]);
 await rpc('delete_ink',[a.id]); await rpc('delete_ink',[b.id]); await rpc('delete_pen',[p.id]);
 assert.equal((await rpc('get_collection')).pens.length,0);
 console.log('PASS archive/restore, restrictive deletes and atomic multi-ink/refill/cleaning integrity');
 // Validate the approved fixed source with the ordinary one-time transactional importer.
 const snapshot=await capture('src/data','2026-10-03');
 await client.query('set role migration_runner');
 await importLegacy(client,snapshot,{ownerId,targetIdentity:name}); await reconcile(client,snapshot.mapped);
 assert.equal((await importLegacy(client,snapshot,{ownerId,targetIdentity:name})).status,'already-imported');
 // Rehearse the upgrade against the imported inventory, not just an empty install.
 const seed = await readFile('supabase/migrations/20261003171529_seed_collection_references.sql','utf8');
 await client.query(seed);
 await client.query('reset role');
 const migrated = await rpc('get_collection',[],'anon',null);
 for (const catalog of catalogs) for (const original of catalog.inks) {
  const ink = migrated.inks.find(i => i.id === original.inkId);
  assert.deepEqual({...ink.reference,description:ink.details,sources:ink.sources}, original,
   `every original field retained for ${original.inkId}`);
 }
 for (const row of swatchRows) assert.deepEqual(migrated.inks.find(i => i.id===row.id).swatchReference,row.swatch);
 assert.deepEqual(migrated.pens.find(p => p.id===watermanId).sources,[watermanSource]);
 assert.equal(referenceRows.length,36); assert.equal(swatchRows.length,123);
 const rich = migrated.inks.find(i => i.reference?.writing);
 const { id: richId, reference: richReference, swatchReference: richSwatch, ...richInput } = rich;
 const edited = await rpc('update_ink',[richId,{...richInput,details:'Owner description',sources:[{label:'Product',url:'https://example.com/product',supports:['description']},{label:'Review',url:'https://example.com/review'}]}]);
 assert.deepEqual(edited.item.reference,richReference);
 assert.deepEqual(edited.item.swatchReference,richSwatch);
 assert.equal(edited.item.details,'Owner description'); assert.equal(edited.item.sources.length,2);
 // Old clients omitting optional fields also preserve the new data.
 const oldInput = {...richInput}; delete oldInput.details; delete oldInput.sources;
 const oldSave = await rpc('update_ink',[richId,{...oldInput,favorite:true}]);
 assert.equal(oldSave.item.details,'Owner description'); assert.deepEqual(oldSave.item.sources,edited.item.sources);
 await assert.rejects(rpc('update_ink',[richId,{...richInput,sources:[{label:'Bad',url:'javascript:alert(1)'}]}]),e=>e.code==='22023');
 await assert.rejects(rpc('update_ink',[richId,{...richInput,reference:{}}]),e=>e.code==='22023');
 const cleared = await rpc('update_ink',[richId,{...richInput,details:'',sources:[]}]);
 assert.equal(cleared.item.details,''); assert.deepEqual(cleared.item.sources,[]); assert.deepEqual(cleared.item.reference,richReference);
 const detailPen = (await rpc('create_pen',[{...pen,details:'A pen story',sources:[watermanSource]}])).item;
 assert.equal(detailPen.details,'A pen story'); assert.deepEqual(detailPen.sources,[watermanSource]);
 await rpc('update_pen',[detailPen.id,{...pen,details:'Updated',sources:[]}]);
 await rpc('delete_pen',[detailPen.id]);
 // Wrong-brand associations must fail, without overwriting unrelated inventory.
 await client.query("update public.inks set brand='Wrong' where id=$1",[referenceRows[0].id]);
 await assert.rejects(client.query(seed),/Reference brand mismatch/);
 await client.query('update public.inks set brand=$2 where id=$1',[referenceRows[0].id,referenceRows[0].brand]);
 console.log('PASS 36 complete rich references, 123 exact swatch records, Waterman link, editable prose/links, legacy saves and brand mismatch guard');
 await client.query("insert into public.inks(owner_id,brand,collection,name) select $1,'Synthetic','','Extra '||n from generate_series(1,1100) n",[ownerId]);
 assert.equal((await rpc('get_collection',[],'anon',null)).inks.length,snapshot.mapped.inks.length+1100);
 console.log('PASS fixed-source import reconciliation and public snapshot beyond 1000 rows',JSON.stringify(snapshot.manifest.counts));
} finally {if(client)await client.end();try{docker('rm','-f','-v',name);}catch{/* launch may have failed */}}
