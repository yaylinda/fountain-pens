/** A tiny event bridge; artwork is imported only after a confirmed save. */
export const SAVE_CELEBRATION = 'ink-and-nib:saved';
export interface SaveOrigin { x: number; y: number }
export function captureSaveOrigin(): SaveOrigin {
    const active = document.activeElement;
    const control = active?.matches('button, input[type=submit]') ? active
        : active?.closest('form')?.querySelector('button[type=submit], input[type=submit]');
    const rect = control?.getBoundingClientRect();
    return rect && rect.width ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
        : { x: window.innerWidth - 90, y: window.innerHeight - 50 };
}
export function celebrateSave(origin: SaveOrigin) {
    window.dispatchEvent(new window.CustomEvent(SAVE_CELEBRATION, { detail: origin }));
}
