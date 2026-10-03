// Local synthetic-only visual verification. No provider credentials or DB calls.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
const output='node_modules/.tmp/visual';
await mkdir(output,{recursive:true});
await build({entryPoints:['scripts/verification/visual-fixture.ts'],bundle:true,external:['/fonts/*'],format:'esm',outdir:output,jsx:'automatic',define:{'import.meta.env':JSON.stringify({VITE_SUPABASE_URL:'https://synthetic.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'})}});
if(process.argv.includes('--build-only')) process.exit(0);
const server=createServer(async(req,res)=>{
    if(['/fonts/figtree-latin.woff2','/fonts/bodoni-moda-latin.woff2'].includes(req.url)){res.setHeader('Content-Type','font/woff2');res.end(await readFile('public'+req.url));return;}
    if(req.url==='/visual-fixture.js'||req.url==='/visual-fixture.css'){
        res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':'text/css');res.end(await readFile(output+req.url));return;
    }
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/visual-fixture.css"><title>Synthetic collection verification</title></head><body><div id="root"></div><script type="module" src="/visual-fixture.js"></script></body></html>');
});
server.listen(5179,'127.0.0.1',()=>console.log('Synthetic collection ready at http://127.0.0.1:5179'));
