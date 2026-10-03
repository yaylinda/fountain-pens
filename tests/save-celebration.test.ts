import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><body><button>Save</button></body>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document });
const { captureSaveOrigin } = await import('../src/lib/saveCelebration');

test('origin captures the keyboard-focused save control before editor navigation', () => {
    const button = document.querySelector('button')!;
    button.getBoundingClientRect = () => ({ x: 100, y: 200, width: 80, height: 40 }) as DOMRect;
    button.focus();
    assert.deepEqual(captureSaveOrigin(), { x: 140, y: 220 });
});

test('reduced motion has a quiet status, no canvas, and complete idempotent cleanup', async () => {
    Object.assign(globalThis, { Path2D: class {}, cancelAnimationFrame: () => {} });
    const changes = new EventTarget();
    window.matchMedia = () => ({ matches: true, addEventListener: changes.addEventListener.bind(changes), removeEventListener: changes.removeEventListener.bind(changes) }) as MediaQueryList;
    const { playInkCeremony } = await import('../src/lib/inkCeremony');
    const stop = playInkCeremony({ x: 140, y: 220 });
    assert.equal(document.querySelectorAll('canvas').length, 0);
    assert.match(document.querySelector('[role=status]')!.textContent!, /Saved. Signed & sealed/);
    window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(document.querySelector('[role=status]'), null);
    stop();
    const stopAgain = playInkCeremony({ x: 140, y: 220 });
    changes.dispatchEvent(new Event('change'));
    assert.equal(document.querySelector('[role=status]'), null);
    stopAgain();
});
