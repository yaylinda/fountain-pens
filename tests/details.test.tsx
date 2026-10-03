import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { withReferences, pilotReferences, wearingeulReferences } from './referenceFixtures';
import { inkDto } from '../src/services/collectionAdapter';
import { getInkReference } from '../src/lib/inkReference';
import { deriveCollection } from '../src/lib/collection';
const dom = new JSDOM('<html><body></body></html>', {url:'http://localhost/'});
for(const key of ['window','document','navigator','HTMLElement','Node','Element','MutationObserver']) Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
Object.defineProperty(globalThis,'BroadcastChannel',{configurable:true,value:undefined});
const {render,screen,cleanup,waitFor}=await import('@testing-library/react');
const userEvent=(await import('@testing-library/user-event')).default;
const {EntityEditor}=await import('../src/components/collection/EntityEditor');
const service=await import('../src/services/dataService');

test('every migrated rich field crosses the runtime adapter unchanged; no bundled fallback',()=>{
 for(const [brand,rows] of [['Pilot',pilotReferences],['Wearingeul',wearingeulReferences]] as const) for(const original of rows){
  const ink=withReferences({id:original.inkId,brand,name:original.name,collection:''});
  const decoded=inkDto({...ink,colorHex:null,archived:false,favorite:false});
  assert.deepEqual(getInkReference(decoded),original);
  assert.equal(getInkReference({id:ink.id,brand,name:ink.name,collection:''}),undefined);
 }
 assert.throws(()=>inkDto({id:'a',brand:'b',name:'n',collection:'',colorHex:null,archived:false,favorite:false,sources:[{label:'x',url:'javascript:alert(1)'}]}));
});

test('owner edits description and multiple links; failures retain draft; public display has links but no editing',async()=>{
 const pen={id:'p',brand:'Waterman',model:'Carène',color:'L’Essence du Bleu',nibSize:'Medium',nibType:'Gold',archived:false,favorite:false,needsRefill:false,details:'Original description',sources:[{label:'Original source',url:'https://example.test/source',supports:['product code']}]};
 let stored={...pen}; let fail=false; let saved=false;
 globalThis.fetch=async (input,init)=>{
  if(String(input).endsWith('/get_collection'))return Response.json({pens:[stored],inks:[],events:[],canEdit:true,asOf:'2026-10-03'});
  if(fail)return Response.json({code:'22023'},{status:400});
  const body=JSON.parse(String(init?.body));stored={...stored,...body.p_item};return Response.json({item:stored});
 };
 service.activateCollection('00000000-0000-4000-8000-000000000001');await service.loadData(true);
 const collection=service.getCollection();const model=deriveCollection(collection);
 const props={collection,model,onClose:()=>{},onDirty:()=>{},onOpen:()=>{},onSaved:()=>{saved=true;},backLabel:'pens'};
 const user=userEvent.setup({document:dom.window.document});
 try{
  render(<EntityEditor {...props} canEdit editor={{kind:'pen',item:pen}} />);
  await user.click(screen.getByText('Details & links',{selector:'summary'}));
  await user.clear(screen.getByLabelText(/Description/));await user.type(screen.getByLabelText(/Description/),'Owner story');
  await user.click(screen.getByRole('button',{name:'Add link'}));
  await user.type(screen.getByLabelText('Link 2 label'),'Product page');await user.type(screen.getByLabelText('Link 2 URL'),'javascript:alert(1)');
  await user.click(screen.getByRole('button',{name:'Save changes'}));assert.match(screen.getByRole('alert').textContent!,/full http/);assert.equal(saved,false);
  await user.clear(screen.getByLabelText('Link 2 URL'));await user.type(screen.getByLabelText('Link 2 URL'),'https://example.test/product');
  fail=true;await user.click(screen.getByRole('button',{name:'Save changes'}));await waitFor(()=>assert.match(screen.getByRole('alert').textContent!,/Check the fields/));
  assert.equal((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value,'Owner story');
  fail=false;await user.click(screen.getByRole('button',{name:'Save changes'}));await waitFor(()=>assert.equal(saved,true));
  assert.equal(stored.details,'Owner story');assert.equal(stored.sources.length,2);assert.deepEqual(stored.sources[0].supports,['product code']);
  cleanup();
  render(<EntityEditor {...props} canEdit={false} editor={{kind:'pen',item:stored}} />);
  assert.equal(screen.queryByRole('button',{name:'Add link'}),null);assert.equal(screen.queryByRole('button',{name:'Save changes'}),null);
  assert.ok(screen.getByRole('link',{name:'Product page ↗'}));assert.ok(screen.getByText('Owner story'));
 }finally{cleanup();dom.window.close();}
});
