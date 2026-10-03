// Synthetic browser harness. Bundled only by visual-server.mjs, never by Vite.
import pens from '../../src/data/pens.json';
import inks from '../../src/data/inks.json';
import { withReferences } from '../../tests/referenceFixtures';
const watermanId='3c8ab1e4-d304-460a-8d4d-54ae180adbb6';
const owner='00000000-0000-4000-8000-000000000001';
let canEdit=false;
const state={
    pens:pens.filter(p=>p.id===watermanId).map(p=>({...p,archived:false,favorite:false,needsRefill:false,details:'A deep blue lacquer finish with a wave-pattern cap.',sources:[{label:'Waterman product page',url:'https://www.waterman.com/pens/l%E2%80%99essence-du-bleu/car%C3%A8ne-fountain-pen-lessence-du-bleu-gift-box/SAP_2166344.html'}]})),
    inks:inks.filter(i=>['0ef1725f-3c1c-4d13-a10b-f474d63e9feb','5400c69c-d66a-4e64-8d53-9f1b05124a15'].includes(i.id)).map(i=>({...withReferences(i),archived:false,favorite:false,colorHex:null})),
    events:[],asOf:'2026-10-03',
};
window.fetch=async(input,init)=>{
    const url=String(input);const body=JSON.parse(String(init?.body||'{}'));
    if(url.includes('/auth/v1/token')){
        canEdit=true;
        const token=`${btoa(JSON.stringify({alg:'HS256'}))}.${btoa(JSON.stringify({sub:owner,exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`;
        return Response.json({access_token:token,refresh_token:'synthetic',expires_in:3600,token_type:'bearer',user:{id:owner,email:'owner@example.test',aud:'authenticated',app_metadata:{},user_metadata:{}}});
    }
    if(url.includes('/auth/v1/logout')){canEdit=false;return new Response(null,{status:204});}
    if(url.endsWith('/get_collection'))return Response.json({...state,canEdit});
    if(url.endsWith('/update_pen')||url.endsWith('/update_ink')){
        const items=url.endsWith('/update_pen')?state.pens:state.inks;
        const item=items.find(i=>i.id===body.p_id);Object.assign(item!,body.p_item);return Response.json({item});
    }
    throw new Error('Synthetic harness rejected unexpected network request');
};
localStorage.clear();
await import('../../src/main');
