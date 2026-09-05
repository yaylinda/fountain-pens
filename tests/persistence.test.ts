import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { SAVE_CELEBRATION } from '../src/lib/saveCelebration';
import { writeJsonFile } from '../src/services/fileService';

const browser = new JSDOM('<!doctype html><body><button>Save</button></body>');
Object.assign(globalThis, { window: browser.window, document: browser.window.document });

test('saves preserve invocation order and snapshots while other collections proceed', async () => {
    const originalFetch = globalThis.fetch;
    const origins: { x: number; y: number }[] = [];
    const saved = (event: Event) => origins.push((event as CustomEvent).detail);
    window.addEventListener(SAVE_CELEBRATION, saved);
    const button = document.querySelector('button')!;
    let x = 100;
    button.getBoundingClientRect = () => ({ x, y: 50, width: 80, height: 40 }) as DOMRect;
    button.focus();
    const requests: { body: string; respond: (response: Response) => void }[] = [];
    globalThis.fetch = async (_url, options) => new Promise<Response>((respond) => {
        requests.push({ body: options!.body as string, respond });
    });
    try {
        const first = writeJsonFile('pens', [{ id: 'first' }]);
        x = 200;
        const nextData = [{ id: 'second' }];
        const second = writeJsonFile('pens', nextData);
        x = 300;
        nextData[0].id = 'changed later';
        const independent = writeJsonFile('inks', []);
        assert.equal(requests.length, 2);
        assert.equal(origins.length, 0);
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
        assert.deepEqual(origins, [{ x: 340, y: 70 }, { x: 140, y: 70 }, { x: 240, y: 70 }]);
    } finally {
        globalThis.fetch = originalFetch;
        window.removeEventListener(SAVE_CELEBRATION, saved);
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
