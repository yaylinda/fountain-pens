import { useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Ink } from '../../models/types';
import { inkLabel } from '../../lib/collection';
import { movePalette, reconcilePalette, type DeskArrangement, type PaletteItem } from '../../lib/deskPalette';
import { deleteNamedPalette, saveNamedPalette } from '../../services/dataService';
import { FavoriteMark, Swatch } from './Primitives';

interface Props {
    inks: Ink[];
    saved: PaletteItem[];
    palettes: DeskArrangement[];
    activeId: string;
    onPaletteChange: (id: string) => void;
    penCounts: Map<string, number>;
    canEdit: boolean;
    selectedInk: string;
    onSelect: (id: string) => void;
    refills: Map<string, number>;
}
function SortableInk({ ink, index, omit, disabled }: {
    ink: Ink; index: number; omit: () => void; disabled: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ink.id, disabled });
    return <li ref={setNodeRef} className={`palette-tile ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
        <div className="palette-tile-top"><span className="palette-position">{index + 1}</span>
            <button className="palette-handle" {...attributes} {...listeners} disabled={disabled} aria-label={`Drag ${inkLabel(ink)}`}>⠿</button>
        </div>
        <Swatch ink={ink} large />
        <strong>{ink.name}</strong><span className="small muted">{[ink.brand, ink.collection].filter(Boolean).join(' · ')}</span>
        <div className="palette-tile-actions">
            <button disabled={disabled} onClick={omit} aria-label={`Omit ${inkLabel(ink)}`}>Omit</button>
        </div>
    </li>;
}
export default function DeskPalette({ inks, saved, palettes, activeId, onPaletteChange, penCounts, canEdit, selectedInk, onSelect, refills }: Props) {
    const arrangements = palettes.length ? palettes : [{ id: 'default', name: 'My palette', items: saved }];
    const active = arrangements.find(p => p.id === activeId) || arrangements[0];
    const [draftName, setDraftName] = useState('');
    const [draftId, setDraftId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [draft, setDraft] = useState<PaletteItem[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const arrangeButton = useRef<HTMLButtonElement>(null);
    const actionsMenu = useRef<HTMLDetailsElement>(null);
    const editing = canEdit && draft !== null;
    const creating = editing && draftId === null;
    const items = reconcilePalette(editing ? draft : active.items, inks);
    const byId = new Map(inks.map(ink => [ink.id, ink]));
    const visible = items.filter(item => !item.omitted && byId.has(item.inkId));
    const omitted = items.filter(item => item.omitted && byId.has(item.inkId));
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const move = (from: string, to: string) => {
        setDraft(movePalette(items, from, to));
        setNotice(`${inkLabel(byId.get(from))} moved.`);
    };
    const toggle = (id: string, omit: boolean) => {
        setDraft(items.map(item => item.inkId === id ? { ...item, omitted: omit } : item));
        setNotice(`${inkLabel(byId.get(id))} ${omit ? 'omitted from' : 'restored to'} the palette.`);
        // The initiating control is removed. Keep keyboard users at a stable editor control.
        requestAnimationFrame(() => document.getElementById('palette-save')?.focus());
    };
    const close = () => { setDraft(null); setError(''); requestAnimationFrame(() => arrangeButton.current?.focus()); };
    const begin = (mode: 'edit' | 'new' | 'copy') => {
        if (actionsMenu.current) actionsMenu.current.open = false;
        setDraftId(mode === 'edit' ? active.id : null);
        setDraftName(mode === 'edit' ? active.name : mode === 'copy' ? `${active.name.slice(0, 73)} (copy)` : '');
        setDraft(reconcilePalette(mode === 'new' ? [] : active.items, inks));
        setError(''); setNotice(''); setConfirmDelete(false); onSelect('');
        requestAnimationFrame(() => document.getElementById('palette-name')?.focus());
    };
    const save = async () => {
        setBusy(true); setError('');
        try { const result = await saveNamedPalette(draftId, draftName.trim(), items); close(); onPaletteChange(result.id); setNotice('Palette saved.'); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not save the palette. Try again.'); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        setBusy(true); setError('');
        try {
            await deleteNamedPalette(active.id);
            setConfirmDelete(false);
            onPaletteChange(arrangements.find(p => p.id !== active.id)?.id || 'default');
            setNotice('Palette deleted. Your inks and pens are unchanged.');
            requestAnimationFrame(() => document.getElementById('palette-select')?.focus());
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the palette. Try again.'); }
        finally { setBusy(false); }
    };
    return <section className="desk-palette custom-palette" aria-label="Current ink palette">
        <div className="palette-library">
            {editing ? <>
                <div className="palette-selection">
                    <label htmlFor="palette-name">Palette name</label>
                    <div><input id="palette-name" value={draftName} maxLength={80} disabled={busy} placeholder={creating ? 'New palette name' : 'Palette name'} onChange={e => setDraftName(e.target.value)} /><span className="palette-color-count">Unsaved · {visible.length} colors</span></div>
                </div>
                <div className="palette-save-actions"><button id="palette-save" className="button primary" disabled={busy || !draftName.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save palette'}</button><button className="button secondary" disabled={busy} onClick={close}>Cancel</button></div>
            </> : <>
                <div className="palette-selection">
                    <label htmlFor="palette-select">Saved palette</label>
                    <div><select id="palette-select" value={active.id} disabled={busy || confirmDelete} onChange={e => { onPaletteChange(e.target.value); setNotice(''); setError(''); }}>
                        {arrangements.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select><span className="palette-color-count">{visible.length} colors</span></div>
                </div>
                {canEdit && <div className="palette-library-actions">
                    <button ref={arrangeButton} className="button primary small-button" disabled={busy || confirmDelete} onClick={() => begin('edit')}>Arrange palette</button>
                    <button className="button secondary small-button" disabled={busy || confirmDelete} onClick={() => begin('new')}>New palette</button>
                    <details className="palette-actions-menu" ref={actionsMenu} onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false; }}>
                        <summary aria-label="More palette actions">•••</summary>
                        <div className="palette-actions-popover">
                            <button disabled={busy || confirmDelete} onClick={() => begin('copy')}>Duplicate</button>
                            {palettes.some(p => p.id === active.id) && <button className="palette-delete-action" disabled={busy || confirmDelete} onClick={() => { if (actionsMenu.current) actionsMenu.current.open = false; setConfirmDelete(true); setError(''); }}>Delete palette</button>}
                        </div>
                    </details>
                </div>}
            </>}
        </div>
        {confirmDelete && <div className="palette-delete" role="group" aria-label="Delete palette confirmation">
            <p>Delete “{active.name}”? Only this arrangement will be removed.</p>
            <button className="button primary" disabled={busy} onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete arrangement'}</button>
            <button className="button subtle" disabled={busy} onClick={() => { setConfirmDelete(false); setError(''); }}>Keep palette</button>
        </div>}
        {!editing && <p className="small muted">Select a color to see its pens.</p>}
        {error && <p role="alert">{error} {editing ? 'Your arrangement is still here.' : ''}</p>}
        <span className="small muted" role="status">{notice}</span>
        {editing ? <DndContext accessibility={{ announcements: {
            onDragStart: ({ active }) => `Picked up ${inkLabel(byId.get(String(active.id)))}.`,
            onDragOver: ({ active, over }) => over ? `${inkLabel(byId.get(String(active.id)))} over ${inkLabel(byId.get(String(over.id)))}.` : undefined,
            onDragEnd: ({ active, over }) => over ? `${inkLabel(byId.get(String(active.id)))} dropped at position ${visible.findIndex(item => item.inkId === over.id) + 1}.` : 'Move canceled.',
            onDragCancel: () => 'Move canceled.',
        } }} sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (over && active.id !== over.id) move(String(active.id), String(over.id)); }}>
            <SortableContext items={visible.map(item => item.inkId)} strategy={rectSortingStrategy}>
                <ol className="palette-grid" aria-label="Palette order">{visible.map((item, index) => <SortableInk key={item.inkId} ink={byId.get(item.inkId)!} index={index} disabled={busy} omit={() => toggle(item.inkId, true)} />)}</ol>
            </SortableContext>
        </DndContext> : <div className="palette-grid palette-view">{visible.map(item => {
            const ink = byId.get(item.inkId)!;
            const penCount = penCounts.get(ink.id) || 0;
            const refillCount = refills.get(ink.id) || 0;
            return <button key={ink.id} className="palette-color" aria-pressed={selectedInk === ink.id} aria-label={`Filter to ${inkLabel(ink)}${refillCount ? ` · ${refillCount} ${refillCount === 1 ? 'pen needs' : 'pens need'} refill` : ''}`} onClick={() => onSelect(selectedInk === ink.id ? '' : ink.id)}>
                <span className="desk-palette-swatch"><Swatch ink={ink} large />{refillCount > 0 && <span className="badge refill-badge desk-palette-refill">{refillCount}</span>}</span>
                <strong>{ink.name}<FavoriteMark item={ink} /></strong><span className="small muted">{[ink.brand, ink.collection].filter(Boolean).join(' · ')}</span><span className="palette-pen-count">{penCount} {penCount === 1 ? 'pen' : 'pens'}</span>
            </button>;
        })}</div>}
        {!visible.length && <p className="palette-empty">{inks.length ? 'Every current color is omitted. Restore colors below to bring them back.' : 'Log a refill to bring colors to your palette.'}</p>}
        {!!omitted.length && <details className="palette-omitted" open={editing || undefined}><summary>Omitted colors · {omitted.length}</summary><ul>{omitted.map(item => {
            const ink = byId.get(item.inkId)!;
            return <li key={ink.id}><Swatch ink={ink} /><span>{inkLabel(ink)}</span>{editing ? <button className="button subtle" disabled={busy} onClick={() => toggle(ink.id, false)}>Restore {ink.name}</button> : <button className="text-link" onClick={() => onSelect(ink.id)}>See pens</button>}</li>;
        })}</ul></details>}
        {selectedInk && <button className="text-link" onClick={() => onSelect('')}>Close pen details</button>}
    </section>;
}
