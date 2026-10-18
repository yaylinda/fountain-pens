import test from 'node:test';
import assert from 'node:assert/strict';
import { useSyncExternalStore } from 'react';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<html><body></body></html>', {url:'http://localhost',pretendToBeVisual:true});
for (const key of ['window','document','navigator','HTMLElement','Node','Element','MutationObserver','getComputedStyle','requestAnimationFrame']) Object.defineProperty(globalThis,key,{configurable:true,value:typeof dom.window[key] === 'function' && ['getComputedStyle','requestAnimationFrame'].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key]});
Object.defineProperty(globalThis,'BroadcastChannel',{configurable:true,value:undefined});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const {render,screen,cleanup,within,fireEvent} = await import('@testing-library/react');
const user = (await import('@testing-library/user-event')).default.setup();
const {default:WritingHistory} = await import('../src/components/collection/WritingHistory');
const service = await import('../src/services/dataService');
const {today} = await import('../src/lib/collection');
let logs: {id:string;refillId:string;writtenOn:string}[] = [];
let fail=false;
globalThis.fetch=async (input,init)=>{
 const name=String(input).split('/').at(-1);
 const body=JSON.parse(String(init?.body || '{}'));
 if(name==='save_writing_log') {
  if(fail) return Response.json({code:'offline'},{status:503});
  const item={id:body.p_id || String(logs.length+1),refillId:body.p_refill_id,writtenOn:body.p_written_on};
  logs=[...logs.filter(x=>x.id!==item.id),item]; return Response.json({item});
 }
 if(name==='delete_writing_log') { logs=logs.filter(x=>x.id!==body.p_id); return Response.json({deletedId:body.p_id}); }
 return Response.json({pens:[],inks:[],events:[],writingLogs:logs,canEdit:true,asOf:today()});
};
function Fixture({canEdit=true}) {
 const collection=useSyncExternalStore(service.subscribeCollection,service.getCollection);
 return <>{['first','second'].map(id=><WritingHistory key={id} entry={{id,date:'2026-01-01',penId:id,inkIds:['shared'],notes:''}} logs={collection.writingLogs || []} canEdit={canEdit} label={id}/>)}</>;
}
test('writing belongs to one refill; dates can be corrected, failed drafts retained, public controls hidden', async()=>{
 service.activateCollection('synthetic-owner'); await service.loadData(true);
 const ui=render(<Fixture/>);
 const first=within(screen.getByRole('region',{name:'Writing with first'}));
 const second=within(screen.getByRole('region',{name:'Writing with second'}));
 assert.equal(logs.length,0);
 await user.click(first.getByRole('button',{name:'Used today',exact:true}));
 assert.deepEqual(logs.map(x=>[x.refillId,x.writtenOn]),[['first',today()]]);
 assert.ok(first.getByRole('button',{name:'Used today ✓'}).hasAttribute('disabled'));
 assert.ok(!second.getByRole('button',{name:'Used today',exact:true}).hasAttribute('disabled'));
 await user.click(first.getByText(/Writing history/));
 fireEvent.change(first.getByLabelText('Add a writing date'),{target:{value:'2026-02-02'}});
 fail=true; await user.click(first.getByRole('button',{name:'Add date'}));
 assert.ok(first.getByRole('alert')); assert.equal(first.getByLabelText('Add a writing date').value,'2026-02-02');
 fail=false; await user.click(first.getByRole('button',{name:'Add date'}));
 await user.click(first.getByRole('button',{name:'Correct Feb 2, 2026'}));
 fireEvent.change(first.getByLabelText('Correct writing date'),{target:{value:'2026-02-03'}});
 await user.click(first.getByRole('button',{name:'Save date'}));
 assert.ok(logs.some(x=>x.writtenOn==='2026-02-03'));
 await user.click(first.getByRole('button',{name:'Remove Feb 3, 2026'}));
 assert.equal(logs.length,1);
 ui.rerender(<Fixture canEdit={false}/>);
 assert.equal(screen.queryAllByRole('button').length,0);
 assert.ok(first.getByText(/Last written/)); cleanup();
});
