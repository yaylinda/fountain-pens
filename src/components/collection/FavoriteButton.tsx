import { useContext } from 'react';
import type { Ink, Pen } from '../../models/types';
import { FavoritesContext } from '../../context/FavoritesContext';
import { inkLabel, penLabel } from '../../lib/collection';
import { FavoriteMark, Icon } from './Primitives';

export function FavoriteButton({ item, kind }: { item: Pen | Ink; kind: 'pen' | 'ink' }) {
    const { canEdit, busy, toggle } = useContext(FavoritesContext);
    if (!canEdit) return <FavoriteMark item={item} />;
    const name = kind === 'pen' ? penLabel(item as Pen) : inkLabel(item as Ink);
    const label = `${item.favorite ? 'Remove' : 'Add'} ${name} ${item.favorite ? 'from' : 'to'} favorites`;
    return (
        <button type="button" className="favorite-button" aria-label={label}
            title={label} aria-pressed={!!item.favorite} disabled={busy}
            onClick={() => toggle(kind, item.id)}>
            <Icon name="star" />
        </button>
    );
}
