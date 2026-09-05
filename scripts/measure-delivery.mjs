// Read-only local HTTP benchmark: no production writes or git operations.
import express from 'express';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { configureResponseDelivery, serveFrontend } from '../server/http-delivery.js';

const dist = resolve('dist');
const html = await readFile(`${dist}/index.html`, 'utf8');
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
const data = {};
for (const name of ['inks', 'pens', 'refillLog']) {
    data[name] = JSON.parse(await readFile(`src/data/${name}.json`, 'utf8'));
}
const rows = [];
for (const improved of [false, true]) {
    const app = express();
    if (improved) configureResponseDelivery(app);
    app.get('/api/data', (_req, res) => res.json(data));
    if (improved) serveFrontend(app, dist);
    else app.use(express.static(dist));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
        for (const asset of [...assets, '/api/data']) {
            const result = await new Promise((resolve, reject) => {
                http.get({ hostname: '127.0.0.1', port: server.address().port, path: asset,
                    headers: { 'Accept-Encoding': 'gzip' } }, (res) => {
                    let bytes = 0;
                    res.on('data', (chunk) => { bytes += chunk.length; });
                    res.on('end', () => resolve({ bytes, encoding: res.headers['content-encoding'] || 'identity', cache: res.headers['cache-control'] || '(unset)' }));
                    res.on('error', reject);
                }).on('error', reject);
            });
            rows.push({ mode: improved ? 'after' : 'before', asset, ...result });
        }
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}
console.table(rows);
const sum = (mode) => rows.filter((row) => row.mode === mode).reduce((total, row) => total + row.bytes, 0);
console.log(JSON.stringify({ beforeBytes: sum('before'), afterBytes: sum('after'), reductionPercent: Number((100 * (1 - sum('after') / sum('before'))).toFixed(1)) }));
console.log('Response-body bytes only; this is not a browser paint-time benchmark. Fonts, HTML, and protocol overhead excluded.');
