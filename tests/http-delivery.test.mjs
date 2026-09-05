import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { gunzipSync } from 'node:zlib';
import express from 'express';
import { configureResponseDelivery, serveFrontend } from '../server/http-delivery.js';

test('HTTP delivery compresses assets and data without caching mutable responses', async (t) => {
    const root = await mkdtemp(path.join(tmpdir(), 'ink-http-'));
    const app = express();
    configureResponseDelivery(app);
    let revision = 1;
    app.get('/api/data', (_req, res) => res.json({ revision, notes: 'ink '.repeat(1000) }));
    const source = 'console.log("fountain pen");\n'.repeat(1000);
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'index-abcdefgh.js'), source);
    await writeFile(path.join(root, 'index.html'), '<!doctype html><title>Ink</title>');
    serveFrontend(app, root);
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(async () => {
        await new Promise((resolve) => server.close(resolve));
        await rm(root, { recursive: true, force: true });
    });
    const get = (url, headers = {}) => new Promise((resolve, reject) => {
        http.get({ hostname: '127.0.0.1', port: server.address().port, path: url, headers }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
            res.on('error', reject);
        }).on('error', reject);
    });

    const asset = await get('/assets/index-abcdefgh.js', { 'Accept-Encoding': 'gzip' });
    assert.equal(asset.status, 200);
    assert.equal(asset.headers['content-encoding'], 'gzip');
    assert.match(asset.headers.vary, /Accept-Encoding/);
    assert.equal(gunzipSync(asset.body).toString(), source);
    assert.ok(asset.body.length < source.length / 2);
    assert.match(asset.headers['cache-control'], /max-age=31536000/);
    assert.match(asset.headers['cache-control'], /immutable/);
    const identity = await get('/assets/index-abcdefgh.js', { 'Accept-Encoding': 'identity' });
    assert.equal(identity.headers['content-encoding'], undefined);
    assert.equal(identity.body.toString(), source);
    const conditional = await get('/assets/index-abcdefgh.js', { 'If-None-Match': identity.headers.etag });
    assert.equal(conditional.status, 304);
    for (const url of ['/', '/pens']) {
        const page = await get(url);
        assert.equal(page.status, 200);
        assert.equal(page.headers['cache-control'], 'no-cache');
    }
    const missing = await get('/assets/missing-abcdefgh.js');
    assert.equal(missing.status, 404);
    assert.doesNotMatch(missing.headers['cache-control'] || '', /immutable/);
    const data = await get('/api/data', { 'Accept-Encoding': 'gzip' });
    assert.equal(data.headers['cache-control'], 'no-store');
    assert.equal(JSON.parse(gunzipSync(data.body)).revision, 1);
    revision = 2;
    const updated = await get('/api/data', { 'If-None-Match': data.headers.etag });
    assert.equal(updated.status, 200);
    assert.equal(JSON.parse(updated.body).revision, 2);
});
