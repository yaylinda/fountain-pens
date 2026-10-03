// Always creates its own synthetic database. No target URL or existing container is accepted.
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { capture, mapLegacy, importLegacy, mappingVersion, reconcile } from '../../scripts/migration/legacy.mjs';
import { ownerId, strangerId, sourceFixture } from './fixtures.mjs';
const image='postgres@sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f';
const name=`fountain-foundations-${randomUUID()}`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
let client;
try {
 docker('run','--rm','-d','--name',name,'--label','fountain-pens.disposable=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1::5432',image);
 const port=Number(docker('port',name,'5432/tcp').split(':').at(-1));
 const config={host:'127.0.0.1',port,user:'postgres',database:'postgres'};
 for(let i=0;i<60;i++) {
  client=new pg.Client(config);
  try {await client.connect();break;} catch {await client.end();client=null;await setTimeout(250);}
 }
 assert.ok(client,'disposable postgres ready');
 // Minimal managed-Auth stand-in, deliberately outside the shipped migration.
 await client.query(`create role anon nologin; create role authenticated nologin;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users values ('${ownerId}'),('${strangerId}');`);
 const migrations=(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort();
 await client.query(await readFile(`supabase/migrations/${migrations[0]}`,'utf8'));
 await client.query('insert into private.collection_owner(user_id,time_zone) values($1,$2)',[ownerId,'America/Chicago']);
 console.log('PASS empty schema install', (await client.query('show server_version')).rows[0].server_version);
 const snapshot={mapped:mapLegacy(sourceFixture(),'2026-01-10'),manifest:{mappingVersion,sourceSha256:'a'.repeat(64),files:[],counts:{pens:1,inks:2,events:3,links:4},asOf:'2026-01-10'}};
 const options={ownerId,targetIdentity:name};
 assert.equal((await importLegacy(client,snapshot,options)).status,'imported');
 assert.equal((await importLegacy(client,snapshot,options)).status,'already-imported');
 await assert.rejects(importLegacy(client,{...snapshot,manifest:{...snapshot.manifest,sourceSha256:'b'.repeat(64)}},options),/receipt mismatch/);
 await assert.rejects(importLegacy(client,snapshot,{...options,ownerId:strangerId}),/owner mapping/);
 await assert.rejects(importLegacy(client,snapshot,{...options,importId:'another'}),/not empty/);
 await reconcile(client,snapshot.mapped);
 console.log('PASS import reconciliation, duplicates, rerun and mismatch guard');
 for(const file of migrations.slice(1)) await client.query(await readFile(`supabase/migrations/${file}`,'utf8'));
 await reconcile(client,snapshot.mapped);
 console.log('PASS additive command migration preserves imported data');
 const writer=(await client.query("select rolcanlogin,rolsuper,rolbypassrls from pg_roles where rolname='collection_writer'")).rows[0];
 assert.deepEqual(writer,{rolcanlogin:false,rolsuper:false,rolbypassrls:false});
 const definers=(await client.query("select p.proconfig,r.rolname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.prosecdef")).rows;
 assert.equal(definers.length,3);
 for(const f of definers) {assert.equal(f.rolname,'collection_writer');assert.ok(f.proconfig.includes('search_path=""'));}
 for(const table of ['pens','inks','refill_events','refill_event_inks']) {
  const r=(await client.query('select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass',[`public.${table}`])).rows[0];
  assert.deepEqual(r,{relrowsecurity:true,relforcerowsecurity:true});
 }
 console.log('PASS function owners/search paths and forced RLS catalog checks');

 const role=async (who,uid,fn)=>{
  await client.query('begin');
  try {await client.query(`set local role ${who}`);await client.query("select set_config('request.jwt.claim.sub',$1,true)",[uid??'']); const answer=await fn();await client.query('commit');return answer;}
  catch(e){await client.query('rollback');throw e;}
 };
 const queue=(id= randomUUID(),version='1',flag=false)=>client.query('select public.set_pen_queue($1,$2,$3,$4) as result',[id,'pen_old',version,flag]);
 await assert.rejects(role('anon',null,()=>client.query('select * from public.pens')),e=>e.code==='42501');
 await assert.rejects(role('anon',null,()=>queue()),e=>e.code==='42501');
 for(const uid of [strangerId,null]) {
  assert.equal((await role('authenticated',uid,()=>client.query('select * from public.pens'))).rowCount,0);
  await assert.rejects(role('authenticated',uid,()=>queue()),e=>e.code==='42501');
  await assert.rejects(role('authenticated',uid,()=>client.query('select private.set_pen_queue($1,$2,$3,$4)',[randomUUID(),'pen_old','1',false])),e=>e.code==='42501');
 }
 assert.equal((await role('authenticated',ownerId,()=>client.query('select * from public.pens'))).rowCount,1);
 for(const sql of ["update public.pens set needs_refill=false",'select * from private.collection_owner','select * from private.mutation_receipts','select * from private.data_imports',"insert into public.inks(id,owner_id,brand,collection,name) values('bad',auth.uid(),'','','')"])
  await assert.rejects(role('authenticated',ownerId,()=>client.query(sql)),e=>e.code==='42501');
 const request=randomUUID();
 const first=(await role('authenticated',ownerId,()=>queue(request))).rows[0].result;
 assert.deepEqual(first,{id:'pen_old',version:'2',needsRefill:false});
 assert.deepEqual((await role('authenticated',ownerId,()=>queue(request))).rows[0].result,first);
 await assert.rejects(role('authenticated',ownerId,()=>queue(request,'1',true)),e=>e.code==='40001');
 await assert.rejects(role('authenticated',ownerId,()=>queue()),e=>e.code==='40001');
 assert.equal((await role('authenticated',ownerId,()=>queue(randomUUID(),'2',false))).rows[0].result.version,'2');
 const failedRequest=randomUUID();
 await assert.rejects(role('authenticated',ownerId,async()=>{await queue(failedRequest,'2',true);throw new Error('injected');}),/injected/);
 assert.equal((await client.query('select needs_refill,version::text from public.pens')).rows[0].version,'2');
 assert.equal((await client.query('select * from private.mutation_receipts where request_id=$1',[failedRequest])).rowCount,0);
 console.log('PASS owner/stranger/anon, direct/private grants, version conflict, replay, no-op, transaction rollback');
 const concurrentOwner=async(sql,args)=>{
  const c=new pg.Client(config);await c.connect();
  try {await c.query('begin');await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[ownerId]);const answer=await c.query(sql,args);await c.query('commit');return answer;}
  catch(e){await c.query('rollback');throw e;}finally{await c.end();}
 };
 const racing=await Promise.allSettled([1,2].map(()=>concurrentOwner('select public.set_pen_queue($1,$2,$3,$4)',[randomUUID(),'pen_old','2',true])));
 assert.equal(racing.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(racing.find(x=>x.status==='rejected').reason.code,'40001');
 console.log('PASS concurrent stale queue updates serialize and conflict');

 const invalid=async sql=>{await client.query('begin');try {await client.query(sql);await client.query('set constraints all immediate');await client.query('commit');}catch(e){await client.query('rollback');throw e;}};
 for(const sql of ["delete from public.refill_event_inks where event_id='legacy-refill-1'", "update public.refill_event_inks set position=10 where event_id='legacy-refill-1' and position=0", "update public.refill_events set kind='cleaning',not_pure=false where id='legacy-refill-1'", "insert into public.refill_event_inks values('"+ownerId+"','legacy-refill-3','ink_a',0)"])
  await assert.rejects(invalid(sql),e=>e.code==='23514');
 await assert.rejects(client.query("delete from public.pens where id='pen_old'"),e=>e.code==='23503');
 await assert.rejects(client.query("delete from public.inks where id='ink_a'"),e=>e.code==='23503');
 const next=(await client.query("insert into public.refill_events(owner_id,pen_id,occurred_on,kind) values($1,'pen_old','2026-01-04','cleaning') returning sequence::text",[ownerId])).rows[0];assert.equal(next.sequence,'4');
 console.log('PASS deferred link constraints, referenced deletes, next sequence');
 const entry={penId:'pen_old',date:'2026-01-04',kind:'refill',inkIds:['ink_b','ink_a'],notes:'mixture',notPure:true};
 const create=async (data=entry,requestId=randomUUID())=>(await role('authenticated',ownerId,()=>client.query('select public.create_refill_event($1,$2) as result',[requestId,data]))).rows[0].result;
 const readQueue=async()=>(await client.query("select needs_refill from public.pens where id='pen_old'")).rows[0].needs_refill;
 await client.query("update public.pens set needs_refill=true where id='pen_old'");
 const backdated=await create({...entry,date:'2026-01-01'});assert.equal(await readQueue(),true);
 const sharedRequest=randomUUID();
 const simultaneous=await Promise.all([1,2].map(()=>concurrentOwner('select public.create_refill_event($1,$2) as result',[sharedRequest,entry])));
 assert.deepEqual(simultaneous[0].rows[0].result,simultaneous[1].rows[0].result);
 const createRequest=randomUUID(),sameDay=await create(entry,createRequest);assert.equal(await readQueue(),false);
 assert.deepEqual(await create(entry,createRequest),sameDay);
 const distinct=await create();assert.notEqual(distinct.event.id,sameDay.event.id);
 assert.ok(BigInt(distinct.event.sequence)>BigInt(sameDay.event.sequence));
 const cleaning={...entry,kind:'cleaning',inkIds:[],notPure:false};
 await create({...cleaning,queueAfterCleaning:true});assert.equal(await readQueue(),true);
 await create(cleaning);assert.equal(await readQueue(),true);
 await create({...cleaning,date:'2025-01-01',queueAfterCleaning:false});assert.equal(await readQueue(),true);
 const changed=(await role('authenticated',ownerId,()=>client.query('select public.update_refill_event($1,$2,$3,$4) as result',[randomUUID(),backdated.event.id,'1',{...entry,date:'2026-01-05'}]))).rows[0].result;
 assert.equal(changed.event.sequence,backdated.event.sequence);assert.equal(changed.event.version,'2');assert.equal(await readQueue(),true);
 await assert.rejects(role('authenticated',ownerId,()=>client.query('select public.update_refill_event($1,$2,$3,$4)',[randomUUID(),backdated.event.id,'1',entry])),e=>e.code==='40001');
 await role('authenticated',ownerId,()=>client.query('select public.delete_refill_event($1,$2,$3)',[randomUUID(),backdated.event.id,'2']));assert.equal(await readQueue(),true);
 assert.equal((await client.query('select * from public.refill_event_inks where event_id=$1',[backdated.event.id])).rowCount,0);
 for(const data of [{...entry,owner_id:ownerId},{...entry,inkIds:['NONE']},{...entry,inkIds:['ink_a','ink_a']},{...entry,date:'2099-01-01'}, {...entry,date:'2025-02-29'}, {...entry,notPure:null},{...entry,inkIds:[]}, {...cleaning,notPure:true}, {...entry,queueAfterCleaning:true}])
  await assert.rejects(create(data),e=>e.code==='22023');
 for(const who of ['anon','authenticated']) await assert.rejects(role(who,strangerId,()=>client.query('select public.create_refill_event($1,$2)',[randomUUID(),entry])),e=>e.code==='42501');
 const before=(await client.query('select count(*)::int as n from public.refill_events')).rows[0].n;
 // Inject a link failure AFTER the function has created the event and changed the pen queue.
 await client.query(`create function private.inject_link_failure() returns trigger language plpgsql as $$ begin raise exception 'injected link failure'; end $$;
 create trigger test_fail_link before insert on public.refill_event_inks for each row execute function private.inject_link_failure();`);
 const failedEventRequest=randomUUID();
 await assert.rejects(create({...entry,date:'2026-01-06'},failedEventRequest),/injected link failure/);
 await client.query('drop trigger test_fail_link on public.refill_event_inks; drop function private.inject_link_failure()');
 assert.equal(await readQueue(),true);
 assert.equal((await client.query('select count(*)::int as n from public.refill_events')).rows[0].n,before);
 assert.equal((await client.query('select * from private.mutation_receipts where request_id=$1',[failedEventRequest])).rowCount,0);
 console.log('PASS refill mixtures, same-day/backdated/latest queue, cleaning choice, edits/deletes, validation, replay and injected link rollback');

 await client.query('truncate public.refill_event_inks,public.refill_events,public.pens,public.inks,private.data_imports,private.mutation_receipts');
 const bad=structuredClone(snapshot);bad.mapped.links[0].ink_id='missing';
 await assert.rejects(importLegacy(client,bad,options),e=>e.code==='23503');
 assert.equal((await client.query('select * from public.pens')).rowCount,0);
 assert.equal((await client.query('select * from private.data_imports')).rowCount,0);
 const peer=new pg.Client(config);await peer.connect();
 try {const outcomes=await Promise.all([importLegacy(client,snapshot,options),importLegacy(peer,snapshot,options)]);assert.deepEqual(outcomes.map(x=>x.status).sort(),['already-imported','imported']);}finally{await peer.end();}
 console.log('PASS failed import rolls back and concurrent imports serialize');
 // Fixed current repository snapshot, no live source reads or data logging.
 await client.query('truncate public.refill_event_inks,public.refill_events,public.pens,public.inks,private.data_imports,private.mutation_receipts');
 const actual=await capture('src/data','2026-10-03');
 await importLegacy(client,actual,options);await reconcile(client,actual.mapped);
 assert.equal((await importLegacy(client,actual,options)).status,'already-imported');
 console.log('PASS repository snapshot field/relationship reconciliation',JSON.stringify(actual.manifest.counts));
} finally {if(client)await client.end();try {docker('rm','-f','-v',name);}catch{ /* failed launch has no container */ }}
