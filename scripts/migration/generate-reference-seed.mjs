import { writeFile } from 'node:fs/promises';
import { seedSql } from './reference-data.mjs';
await writeFile('supabase/migrations/20261003171529_seed_collection_references.sql', seedSql());
