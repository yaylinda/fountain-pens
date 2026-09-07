import type { CSSProperties, ReactNode } from 'react';
import type { Ink } from '../../models/types';
import { HoverDetails } from './HoverDetails';
import {
    getSwatch,
    type CollectionModel,
    type JournalEntry,
    penLabel,
    formatDate,
    isCleaning,
    realInkIds,
} from '../../lib/collection';

export type IconName =
    | 'star'
    | 'desk'
    | 'list'
    | 'pen'
    | 'ink'
    | 'journal'
    | 'plus'
    | 'search'
    | 'arrow'
    | 'back'
    | 'close'
    | 'check'
    | 'edit'
    | 'archive';
const paths: Record<IconName, ReactNode> = {
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    list: <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01" />,
    desk: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
    ),
    pen: (
        <>
            <path d="m12 3 7 10-7 8-7-8 7-10Z" />
            <path d="M12 3v10m-4 4h8" />
            <circle cx="12" cy="13" r="1.5" />
        </>
    ),
    ink: (
        <>
            <path d="M9 3h6v4H9zM8 7l-3 4v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8l-3-4M5 12h14" />
            <path d="M10 16h4" />
        </>
    ),
    journal: (
        <>
            <path d="M6 3h13v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 0v18M11 8h5m-5 4h5" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
        <>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
        </>
    ),
    arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
    back: <path d="M20 12H5m5-5-5 5 5 5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    edit: (
        <>
            <path d="m15 4 5 5-11 11H4v-5L15 4ZM12 7l5 5" />
        </>
    ),
    archive: (
        <>
            <path d="M4 8h16v13H4zM3 3h18v5H3zM9 12h6" />
        </>
    ),
};
export function Icon({
    name,
    className = '',
}: {
    name: IconName;
    className?: string;
}) {
    return (
        <svg
            className={`icon ${className}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    );
}
export function FavoriteMark({ item }: { item?: { favorite?: boolean } }) {
    return item?.favorite ? (
        <span className="favorite-mark" role="img" aria-label="Favorite" title="Favorite">
            <Icon name="star" />
        </span>
    ) : null;
}
export function Swatch({
    ink,
    large = false,
    showTitle = true,
}: {
    ink?: Ink;
    large?: boolean;
    showTitle?: boolean;
}) {
    const swatch = getSwatch(ink);
    return (
        <span
            className={`swatch ${large ? 'swatch-large' : ''} ${swatch ? '' : 'swatch-unknown'}`}
            style={
                swatch
                    ? ({ '--swatch': swatch.hex } as CSSProperties)
                    : undefined
            }
            title={
                showTitle
                    ? swatch
                        ? `${ink?.name} · ${swatch.source}`
                        : 'No color recorded'
                    : undefined
            }
            aria-hidden="true"
        >
            {!swatch && <span>?</span>}
        </span>
    );
}
export function InkNames({
    entry,
    model,
    details = false,
    onOpenInk,
}: {
    entry?: JournalEntry;
    model: CollectionModel;
    details?: boolean;
    onOpenInk?: (ink: Ink) => void;
}) {
    if (!entry) return <span className="muted">No ink recorded</span>;
    if (isCleaning(entry))
        return <span className="muted">Cleaned & empty</span>;
    return (
        <span className="ink-names">
            {realInkIds(entry).map((id) => {
                const ink = model.inkById.get(id);
                return details && ink ? (
                    <HoverDetails
                        key={id}
                        label={onOpenInk
                            ? `View ${ink.brand} ${ink.name}`
                            : `Ink details for ${ink.brand} ${ink.name}`}
                        onActivate={onOpenInk ? () => onOpenInk(ink) : undefined}
                        details={
                            <>
                                <span className="overline">{ink.brand}</span>
                                <strong className="detail-name">
                                    {ink.name}
                                </strong>
                                <span className="small muted">
                                    {ink.collection || 'Standard collection'}
                                </span>
                            </>
                        }
                    >
                        <Swatch ink={ink} showTitle={false} />
                        <span>{ink.name}<FavoriteMark item={ink} /></span>
                    </HoverDetails>
                ) : (
                    <span key={id}>
                        <Swatch ink={ink} />
                        {ink?.name || 'Ink no longer in inventory'}<FavoriteMark item={ink} />
                    </span>
                );
            })}
        </span>
    );
}
export function EmptyState({
    title,
    children,
    action,
}: {
    title: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="empty-state">
            <span className="empty-mark" aria-hidden="true">
                ∴
            </span>
            <h2>{title}</h2>
            <p>{children}</p>
            {action}
        </div>
    );
}
export function SearchField({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div className="search-field">
            <Icon name="search" />
            <input
                type="search"
                aria-label={placeholder}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') event.preventDefault();
                }}
            />
            {value && (
                <button
                    type="button"
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => onChange('')}
                >
                    <Icon name="close" />
                </button>
            )}
        </div>
    );
}
export function EntryRows({
    entries,
    model,
    onEdit,
    limit,
}: {
    entries: JournalEntry[];
    model: CollectionModel;
    onEdit: (entry: JournalEntry) => void;
    limit?: number;
}) {
    return (
        <div className="entry-list">
            {entries.slice(0, limit).map((entry) => (
                <button
                    className="entry-row"
                    key={entry.index}
                    onClick={() => onEdit(entry)}
                >
                    <time dateTime={entry.date}>
                        {formatDate(entry.date, true)}
                    </time>
                    <span className="entry-description">
                        <strong>
                            {penLabel(model.penById.get(entry.penId))}<FavoriteMark item={model.penById.get(entry.penId)} />
                        </strong>
                        <InkNames entry={entry} model={model} />
                        {entry.notes && (
                            <span className="entry-note">{entry.notes}</span>
                        )}
                    </span>
                    <Icon name="arrow" />
                </button>
            ))}
        </div>
    );
}
