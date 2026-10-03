export const ownerId='11111111-1111-4111-8111-111111111111';
export const strangerId='22222222-2222-4222-8222-222222222222';
export function sourceFixture() {
 const refill={date:'2026-01-02',penId:'pen_old',inkIds:['ink_b','ink_a'],notes:'Écriture 日本語',notPure:true};
 return {
  'pens.json':[{id:'pen_old',brand:'Pilot',model:'Test',color:'Blue',nibSize:'unusual',nibType:'Gold',needsRefill:true}],
  'inks.json':[{id:'NONE',brand:'',collection:'',name:'None'},...['ink_a','ink_b'].map(id=>({id,brand:'Brand',collection:'',name:id}))],
  'refillLog.json':[{...refill,index:999},{...refill},{date:'2026-01-03',penId:'pen_old',inkIds:['NONE'],notes:''}]
 };
}
