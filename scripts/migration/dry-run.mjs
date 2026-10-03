import { parseArgs } from 'node:util';
import { capture } from './legacy.mjs';
const {values}=parseArgs({options:{source:{type:'string'},'as-of':{type:'string'},'dry-run':{type:'boolean'}}});
if (!values.source || !values['as-of'] || !values['dry-run']) {
  throw new Error('Usage: npm run db:import-json -- --source <directory> --as-of YYYY-MM-DD --dry-run');
}
// Only a summary is printed; inventory labels and journal notes never enter logs.
const {manifest}=await capture(values.source,values['as-of']);
console.log(JSON.stringify(manifest,null,2));
if (manifest.findings.length) process.exitCode=2;
