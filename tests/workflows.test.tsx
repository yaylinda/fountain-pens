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
    'FormData',
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
            collection: 'Inkvent',
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
const { render, screen, within, waitFor, cleanup, fireEvent, act } =
    await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const { createMemoryRouter, createHashRouter, RouterProvider } =
    await import('react-router-dom');
const { default: App } = await import('../src/App');
const { LocalNetworkProvider } =
    await import('../src/context/LocalNetworkContext');
const { DirtyStateProvider } = await import('../src/context/DirtyStateContext');

let appRouter: ReturnType<typeof createMemoryRouter>;
const mountApp = (initialEntries = ['/']) => {
    appRouter?.dispose();
    appRouter = createMemoryRouter([{ path: '*', element: <App /> }], {
        initialEntries,
    });
    render(
        <LocalNetworkProvider>
            <DirtyStateProvider>
                <RouterProvider router={appRouter} />
            </DirtyStateProvider>
        </LocalNetworkProvider>,
    );
};

const latestWrite = (filename: string) =>
    [...writes].reverse().find((write) => write.filename === filename)!;

test('collection workflows work against isolated API fixtures without touching real inventory', async (t) => {
    const user = userEvent.setup({ document: dom.window.document });
    await t.test('desk refill queue includes empty pens and opens usable refill drafts', async () => {
        const { default: RefillQueue } = await import('../src/components/collection/RefillQueue');
        const { deriveCollection } = await import('../src/lib/collection');
        const pens = ['inked', 'empty', 'new', 'archived', 'unmarked'].map((id) => ({
            ...source.pens[0], id, model: id,
            needsRefill: id !== 'unmarked', archived: id === 'archived',
        }));
        const model = deriveCollection({ pens, inks: source.inks, entries: [
            { ...source.refillLog[0], penId: 'inked', inkIds: ['ink-a', 'ink-b'] },
            { ...source.refillLog[0], penId: 'empty', inkIds: ['NONE'] },
        ] });
        const opened: import('../src/lib/collection').EditorState[] = [];
        const onOpen = (editor: import('../src/lib/collection').EditorState) => opened.push(editor);
        const view = render(<RefillQueue model={model} onOpen={onOpen} canEdit />);
        assert.equal(screen.getAllByRole('listitem').length, 3);
        assert.ok(screen.getByText('Cleaned & empty'));
        assert.ok(screen.getByText('No ink recorded'));
        assert.ok(screen.getByText('Happy Holidays'));
        assert.ok(screen.getByText('Népal Test'));
        for (const id of ['inked', 'empty', 'new']) {
            await user.click(screen.getByRole('button', { name: new RegExp(`^Refill Pilot ${id},`) }));
            const editor = opened.at(-1)!;
            assert.equal(editor.kind, 'refill');
            if (editor.kind === 'refill') {
                assert.equal(editor.draft?.penId, id);
                assert.deepEqual(editor.draft?.inkIds, id === 'inked' ? ['ink-a', 'ink-b'] : []);
            }
        }
        await user.click(screen.getByRole('button', { name: 'View Diamine Happy Holidays' }));
        assert.equal(opened.at(-1)?.kind, 'ink');
        view.rerender(<RefillQueue model={model} onOpen={onOpen} canEdit={false} />);
        assert.equal(screen.queryAllByRole('button', { name: /^Refill / }).length, 0);
        view.rerender(<RefillQueue model={deriveCollection({
            pens: pens.map((pen) => ({ ...pen, needsRefill: false })), inks: [], entries: [],
        })} onOpen={onOpen} canEdit />);
        assert.equal(view.container.textContent, '');
        cleanup();
    });
    mountApp();
    await t.test('failed initial data load can be retried', async () => {
        await screen.findByRole('heading', {
            name: 'Your collection couldn’t be opened',
        });
        failLoad = false;
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        await screen.findByRole('heading', { name: 'The writing desk' });
        assert.ok(
            screen.getByText('1 of 1 inked pens'),
        );
    });
    await t.test('desk presets, grouping, and palette selection combine without writes', async () => {
        const before = writes.length;
        await user.click(screen.getByRole('button', { name: 'Lamy', exact: true }));
        assert.ok(screen.getByText('No pens match this selection'));
        await user.click(screen.getByRole('button', { name: 'Gold nibs', exact: true }));
        assert.ok(screen.getByText('1 of 1 inked pens'));
        await user.selectOptions(screen.getByLabelText('Group by'), 'ink');
        assert.ok(screen.getByRole('heading', { name: 'Diamine 1' }));
        await user.click(screen.getByRole('button', { name: 'Filter to Diamine Happy Holidays' }));
        assert.ok(screen.getByRole('button', { name: 'Show all colors' }));
        await user.click(screen.getByRole('button', { name: 'Filter pens · active', exact: true }));
        await user.selectOptions(screen.getByLabelText('Order by'), 'recent');
        await user.click(screen.getByRole('button', { name: 'Falcon · Sapphire', exact: true }));
        await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
        await screen.findByRole('heading', { name: 'The writing desk' });
        assert.equal((screen.getByLabelText('Group by') as HTMLSelectElement).value, 'ink');
        assert.equal((screen.getByLabelText('Order by') as HTMLSelectElement).value, 'recent');
        assert.equal((screen.getByLabelText('Nib material') as HTMLSelectElement).value, 'Gold');
        assert.equal(screen.getByRole('button', { name: 'Hide filters · active', exact: true }).getAttribute('aria-expanded'), 'true');
        assert.equal(screen.getByRole('button', { name: 'Filter to Diamine Happy Holidays' }).getAttribute('aria-pressed'), 'true');
        await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
        assert.equal(screen.queryByRole('button', { name: 'Show all colors' }), null);
        await user.click(screen.getByRole('button', { name: 'Lamy', exact: true }));
        await user.click(screen.getByRole('button', { name: 'Gold nibs', exact: true }));
        await act(async () => { await appRouter.navigate(-1); });
        assert.equal(screen.getByRole('button', { name: 'Lamy', exact: true }).getAttribute('aria-pressed'), 'true');
        assert.ok(screen.getByText('No pens match this selection'));
        await act(async () => { await appRouter.navigate(1); });
        assert.equal(screen.getByRole('button', { name: 'Gold nibs', exact: true }).getAttribute('aria-pressed'), 'true');
        assert.ok(screen.getByText('Diamine · Inkvent'));
        await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
        assert.equal(writes.length, before);
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
    await t.test('inventories default to current use and explicit All selections survive filtering', async () => {
        assert.equal(screen.getByRole('button', { name: 'Inked', exact: true }).getAttribute('aria-pressed'), 'true');
        assert.equal(screen.queryByRole('button', { name: /Edit New maker Pocket pen/ }), null);
        await user.click(screen.getByRole('button', { name: 'All pens', exact: true }));
        assert.equal(new URLSearchParams(appRouter.state.location.search).get('status'), 'all');
        await user.selectOptions(screen.getByRole('combobox', { name: 'Brand' }), 'New maker');
        assert.ok(screen.getByRole('button', { name: /Edit New maker Pocket pen/ }));
        assert.equal(screen.getByRole('button', { name: 'All pens', exact: true }).getAttribute('aria-pressed'), 'true');
        await user.click(screen.getByRole('button', { name: 'Clear filters' }));
        assert.equal(screen.getByRole('button', { name: 'All pens', exact: true }).getAttribute('aria-pressed'), 'true');
        await user.click(screen.getByRole('link', { name: /Ink cabinet/ }));
        assert.equal(screen.getByRole('button', { name: 'In use', exact: true }).getAttribute('aria-pressed'), 'true');
        assert.equal(screen.queryByRole('button', { name: 'Edit Sailor Népal Test' }), null);
        await user.click(screen.getByRole('button', { name: 'All inks', exact: true }));
        assert.equal(new URLSearchParams(appRouter.state.location.search).get('status'), 'all');
        await user.selectOptions(screen.getByRole('combobox', { name: 'Brand' }), 'Sailor');
        assert.ok(screen.getByRole('button', { name: 'Edit Sailor Népal Test' }));
        await user.click(screen.getByRole('button', { name: 'Clear filters' }));
        assert.equal(screen.getByRole('button', { name: 'All inks', exact: true }).getAttribute('aria-pressed'), 'true');
        await user.click(screen.getByRole('link', { name: /Fountain pens/ }));
        assert.equal(screen.getByRole('button', { name: 'Inked', exact: true }).getAttribute('aria-pressed'), 'true');
    });
    await t.test(
        'inventory edits retain identity and cancellation preserves stored data',
        async () => {
            await user.click(screen.getByRole('button', { name: 'All pens', exact: true }));
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
            assert.equal(document.querySelectorAll('.desk-pairing').length, 1);
            assert.match(
                document.querySelector('.desk-pairing')!.textContent!,
                /Lilac/,
            );
            assert.match(
                document.querySelector('.desk-pairing')!.textContent!,
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
            await user.click(screen.getByRole('button', { name: 'All inks', exact: true }));
            await user.type(
                screen.getByRole('searchbox', {
                    name: 'Search inks, authors, or properties…',
                }),
                'nepal',
            );
            const card = document.querySelector('.ink-card')!;
            assert.match(card.textContent!, /Népal Test/);
            assert.ok(card.querySelector('.swatch-unknown'));
            await user.click(
                within(card).getByRole('button', {
                    name: 'Edit Sailor Népal Test',
                }),
            );
            assert.ok(screen.getByText('No swatch recorded yet'));
        },
    );
    await t.test(
        'pen grid preserves filters, sorting, and the refill shortcut',
        async () => {
            const before = writes.length;
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            assert.ok(screen.getByRole('table', { name: 'Pen inventory' }));
            await user.selectOptions(
                screen.getByRole('combobox', { name: 'Brand' }),
                'Pilot',
            );
            await user.selectOptions(
                screen.getByRole('combobox', { name: 'Sort collection' }),
                'uses',
            );
            await user.type(
                screen.getByRole('searchbox', {
                    name: 'Search pens, nibs, or current ink…',
                }),
                'falcon',
            );
            await user.click(screen.getByRole('button', { name: 'Grid view' }));
            assert.equal(
                screen
                    .getByRole('button', { name: 'Grid view' })
                    .getAttribute('aria-pressed'),
                'true',
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            assert.equal(
                screen.getByRole('combobox', { name: 'Brand' }).value,
                'Pilot',
            );
            assert.equal(
                screen.getByRole('combobox', { name: 'Sort collection' }).value,
                'uses',
            );
            const card = document.querySelector('.pen-card')!;
            assert.match(card.textContent!, /Fine/);
            assert.match(card.textContent!, /Lilac/);
            assert.match(card.textContent!, /Happy Holidays/);
            await user.click(
                within(card).getByRole('button', {
                    name: 'Refill',
                    exact: true,
                }),
            );
            assert.ok(
                screen.getByRole('radio', { name: /Pilot Falcon/ }).checked,
            );
            assert.ok(
                screen.getByRole('checkbox', { name: /Happy Holidays/ })
                    .checked,
            );
            assert.ok(screen.getByRole('checkbox', { name: /Lilac/ }).checked);
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            assert.equal(
                screen.getByRole('searchbox', {
                    name: 'Search pens, nibs, or current ink…',
                }).value,
                'falcon',
            );
            await user.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 2);
            assert.equal(writes.length, before);
        },
    );
    await t.test(
        'ink list retains swatches and opens the correct editable ink',
        async () => {
            await user.click(screen.getByRole('link', { name: /Ink cabinet/ }));
            await user.click(screen.getByRole('button', { name: 'All inks', exact: true }));
            assert.equal(
                screen
                    .getByRole('button', { name: 'Grid view' })
                    .getAttribute('aria-pressed'),
                'true',
            );
            await user.click(screen.getByRole('button', { name: 'List view' }));
            const table = screen.getByRole('table', { name: 'Ink inventory' });
            const usedInk = within(table)
                .getByRole('button', { name: 'Edit Diamine Happy Holidays' })
                .closest('tr')!;
            assert.match(usedInk.textContent!, /Pilot Falcon/);
            assert.ok(usedInk.querySelector('.swatch:not(.swatch-unknown)'));
            await user.type(
                screen.getByRole('searchbox', {
                    name: 'Search inks, authors, or properties…',
                }),
                'nepal',
            );
            await user.click(
                screen.getByRole('button', { name: 'Edit Sailor Népal Test' }),
            );
            assert.equal(screen.getByLabelText('Ink name').value, 'Népal Test');
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            assert.ok(screen.getByRole('table', { name: 'Ink inventory' }));
            assert.equal(
                screen.getByRole('searchbox', {
                    name: 'Search inks, authors, or properties…',
                }).value,
                'nepal',
            );
            await user.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );
            assert.equal(
                screen
                    .getByRole('button', { name: 'List view' })
                    .getAttribute('aria-pressed'),
                'true',
            );
        },
    );
    await t.test(
        'editor Back and Forward preserve inventory filters and protect unsaved changes',
        async () => {
            const before = writes.length;
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            await user.selectOptions(
                screen.getByRole('combobox', { name: 'Brand' }),
                'Pilot',
            );
            await user.type(
                screen.getByRole('searchbox', {
                    name: 'Search pens, nibs, or current ink…',
                }),
                'falcon',
            );
            const returnUrl = appRouter.state.location.search;
            await user.click(
                screen.getByRole('button', { name: /Edit Pilot Falcon/ }),
            );
            assert.match(appRouter.state.location.search, /editor=pen/);
            await act(async () => {
                await appRouter.navigate(-1);
            });
            assert.equal(appRouter.state.location.search, returnUrl);
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            await act(async () => {
                await appRouter.navigate(1);
            });
            assert.equal(screen.getByLabelText('Model').value, 'Falcon');
            await user.type(screen.getByLabelText('Model'), ' unfinished');
            await act(async () => {
                await appRouter.navigate(-1);
            });
            assert.ok(screen.getByRole('alert'));
            await user.click(
                screen.getByRole('button', { name: 'Keep editing' }),
            );
            assert.equal(
                screen.getByLabelText('Model').value,
                'Falcon unfinished',
            );
            await act(async () => {
                await appRouter.navigate(-1);
            });
            await user.click(
                screen.getByRole('button', { name: 'Discard changes' }),
            );
            assert.equal(appRouter.state.location.search, returnUrl);
            await act(async () => {
                await appRouter.navigate(1);
            });
            assert.equal(screen.getByLabelText('Model').value, 'Falcon');
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );
            await user.click(screen.getByRole('link', { name: /Ink cabinet/ }));
            await user.click(screen.getByRole('button', { name: 'All inks', exact: true }));
            await user.click(
                screen.getByRole('button', { name: 'Edit Sailor Népal Test' }),
            );
            assert.match(appRouter.state.location.search, /editor=ink/);
            await act(async () => {
                await appRouter.navigate(-1);
            });
            assert.ok(screen.getByRole('table', { name: 'Ink inventory' }));
            assert.equal(writes.length, before);
        },
    );
    await t.test(
        'Back from a nested new ink restores the unfinished refill before leaving the journal editor',
        async () => {
            const before = writes.length;
            await user.click(
                screen.getByRole('link', { name: 'Refill journal' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log a refill' }),
            );
            await user.click(
                screen.getByRole('radio', { name: /Pilot Falcon/ }),
            );
            await user.click(
                screen.getByRole('checkbox', { name: /Happy Holidays/ }),
            );
            await user.type(
                screen.getByLabelText('NotesOptional'),
                'Draft survives Back',
            );
            await user.click(screen.getByRole('button', { name: 'New ink' }));
            await act(async () => {
                await appRouter.navigate(-1);
            });
            assert.equal(
                screen.getByLabelText('NotesOptional').value,
                'Draft survives Back',
            );
            assert.equal(
                screen.getByRole('radio', { name: /Pilot Falcon/ }).checked,
                true,
            );
            assert.equal(
                screen.getByRole('checkbox', { name: /Happy Holidays/ })
                    .checked,
                true,
            );
            await act(async () => {
                await appRouter.navigate(-1);
            });
            assert.ok(screen.getByRole('alert'));
            await user.click(
                screen.getByRole('button', { name: 'Keep editing' }),
            );
            assert.equal(
                screen.getByLabelText('NotesOptional').value,
                'Draft survives Back',
            );
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Discard changes' }),
            );
            assert.equal(appRouter.state.location.search, '');
            assert.equal(writes.length, before);
        },
    );
    await t.test(
        'inventory previews expose ink metadata and current pens on hover, focus, and tap without editing',
        async () => {
            const before = writes.length;
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            const label = 'View Diamine Happy Holidays';
            await user.hover(screen.getByRole('button', { name: label }));
            let preview = screen.getByRole('tooltip');
            assert.match(
                preview.textContent!,
                /Diamine.*Happy Holidays.*Inkvent/,
            );
            await user.unhover(screen.getByRole('button', { name: label }));
            await waitFor(() => assert.ok(!screen.queryByRole('tooltip')));
            await user.click(screen.getByRole('button', { name: 'List view' }));
            const trigger = screen.getByRole('button', { name: label });
            await act(async () => {
                trigger.focus();
            });
            assert.ok(screen.getByRole('tooltip'));
            await user.keyboard('{Escape}');
            assert.equal(screen.queryByRole('tooltip'), null);
            await user.click(screen.getByRole('button', { name: 'Grid view' }));
            await user.click(screen.getByRole('link', { name: /Ink cabinet/ }));
            await user.click(screen.getByRole('button', { name: 'Grid view' }));
            const indicator = screen.getByRole('button', {
                name: 'Pens using Diamine Happy Holidays',
            });
            assert.match(indicator.textContent!, /In 1 pen/);
            assert.equal(indicator.parentElement?.closest('button'), null);
            await user.click(indicator);
            preview = screen.getByRole('tooltip');
            assert.match(preview.textContent!, /Pilot Falcon.*Sapphire.*Fine/);
            assert.equal(
                screen.queryByRole('heading', { name: 'Edit ink' }),
                null,
            );
            await user.click(indicator);
            assert.equal(screen.queryByRole('tooltip'), null);
            await user.click(screen.getByRole('button', { name: 'List view' }));
            assert.equal(writes.length, before);
        },
    );
    await t.test('latest ink opens the correct page in both layouts and Back restores pen filters', async () => {
        const before = writes.length;
        await user.click(screen.getByRole('link', { name: /Fountain pens/ }));
        await user.selectOptions(screen.getByRole('combobox', { name: 'Brand' }), 'Pilot');
        for (const layout of ['List view', 'Grid view']) {
            await user.click(screen.getByRole('button', { name: layout }));
            const returnUrl = appRouter.state.location.search;
            await user.click(screen.getByRole('button', { name: 'View Diamine Happy Holidays' }));
            assert.ok(screen.getByRole('heading', { name: 'Edit ink' }));
            assert.equal(screen.getByLabelText('Ink name').value, 'Happy Holidays');
            assert.equal(new URLSearchParams(appRouter.state.location.search).get('id'), 'ink-a');
            await user.click(screen.getByRole('button', { name: 'Back to pens' }));
            assert.equal(appRouter.state.location.search, returnUrl);
            assert.equal(screen.getByRole('button', { name: 'Inked', exact: true }).getAttribute('aria-pressed'), 'true');
            assert.equal(screen.getByRole('combobox', { name: 'Brand' }).value, 'Pilot');
        }
        assert.equal(writes.length, before);
    });
    await t.test(
        'empty pens can be queued independently, with saved flags in both layouts and archive exclusion',
        async () => {
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            await user.click(screen.getByRole('button', { name: 'All pens', exact: true }));
            await user.click(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket writer/,
                }),
            );
            assert.equal(
                screen.getByRole('checkbox', { name: 'Needs refill' }).checked,
                false,
            );
            const before = writes.length;
            await user.click(
                screen.getByRole('checkbox', { name: 'Needs refill' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Discard changes' }),
            );
            assert.equal(writes.length, before);
            await user.click(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket writer/,
                }),
            );
            await user.click(
                screen.getByRole('checkbox', { name: 'Needs refill' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Save changes' }),
            );
            assert.equal(
                latestWrite('pens').data.find(
                    (pen) => pen.brand === 'New maker',
                )?.needsRefill,
                true,
            );
            await user.click(
                screen.getByRole('button', { name: 'Empty', exact: true }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            assert.match(
                document.querySelector('.pen-card')!.textContent!,
                /Needs refill/,
            );
            await user.click(
                screen.getByRole('button', {
                    name: 'Needs refill',
                    exact: true,
                }),
            );
            await user.click(screen.getByRole('button', { name: 'List view' }));
            const table = screen.getByRole('table', { name: 'Pen inventory' });
            assert.equal(table.querySelectorAll('tbody tr').length, 1);
            assert.match(table.textContent!, /Needs refill.*Pocket writer/);
            assert.ok(table.querySelector('.pen-name-meta .refill-badge'));
            await user.click(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket writer/,
                }),
            );
            assert.equal(
                screen.getByRole('checkbox', { name: 'Needs refill' }).checked,
                true,
            );
            await user.click(screen.getByText('Manage this pen'));
            await user.click(
                screen.getByRole('button', { name: 'Archive pen' }),
            );
            assert.equal(
                screen.queryByRole('table', { name: 'Pen inventory' }),
                null,
            );
            await user.click(
                screen.getByRole('button', { name: 'Archived', exact: true }),
            );
            await user.click(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket writer/,
                }),
            );
            await user.click(screen.getByText('Manage this pen'));
            await user.click(
                screen.getByRole('button', { name: 'Restore to collection' }),
            );
            await user.click(
                screen.getByRole('button', {
                    name: 'Needs refill',
                    exact: true,
                }),
            );
            assert.ok(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket writer/,
                }),
            );
            await user.click(screen.getByRole('button', { name: 'Grid view' }));
        },
    );
    await t.test(
        'inked pens can be queued and historical journal changes do not clear their flags',
        async () => {
            await user.click(
                screen.getByRole('button', { name: 'Inked', exact: true }),
            );
            await user.click(
                screen.getByRole('button', { name: /Edit Pilot Falcon/ }),
            );
            await user.click(
                screen.getByRole('checkbox', { name: 'Needs refill' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Save changes' }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            await user.click(
                screen.getByRole('button', {
                    name: 'Needs refill',
                    exact: true,
                }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 2);
            const penWrites = writes.filter(
                (write) => write.filename === 'pens',
            ).length;
            await user.click(
                screen.getByRole('link', { name: 'Refill journal' }),
            );
            await user.type(
                screen.getByRole('searchbox', {
                    name: 'Search pens, inks, or notes…',
                }),
                'Revised original',
            );
            await user.click(
                within(document.querySelector('.journal')!).getByRole(
                    'button',
                    { name: /Edit Pilot Falcon entry/ },
                ),
            );
            await user.type(screen.getByLabelText('NotesOptional'), ' again');
            await user.click(
                screen.getByRole('button', { name: 'Save changes' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log a refill' }),
            );
            await user.click(
                screen.getByRole('radio', { name: /Pilot Falcon/ }),
            );
            fireEvent.change(screen.getByLabelText('Date'), {
                target: { value: '2024-01-01' },
            });
            await user.click(
                screen.getByRole('checkbox', { name: /Happy Holidays/ }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log refill', exact: true }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log a refill' }),
            );
            await user.click(
                screen.getByRole('radio', { name: /Pilot Falcon/ }),
            );
            await user.click(
                screen.getByRole('radio', { name: 'Cleaned & empty' }),
            );
            fireEvent.change(screen.getByLabelText('Date'), {
                target: { value: '2024-01-02' },
            });
            assert.equal(
                screen.queryByRole('checkbox', { name: 'Needs refill' }),
                null,
            );
            await user.click(
                screen.getByRole('button', { name: 'Log cleaning' }),
            );
            assert.equal(
                writes.filter((write) => write.filename === 'pens').length,
                penWrites,
            );
            assert.equal(
                latestWrite('pens').data.find((pen) => pen.id === 'pen-a')
                    ?.needsRefill,
                true,
            );
        },
    );
    await t.test(
        'current cleanings can leave a pen empty or queue it and a same-day refill clears only that pen',
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
            assert.equal(
                screen.getByRole('checkbox', { name: 'Needs refill' }).checked,
                true,
            );
            await user.click(
                screen.getByRole('checkbox', { name: 'Needs refill' }),
            );
            await user.click(
                screen.getByRole('radio', { name: /New maker Pocket writer/ }),
            );
            assert.equal(
                screen.getByRole('checkbox', { name: 'Needs refill' }).checked,
                true,
            );
            await user.click(
                screen.getByRole('radio', { name: /Pilot Falcon/ }),
            );
            assert.equal(
                screen.getByRole('checkbox', { name: 'Needs refill' }).checked,
                true,
            );
            await user.click(
                screen.getByRole('checkbox', { name: 'Needs refill' }),
            );
            await user.click(screen.getByRole('button', { name: 'New pen' }));
            await user.click(
                screen.getByRole('button', { name: 'Cancel', exact: true }),
            );
            assert.equal(
                screen.getByRole('checkbox', { name: 'Needs refill' }).checked,
                false,
            );
            await user.click(
                screen.getByRole('button', { name: 'Log cleaning' }),
            );
            assert.equal(
                latestWrite('pens').data.find((pen) => pen.id === 'pen-a')
                    ?.needsRefill,
                false,
            );
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Empty', exact: true }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 2);
            await user.click(
                screen.getByRole('button', {
                    name: 'Needs refill',
                    exact: true,
                }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            assert.ok(
                screen.getByRole('button', {
                    name: /Edit New maker Pocket writer/,
                }),
            );
            await user.click(
                screen.getByRole('link', { name: 'Refill journal' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log a refill' }),
            );
            await user.click(
                screen.getByRole('radio', { name: 'Cleaned & empty' }),
            );
            await user.click(
                screen.getByRole('radio', { name: /Pilot Falcon/ }),
            );
            assert.equal(
                screen.getByRole('checkbox', { name: 'Needs refill' }).checked,
                false,
            );
            await user.click(
                screen.getByRole('checkbox', { name: 'Needs refill' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log cleaning' }),
            );
            assert.equal(
                latestWrite('pens').data.find((pen) => pen.id === 'pen-a')
                    ?.needsRefill,
                true,
            );
            assert.deepEqual(
                Object.keys(latestWrite('refillLog').data.at(-1)!).sort(),
                ['date', 'inkIds', 'notes', 'penId'],
            );
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            await user.click(
                screen.getByRole('button', {
                    name: 'Needs refill',
                    exact: true,
                }),
            );
            const card = screen
                .getByRole('button', { name: /Edit Pilot Falcon/ })
                .closest('article')!;
            await user.click(
                within(card).getByRole('button', {
                    name: 'Refill',
                    exact: true,
                }),
            );
            await user.click(
                screen.getByRole('checkbox', { name: /Happy Holidays/ }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Log refill', exact: true }),
            );
            assert.equal(
                latestWrite('pens').data.find((pen) => pen.id === 'pen-a')
                    ?.needsRefill,
                false,
            );
            assert.equal(
                latestWrite('pens').data.find(
                    (pen) => pen.brand === 'New maker',
                )?.needsRefill,
                true,
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            await user.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );
        },
    );
    await t.test(
        'journal history never opens the next record after deletion and follows surviving entries when indices shift',
        async () => {
            await user.click(
                screen.getByRole('link', { name: 'Refill journal' }),
            );
            const search = () =>
                screen.getByRole('searchbox', {
                    name: 'Search pens, inks, or notes…',
                });
            const editEntry = () =>
                within(document.querySelector('.journal')!).getByRole(
                    'button',
                    { name: /Edit Pilot Falcon entry/ },
                );
            await user.type(search(), 'Test mixing notes');
            await user.click(editEntry());
            assert.match(appRouter.state.location.search, /id=1/);
            await user.click(
                screen.getByRole('link', { name: 'Refill journal' }),
            );
            await user.type(search(), 'Revised original');
            await user.click(editEntry());
            await user.click(
                screen.getByRole('button', { name: 'Delete this entry' }),
            );
            await user.click(
                screen.getByRole('button', {
                    name: 'Delete entry',
                    exact: true,
                }),
            );
            await act(async () => {
                await appRouter.navigate(1);
            });
            assert.ok(
                screen.getByRole('heading', {
                    name: 'This item is no longer available',
                }),
            );
            await act(async () => {
                await appRouter.navigate(-2);
            });
            assert.equal(
                screen.getByLabelText('NotesOptional').value,
                'Test mixing notes',
            );
            await user.type(
                screen.getByLabelText('NotesOptional'),
                ' after shifting',
            );
            await user.click(
                screen.getByRole('button', { name: 'Save changes' }),
            );
            assert.equal(
                latestWrite('refillLog').data[0].notes,
                'Test mixing notes after shifting',
            );
            await user.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );
        },
    );
    await t.test(
        'each inventory remembers its layout after the app remounts',
        async () => {
            cleanup();
            mountApp(['/inks']);
            await screen.findByRole('table', { name: 'Ink inventory' });
            assert.equal(
                screen
                    .getByRole('button', { name: 'List view' })
                    .getAttribute('aria-pressed'),
                'true',
            );
            await user.click(
                screen.getByRole('link', { name: /Fountain pens/ }),
            );
            assert.equal(document.querySelectorAll('.pen-card').length, 1);
            assert.equal(
                screen
                    .getByRole('button', { name: 'Grid view' })
                    .getAttribute('aria-pressed'),
                'true',
            );
        },
    );
    await t.test(
        'view-only mode retains browsing and disables inventory mutations',
        async () => {
            cleanup();
            localNetwork = false;
            const before = writes.length;
            mountApp(['/pens']);
            await screen.findByText(
                'Your collection is in view-only mode outside your home network.',
            );
            assert.equal(
                screen.queryByRole('button', { name: 'Add a pen' }),
                null,
            );
            await user.click(screen.getByRole('button', { name: 'View Diamine Happy Holidays' }));
            assert.ok(screen.getByRole('heading', { name: 'View ink' }));
            assert.ok(screen.getByLabelText('Ink name').closest('fieldset')?.disabled);
            await user.click(screen.getByRole('button', { name: 'Back to pens' }));
            await user.click(
                screen.getByRole('button', { name: /View Pilot Falcon/ }),
            );
            assert.ok(
                screen.getByLabelText('Brand').closest('fieldset')?.disabled,
            );
            assert.ok(
                screen
                    .getByRole('checkbox', { name: 'Needs refill' })
                    .closest('fieldset')?.disabled,
            );
            assert.equal(
                screen.queryByRole('button', { name: 'Save changes' }),
                null,
            );
            assert.equal(writes.length, before);
        },
    );
    await t.test(
        'layout selection still works when browser storage is blocked',
        async () => {
            cleanup();
            const prototype = dom.window.Storage.prototype;
            const originalGet = prototype.getItem;
            const originalSet = prototype.setItem;
            const before = writes.length;
            prototype.getItem = () => {
                throw new Error('Storage blocked');
            };
            prototype.setItem = () => {
                throw new Error('Storage blocked');
            };
            try {
                mountApp(['/pens']);
                await screen.findByRole('table', { name: 'Pen inventory' });
                await user.click(
                    screen.getByRole('button', { name: 'Grid view' }),
                );
                assert.equal(document.querySelectorAll('.pen-card').length, 1);
                assert.equal(
                    screen
                        .getByRole('button', { name: 'Grid view' })
                        .getAttribute('aria-pressed'),
                    'true',
                );
                assert.equal(
                    screen.queryByRole('button', {
                        name: 'Refill',
                        exact: true,
                    }),
                    null,
                );
                assert.equal(writes.length, before);
            } finally {
                cleanup();
                prototype.getItem = originalGet;
                prototype.setItem = originalSet;
            }
        },
    );
    await t.test(
        'direct editor URLs close safely and missing items remain recoverable',
        async () => {
            cleanup();
            mountApp(['/pens?editor=pen&id=pen-a']);
            await screen.findByRole('heading', { name: 'View pen' });
            await user.click(
                screen.getByRole('button', { name: 'Back to pens' }),
            );
            assert.equal(appRouter.state.location.search, '');
            await act(async () => {
                await appRouter.navigate('/inks?editor=ink&id=missing');
            });
            assert.ok(
                screen.getByRole('heading', {
                    name: 'This item is no longer available',
                }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Back to the collection' }),
            );
            assert.equal(appRouter.state.location.search, '');
        },
    );
    await t.test(
        'native hash history Back and Forward keep the editor and address in sync',
        async () => {
            cleanup();
            appRouter.dispose();
            localNetwork = true;
            window.history.replaceState(null, '', '/#/pens?brand=Pilot');
            appRouter = createHashRouter([{ path: '*', element: <App /> }]);
            render(
                <LocalNetworkProvider>
                    <DirtyStateProvider>
                        <RouterProvider router={appRouter} />
                    </DirtyStateProvider>
                </LocalNetworkProvider>,
            );
            const step = async (delta: number) => {
                await act(async () => {
                    window.history.go(delta);
                    await new Promise((resolve) => setTimeout(resolve, 30));
                });
            };
            await user.click(
                await screen.findByRole('button', {
                    name: /Edit Pilot Falcon/,
                }),
            );
            assert.match(window.location.hash, /editor=pen/);
            await step(-1);
            assert.equal(window.location.hash, '#/pens?brand=Pilot');
            assert.equal(
                screen.queryByRole('heading', { name: 'Edit pen' }),
                null,
            );
            await step(1);
            assert.ok(screen.getByRole('heading', { name: 'Edit pen' }));
            await user.type(screen.getByLabelText('Model'), ' unfinished');
            await step(-1);
            assert.ok(screen.getByRole('alert'));
            await user.click(
                screen.getByRole('button', { name: 'Keep editing' }),
            );
            assert.match(window.location.hash, /editor=pen/);
            assert.equal(
                screen.getByLabelText('Model').value,
                'Falcon unfinished',
            );
            await step(-1);
            await user.click(
                screen.getByRole('button', { name: 'Discard changes' }),
            );
            await waitFor(() =>
                assert.equal(window.location.hash, '#/pens?brand=Pilot'),
            );
            await waitFor(() =>
                assert.equal(
                    screen.queryByRole('heading', { name: 'Edit pen' }),
                    null,
                ),
            );
        },
    );
    cleanup();
    appRouter.dispose();
    await waitFor(() =>
        assert.equal(document.querySelector('.app-shell'), null),
    );
    dom.window.close();
});
