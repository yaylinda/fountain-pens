import { NavLink } from 'react-router-dom';
import { Icon } from './Primitives';

export default function CollectionTabs({ targets, pens, inks }: {
    targets: { pens: string; inks: string }; pens: number; inks: number;
}) {
    return <nav className="collection-tabs" aria-label="Collection sections">
        <NavLink to={targets.pens}><Icon name="pen" /><span>Pens</span><span className="count">{pens}</span></NavLink>
        <NavLink to={targets.inks}><Icon name="ink" /><span>Inks</span><span className="count">{inks}</span></NavLink>
    </nav>;
}
