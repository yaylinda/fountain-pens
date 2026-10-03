import { useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Ink } from '../../models/types';
import { inkLabel } from '../../lib/collection';
import { movePalette, reconcilePalette, type PaletteItem } from '../../lib/deskPalette';
import { saveDeskPalette } from '../../services/dataService';
import { FavoriteMark, Swatch } from './Primitives';

interface Props {
    inks: Ink[];
    saved: PaletteItem[];
    canEdit: boolean;
    selectedInk: string;
    onSelect: (id: string) => void;
    refills: Map<string, number>;
}
function SortableInk({ ink, index, count, move, omit, disabled }: {
    ink: Ink; index: number; count: number; move: (offset: number) => void; omit: () => void; disabled: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ink.id, disabled });
    return <li ref={setNodeRef} className={`palette-tile ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
        <div className="palette-tile-top"><span className="palette-position">{index + 1}</span>
            <button className="palette-handle" {...attributes} {...listeners} disabled={disabled} aria-label={`Drag ${inkLabel(ink)}`}>⠿</button>
        </div>
        <Swatch ink={ink} large />
        <strong>{ink.name}</strong><span className="small muted">{[ink.brand, ink.collection].filter(Boolean).join(' · ')}</span>
        <div className="palette-tile-actions">
            <button disabled={disabled || index === 0} onClick={() => move(-1)} aria-label={`Move ${inkLabel(ink)} earlier`}>←</button>
            <button disabled={disabled || index === count - 1} onClick={() => move(1)} aria-label={`Move ${inkLabel(ink)} later`}>→</button>
            <button disabled={disabled} onClick={omit} aria-label={`Omit ${inkLabel(ink)}`}>Omit</button>
        </div>
    </li>;
}
export default function DeskPalette({ inks, saved, canEdit, selectedInk, onSelect, refills }: Props) {
    const [draft, setDraft] = useState<PaletteItem[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const arrangeButton = useRef<HTMLButtonElement>(null);
    const editing = canEdit && draft !== null;
    const items = reconcilePalette(editing ? draft : saved, inks);
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
    const save = async () => {
        setBusy(true); setError('');
        try { await saveDeskPalette(items); close(); setNotice('Palette saved.'); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not save the palette. Try again.'); }
        finally { setBusy(false); }
    };
    return <section className="desk-palette custom-palette" aria-label="Current ink palette">
        <div className="section-heading">
            <div><p className="eyebrow">Currently inked · personally arranged</p><h2>Your palette <span className="count">{visible.length}</span></h2></div>
            {canEdit && !editing && <button ref={arrangeButton} className="button subtle" onClick={() => { setDraft(reconcilePalette(saved, inks)); setNotice(''); requestAnimationFrame(() => document.getElementById('palette-save')?.focus()); }}>Arrange palette</button>}
        </div>
        <p className="small muted">A color arrangement, separate from your inked pens. Omitting a color keeps its pens and refill history intact.</p>
        {editing && <div className="palette-edit-toolbar">
            <p id="palette-help">Drag a handle or use the arrow buttons to reorder. With a keyboard, press Space on a handle, use arrow keys, then Space to drop or Escape to cancel.</p>
            <div className="palette-save-actions"><button id="palette-save" className="button primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save palette'}</button><button className="button subtle" disabled={busy} onClick={close}>Cancel</button></div>
        </div>}
        {error && <p role="alert">{error} Your arrangement is still here.</p>}
        <span className="small muted" role="status">{notice}</span>
        {editing ? <DndContext accessibility={{ announcements: {
            onDragStart: ({ active }) => `Picked up ${inkLabel(byId.get(String(active.id)))}.`,
            onDragOver: ({ active, over }) => over ? `${inkLabel(byId.get(String(active.id)))} over ${inkLabel(byId.get(String(over.id)))}.` : undefined,
            onDragEnd: ({ active, over }) => over ? `${inkLabel(byId.get(String(active.id)))} dropped at position ${visible.findIndex(item => item.inkId === over.id) + 1}.` : 'Move canceled.',
            onDragCancel: () => 'Move canceled.',
        } }} sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (over && active.id !== over.id) move(String(active.id), String(over.id)); }}>
            <SortableContext items={visible.map(item => item.inkId)} strategy={rectSortingStrategy}>
                <ol className="palette-grid" aria-label="Palette order" aria-describedby="palette-help">{visible.map((item, index) => <SortableInk key={item.inkId} ink={byId.get(item.inkId)!} index={index} count={visible.length} disabled={busy} move={offset => move(item.inkId, visible[index + offset].inkId)} omit={() => toggle(item.inkId, true)} />)}</ol>
            </SortableContext>
        </DndContext> : <div className="palette-grid palette-view">{visible.map(item => {
            const ink = byId.get(item.inkId)!;
            const refillCount = refills.get(ink.id) || 0;
            return <button key={ink.id} className="palette-color" aria-pressed={selectedInk === ink.id} aria-label={`Filter to ${inkLabel(ink)}${refillCount ? ` · ${refillCount} ${refillCount === 1 ? 'pen needs' : 'pens need'} refill` : ''}`} onClick={() => onSelect(selectedInk === ink.id ? '' : ink.id)}>
                <span className="desk-palette-swatch"><Swatch ink={ink} large />{refillCount > 0 && <span className="badge refill-badge desk-palette-refill">{refillCount}</span>}</span>
                <strong>{ink.name}<FavoriteMark item={ink} /></strong><span className="small muted">{[ink.brand, ink.collection].filter(Boolean).join(' · ')}</span>
            </button>;
        })}</div>}
        {!visible.length && <p className="palette-empty">{inks.length ? 'Every current color is omitted. Your inked pens are still listed below.' : 'Log a refill to bring colors to your palette.'}</p>}
        {!!omitted.length && <details className="palette-omitted" open={editing || undefined}><summary>Omitted colors · {omitted.length}</summary><ul>{omitted.map(item => {
            const ink = byId.get(item.inkId)!;
            return <li key={ink.id}><Swatch ink={ink} /><span>{inkLabel(ink)}</span>{editing ? <button className="button subtle" disabled={busy} onClick={() => toggle(ink.id, false)}>Restore {ink.name}</button> : <button className="text-link" onClick={() => onSelect(ink.id)}>See pens</button>}</li>;
        })}</ul></details>}
        {!editing && <p className="small muted">Select a color to see its pens. Swatches are approximate; mixed refills show their component inks.</p>}
        {selectedInk && <button className="text-link" onClick={() => onSelect('')}>Show all colors</button>}
    </section>;
}
