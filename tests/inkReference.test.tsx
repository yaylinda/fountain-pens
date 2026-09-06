import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { deriveCollection } from '../src/lib/collection';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Element', 'MutationObserver']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { render, screen, within, cleanup } = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const { default: InkInventory } = await import('../src/components/collection/InkInventory');
const { InkStory } = await import('../src/components/collection/InkStory');
const { default: Inventory } = await import('../src/components/collection/Inventory');
const { MemoryRouter } = await import('react-router-dom');
const mermaid = {
    id: '5400c69c-d66a-4e64-8d53-9f1b05124a15',
    brand: 'Wearingeul', name: 'The Little Mermaid', collection: '',
};

test('ink stories open independently of editing in both inventory layouts', async () => {
    const user = userEvent.setup({ document: dom.window.document });
    let opens = 0;
    const inks = [mermaid, { id: 'other', brand: 'Other', name: 'Blue', collection: '' }];
    const model = deriveCollection({ inks, pens: [], entries: [] });
    try {
        for (const layout of ['grid', 'list'] as const) {
            render(<InkInventory inks={inks} layout={layout} model={model} canEdit={false} onOpen={() => opens++} />);
            const summary = screen.getByText('Story & details', { selector: 'summary' });
            const details = summary.closest('details')!;
            assert.equal(details.open, false);
            assert.equal(document.querySelectorAll('.ink-story').length, 1);
            await user.click(summary);
            assert.equal(details.open, true);
            assert.equal(opens, 0);
            assert.ok(within(details).getByText('Hans Christian Andersen'));
            assert.ok(within(details).getByText('100 / 177 / 191'));
            assert.ok(within(details).getByText('7709U'));
            assert.ok(within(details).getByText(/Sea-aquamarine/));
            const sources = within(details).getByText('Sources & notes');
            await user.click(sources);
            assert.equal(sources.closest('details')!.open, true);
            assert.equal(within(details).getByRole('link', { name: 'Wearingeul product page ↗' }).getAttribute('href'), 'https://www.wearingeul.com/all/?idx=1376');
            await user.click(summary);
            assert.equal(details.open, false);
            cleanup();
        }
        render(<InkStory ink={mermaid} expanded />);
        assert.ok(screen.getByRole('region', { name: 'Behind the ink' }));
        assert.ok(screen.getByText('195WGBU'));
        cleanup();
        render(<InkStory ink={{ ...mermaid, id: '29e98327-ff17-4f74-a17b-4cf86d7cb160', name: 'Twelfth Night' }} expanded />);
        assert.equal(screen.getAllByText('Not verified').length, 2);
        assert.ok(screen.getByText('William Shakespeare'));
        cleanup();
        render(
            <MemoryRouter>
                <Inventory kind="inks" collection={{ inks, pens: [], entries: [] }} model={model} canEdit={false} onOpen={() => opens++} />
            </MemoryRouter>,
        );
        const search = screen.getByRole('searchbox');
        await user.type(search, 'Andersen silver');
        assert.ok(screen.getByText('1 inks found'));
        assert.ok(screen.getByRole('button', { name: 'View Wearingeul The Little Mermaid' }));
        await user.clear(search);
        await user.type(search, 'unmatched author');
        assert.ok(screen.getByRole('heading', { name: 'No matches on this shelf' }));
    } finally {
        cleanup();
        dom.window.close();
    }
});
