import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { writeJsonFile } from '../src/services/fileService';

test('saves preserve invocation order and snapshots while other collections proceed', async () => {
    const originalFetch = globalThis.fetch;
    const requests: { body: string; respond: (response: Response) => void }[] = [];
    globalThis.fetch = async (_url, options) => new Promise<Response>((respond) => {
        requests.push({ body: options!.body as string, respond });
    });
    try {
        const first = writeJsonFile('pens', [{ id: 'first' }]);
        const nextData = [{ id: 'second' }];
        const second = writeJsonFile('pens', nextData);
        nextData[0].id = 'changed later';
        const independent = writeJsonFile('inks', []);
        assert.equal(requests.length, 2);
        assert.equal(JSON.parse(requests[1].body).filename, 'inks');
        requests[1].respond(Response.json({ success: true }));
        assert.equal(await independent, true);
        requests[0].respond(Response.json({ success: true }));
        assert.equal(await first, true);
        await Promise.resolve();
        assert.equal(requests.length, 3);
        assert.deepEqual(JSON.parse(requests[2].body).data, [{ id: 'second' }]);
        requests[2].respond(Response.json({ success: true }));
        assert.equal(await second, true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('failed saves remain visible and do not block the next snapshot', async (t) => {
    const dom = new JSDOM('<!doctype html><body></body>');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true });
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => {
        calls += 1;
        return new Response('', { status: calls === 1 ? 500 : 200 });
    });
    try {
        const failed = writeJsonFile('refillLog', []);
        const next = writeJsonFile('refillLog', [{ notes: 'newer' }]);
        assert.equal(await failed, false);
        assert.equal(await next, true);
        assert.equal(calls, 2);
        assert.match(dom.window.document.querySelector('[role="alert"]')!.textContent!, /Failed to save/);
        t.mock.timers.tick(8000);
    } finally {
        if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
        else Reflect.deleteProperty(globalThis, 'document');
        dom.window.close();
    }
});
