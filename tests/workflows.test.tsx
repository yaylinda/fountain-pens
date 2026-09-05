import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
});
for (const key of [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLSelectElement',
    'HTMLTextAreaElement',
    'Node',
    'Element',
    'MutationObserver',
    'getComputedStyle',
    'Event',
    'MouseEvent',
    'KeyboardEvent',
]) {
    Object.defineProperty(globalThis, key, {
        configurable: true,
        value:
            key === 'getComputedStyle'
                ? dom.window.getComputedStyle.bind(dom.window)
                : dom.window[key],
    });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.scrollTo = () => {};
const writes: { filename: string; data: Record<string, unknown>[] }[] = [];
const source = {
    pens: [
        {
            id: 'pen-a',
            brand: 'Pilot',
            model: 'Falcon',
            color: 'Sapphire',
            nibSize: 'Fine',
            nibType: 'Gold, 14k',
        },
    ],
    inks: [
        {
            id: 'ink-a',
            brand: 'Diamine',
            collection: '',
            name: 'Happy Holidays',
        },
        {
            id: 'ink-b',
            brand: 'Sailor',
            collection: 'Manyo',
            name: 'Népal Test',
        },
        { id: 'NONE', brand: 'NONE', collection: '', name: 'NONE' },
    ],
    refillLog: [
        {
            date: '2025-01-01',
            penId: 'pen-a',
            inkIds: ['ink-a'],
            notes: 'First pairing',
        },
    ],
};
let failLoad = true;
let localNetwork = true;
globalThis.fetch = async (input: string, init?: RequestInit) => {
    if (input === '/api/data') {
        if (failLoad) return new Response('Unavailable', { status: 503 });
        return Response.json(source);
    }
    if (input === '/api/is-local')
        return Response.json({ isLocal: localNetwork });
    if (input === '/api/save-json') {
        writes.push(JSON.parse(String(init?.body)));
        return Response.json({ success: true });
    }
    throw new Error(`Unexpected request in isolated UI test: ${input}`);
};
const { render, screen, within, waitFor, cleanup } = await import(
    '@testing-library/react'
);
const userEvent = (await import('@testing-library/user-event')).default;
const { MemoryRouter } = await import('react-router-dom');
const { default: App } = await import('../src/App');
const { LocalNetworkProvider } = await import(
    '../src/context/LocalNetworkContext'
);
const { DirtyStateProvider } = await import('../src/context/DirtyStateContext');

const latestWrite = (filename: string) =>
    [...writes].reverse().find((write) => write.filename === filename)!;

test('collection workflows work against isolated API fixtures without touching real inventory', async (t) => {
    const user = userEvent.setup({ document: dom.window.document });
    render(
        <MemoryRouter>
            <LocalNetworkProvider>
                <DirtyStateProvider>
                    <App />
                </DirtyStateProvider>
            </LocalNetworkProvider>
        </MemoryRouter>,
    );
    await t.test('failed initial data load can be retried', async () => {
        await screen.findByRole('heading', {
            name: 'Your collection couldn’t be opened',
        });
        failLoad = false;
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        await screen.findByRole('heading', { name: 'The writing desk' });
        assert.ok(
            screen.getByText('2', { selector: '.collection-strip strong' }),
        );
    });
    await t.test(
        'custom brand input saves without requiring a dropdown selection',
        async () => {
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            await user.click(screen.getByRole('button', { name: 'Add a pen' }));
            await user.type(screen.getByLabelText('Brand'), 'New maker');
            await user.type(screen.getByLabelText('Model'), 'Pocket pen');
            await user.type(
                screen.getByLabelText('Color / finishOptional'),
                'Olive',
            );
            await user.click(
                screen.getByRole('button', { name: 'Add pen', exact: true }),
            );
            await screen.findByRole('heading', { name: 'Fountain pens' });
            assert.ok(
                latestWrite('pens').data.some(
                    (pen) =>
                        pen.brand === 'New maker' && pen.model === 'Pocket pen',
                ),
            );
        },
    );
    await t.test(
        'inventory edits retain identity and cancellation preserves stored data',
        async () => {
            await user.click(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket pen/,
                }),
            );
            await user.clear(screen.getByLabelText('Model'));
            await user.type(screen.getByLabelText('Model'), 'Pocket writer');
            await user.click(
                screen.getByRole('button', { name: 'Save changes' }),
            );
            const pen = latestWrite('pens').data.find(
                (pen) => pen.brand === 'New maker',
            );
            assert.equal(pen?.model, 'Pocket writer');
            await user.click(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket writer/,
                }),
            );
            await user.type(screen.getByLabelText('Model'), ' unsaved');
            await user.click(screen.getByRole('link', { name: /Ink cabinet/ }));
            assert.ok(screen.getByRole('alert'));
            await user.click(
                screen.getByRole('button', { name: 'Keep editing' }),
            );
            assert.equal(
                screen.getByLabelText('Model').value,
                'Pocket writer unsaved',
            );
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Discard changes' }),
            );
            assert.equal(
                latestWrite('pens').data.find(
                    (candidate) => candidate.id === pen?.id,
                )?.model,
                'Pocket writer',
            );
        },
    );
    await t.test(
        'refill can create a missing ink and return with its pen, date, notes, and selection intact',
        async () => {
            await user.click(
                screen.getByRole('link', { name: 'Refill journal' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log a refill' }),
            );
            await user.click(
                screen.getByRole('radio', { name: /Pilot Falcon/ }),
            );
            const beforeSearch = writes.length;
            await user.type(
                screen.getByRole('searchbox', {
                    name: 'Find a pen by brand, model, finish, or nib…',
                }),
                'falcon{Enter}',
            );
            await user.click(
                screen.getByRole('button', { name: 'Clear search' }),
            );
            assert.equal(writes.length, beforeSearch);
            await user.type(
                screen.getByLabelText('NotesOptional'),
                'Test mixing notes',
            );
            await user.click(screen.getByRole('button', { name: 'New ink' }));
            await user.type(screen.getByLabelText('Brand'), 'Test maker');
            await user.type(screen.getByLabelText('Ink name'), 'Lilac');
            await user.type(
                screen.getByLabelText('Swatch colorOptional'),
                '#705A80',
            );
            await user.click(
                screen.getByRole('button', { name: 'Add ink', exact: true }),
            );
            assert.equal(
                screen.getByLabelText('NotesOptional').value,
                'Test mixing notes',
            );
            assert.ok(
                screen.getByRole('radio', { name: /Pilot Falcon/ }).checked,
            );
            assert.ok(screen.getByRole('checkbox', { name: /Lilac/ }).checked);
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            assert.ok(screen.getByRole('alert'));
            await user.click(
                screen.getByRole('button', { name: 'Keep editing' }),
            );
            await user.click(
                screen.getByRole('checkbox', { name: /Happy Holidays/ }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log refill', exact: true }),
            );
            const entry = latestWrite('refillLog').data.at(-1)!;
            assert.equal(entry.penId, 'pen-a');
            assert.equal(entry.notes, 'Test mixing notes');
            assert.equal(entry.inkIds.length, 2);
            assert.ok(!('index' in entry));
        },
    );
    await t.test(
        'filtered journal edits address the source entry, including index zero',
        async () => {
            const search = screen.getByRole('searchbox', {
                name: 'Search pens, inks, or notes…',
            });
            await user.type(search, 'First pairing');
            const journal = document.querySelector('.journal')!;
            await user.click(
                within(journal).getByRole('button', {
                    name: /Edit Pilot Falcon entry/,
                }),
            );
            await user.clear(screen.getByLabelText('NotesOptional'));
            await user.type(
                screen.getByLabelText('NotesOptional'),
                'Revised original',
            );
            await user.click(
                screen.getByRole('button', { name: 'Save changes' }),
            );
            assert.equal(
                latestWrite('refillLog').data[0].notes,
                'Revised original',
            );
            assert.equal(
                latestWrite('refillLog').data[1].notes,
                'Test mixing notes',
            );
            await user.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );
        },
    );
    await t.test(
        'cleaning ends the latest pairing and deleting it restores the ink mix',
        async () => {
            await user.click(
                screen.getByRole('button', { name: 'Log a refill' }),
            );
            await user.click(
                screen.getByRole('radio', { name: 'Cleaned & empty' }),
            );
            await user.click(
                screen.getByRole('radio', { name: /Pilot Falcon/ }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log cleaning' }),
            );
            assert.deepEqual(latestWrite('refillLog').data.at(-1)?.inkIds, [
                'NONE',
            ]);
            await user.click(screen.getByRole('link', { name: 'The desk' }));
            assert.ok(
                screen.getByRole('heading', { name: 'A fresh page awaits' }),
            );
            await user.click(
                screen.getByRole('link', { name: 'Refill journal' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Cleanings', exact: true }),
            );
            await user.click(
                within(document.querySelector('.journal')!).getByRole(
                    'button',
                    { name: /Edit Pilot Falcon entry/ },
                ),
            );
            await user.click(
                screen.getByRole('button', { name: 'Delete this entry' }),
            );
            await user.click(
                screen.getByRole('button', {
                    name: 'Delete entry',
                    exact: true,
                }),
            );
            await user.click(screen.getByRole('link', { name: 'The desk' }));
            assert.equal(document.querySelectorAll('.pairing').length, 1);
            assert.match(
                document.querySelector('.pairing')!.textContent!,
                /Lilac/,
            );
            assert.match(
                document.querySelector('.pairing')!.textContent!,
                /Happy Holidays/,
            );
        },
    );
    await t.test(
        'archiving preserves journal links and restoring returns an item to inventory',
        async () => {
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            await user.click(
                screen.getByRole('button', { name: /Edit Pilot Falcon/ }),
            );
            await user.click(screen.getByText('Manage this pen'));
            assert.equal(
                screen.queryByRole('button', { name: 'Delete pen' }),
                null,
            );
            await user.click(
                screen.getByRole('button', { name: 'Archive pen' }),
            );
            assert.equal(
                latestWrite('pens').data.find((pen) => pen.id === 'pen-a')
                    ?.archived,
                true,
            );
            await user.click(
                screen.getByRole('button', { name: 'Archived', exact: true }),
            );
            await user.click(
                screen.getByRole('button', { name: /Edit Pilot Falcon/ }),
            );
            await user.click(screen.getByText('Manage this pen'));
            await user.click(
                screen.getByRole('button', { name: 'Restore to collection' }),
            );
            assert.equal(
                latestWrite('pens').data.find((pen) => pen.id === 'pen-a')
                    ?.archived,
                false,
            );
        },
    );
    await t.test(
        'ink search ignores accents and unknown colors stay explicitly unrecorded',
        async () => {
            await user.click(screen.getByRole('link', { name: /Ink cabinet/ }));
            await user.type(
                screen.getByRole('searchbox', {
                    name: 'Search inks, brands, or collections…',
                }),
                'nepal',
            );
            const card = document.querySelector('.ink-card')!;
            assert.match(card.textContent!, /Népal Test/);
            assert.ok(card.querySelector('.swatch-unknown'));
            await user.click(card);
            assert.ok(screen.getByText('No swatch recorded yet'));
        },
    );
    await t.test(
        'view-only mode retains browsing and disables inventory mutations',
        async () => {
            cleanup();
            localNetwork = false;
            const before = writes.length;
            render(
                <MemoryRouter initialEntries={['/pens']}>
                    <LocalNetworkProvider>
                        <DirtyStateProvider>
                            <App />
                        </DirtyStateProvider>
                    </LocalNetworkProvider>
                </MemoryRouter>,
            );
            await screen.findByText(
                'Your collection is in view-only mode outside your home network.',
            );
            assert.equal(
                screen.queryByRole('button', { name: 'Add a pen' }),
                null,
            );
            await user.click(
                screen.getByRole('button', { name: /View Pilot Falcon/ }),
            );
            assert.ok(
                screen.getByLabelText('Brand').closest('fieldset')?.disabled,
            );
            assert.equal(
                screen.queryByRole('button', { name: 'Save changes' }),
                null,
            );
            assert.equal(writes.length, before);
        },
    );
    cleanup();
    await waitFor(() =>
        assert.equal(document.querySelector('.app-shell'), null),
    );
    dom.window.close();
});
