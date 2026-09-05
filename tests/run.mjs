import { build } from 'esbuild';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const temporaryRoot = resolve('node_modules/.tmp');
await mkdir(temporaryRoot, { recursive: true });
const output = await mkdtemp(join(temporaryRoot, 'collection-tests-'));
try {
    await build({
        entryPoints: ['tests/collection.test.ts', 'tests/workflows.test.tsx', 'tests/save-celebration.test.ts', 'tests/http-delivery.test.mjs'],
        outdir: output,
        outExtension: { '.js': '.mjs' },
        bundle: true,
        platform: 'node',
        format: 'esm',
        packages: 'external',
        jsx: 'automatic',
    });
    const result = spawnSync(
        process.execPath,
        [
            '--test',
            join(output, 'collection.test.mjs'),
            join(output, 'workflows.test.mjs'),
            join(output, 'save-celebration.test.mjs'),
            join(output, 'http-delivery.test.mjs'),
        ],
        { stdio: 'inherit', env: { ...process.env, TZ: 'America/Chicago' } },
    );
    process.exitCode = result.status ?? 1;
} finally {
    await rm(output, { recursive: true, force: true });
}
