import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { createServer } from 'vite';
import { createRefillApi } from '../server/refill-api.js';
import fileApiPlugin from '../vite-file-api-plugin';

for (const host of ['Express', 'Vite']) {
    test(`${host}: refill edits replace existing JSON entries without appending`, async (t) => {
        const root = await mkdtemp(path.join(tmpdir(), 'ink-refill-api-'));
        const dataDir = path.join(root, 'src/data');
        await mkdir(dataDir, { recursive: true });
        const file = path.join(dataDir, 'refillLog.json');
        const original = { date: '2026-09-01', penId: 'pen-a', inkIds: ['ink-a'], notes: 'Original' };
        const neighbor = { ...original, notes: 'Neighbor' };
        await writeFile(file, JSON.stringify([original, neighbor]));
        const app = express();
        app.use(express.json());
        app.use('/api/refill-logs', createRefillApi(dataDir));
        const vite = host === 'Vite' ? await createServer({
            root, configFile: false, plugins: [fileApiPlugin()],
            server: { middlewareMode: true, watch: null },
        }) : undefined;
        const server = http.createServer(vite?.middlewares || app);
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        t.after(async () => {
            await new Promise<void>((resolve) => server.close(() => resolve()));
            await vite?.close();
            await rm(root, { recursive: true, force: true });
        });
        const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
        const request = (method: string, suffix: string, body: unknown) => fetch(`${base}/api/refill-logs${suffix}`, {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const entries = async () => JSON.parse(await readFile(file, 'utf8'));
        // Change all editable identifying fields, including the first array item.
        const revised = { date: '2026-09-02', penId: 'pen-b', inkIds: ['ink-b', 'ink-c'], notes: 'Revised', notPure: true };
        assert.equal((await request('PUT', '/0', { expected: original, entry: revised })).status, 200);
        assert.deepEqual(await entries(), [revised, neighbor]);
        assert.equal((await request('PUT', '/0', { expected: original, entry: revised })).status, 409);
        assert.equal((await request('PUT', '/5', { expected: original, entry: revised })).status, 404);
        assert.equal((await request('PUT', '/0', { entry: revised })).status, 400);
        assert.equal((await request('POST', '/0', { entry: revised })).status, 405);
        assert.equal((await request('POST', '', { entry: { ...revised, index: 0 } })).status, 400);
        assert.deepEqual(await entries(), [revised, neighbor]);
        // Explicit creation appends, even when it records a genuinely repeated fill.
        assert.equal((await request('POST', '', { entry: revised })).status, 201);
        assert.deepEqual(await entries(), [revised, neighbor, revised]);
        assert.equal((await request('DELETE', '/0', { expected: revised })).status, 200);
        assert.deepEqual(await entries(), [neighbor, revised]);
        // An old index must not edit the entry that moved into its place.
        assert.equal((await request('PUT', '/1', { expected: neighbor, entry: original })).status, 409);
        const responses = await Promise.all([
            request('PUT', '/0', { expected: neighbor, entry: original }),
            request('POST', '', { entry: neighbor }),
        ]);
        assert.deepEqual(responses.map((response) => response.status), [200, 201]);
        assert.deepEqual(await entries(), [original, revised, neighbor]);
        if (host === 'Vite') {
            const legacy = await fetch(`${base}/api/save-json`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: 'refillLog', data: [] }),
            });
            assert.equal(legacy.status, 400);
            assert.deepEqual(await entries(), [original, revised, neighbor]);
        }
    });
}
