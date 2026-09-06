import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/** A small read-only preview, available on hover, keyboard focus, or tap. */
export function HoverDetails({
    label,
    children,
    details,
    className = '',
    onActivate,
}: {
    label: string;
    children: ReactNode;
    details: ReactNode;
    className?: string;
    onActivate?: () => void;
}) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pinned = useRef(false);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const cancelClose = () => clearTimeout(timer.current);
    const show = () => {
        cancelClose();
        setOpen(true);
    };
    const hide = useCallback(() => {
        clearTimeout(timer.current);
        pinned.current = false;
        setOpen(false);
    }, []);
    const closeSoon = () => {
        cancelClose();
        if (!pinned.current && document.activeElement !== trigger.current)
            timer.current = setTimeout(() => setOpen(false), 140);
    };
    useEffect(() => () => clearTimeout(timer.current), []);
    useEffect(() => {
        if (!open) return;
        const dismiss = (event: PointerEvent) => {
            if (
                !trigger.current?.contains(event.target as Node) &&
                !panel.current?.contains(event.target as Node)
            )
                hide();
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') hide();
        };
        document.addEventListener('pointerdown', dismiss);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', dismiss);
            document.removeEventListener('keydown', escape);
        };
    }, [open, hide]);
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            if (!trigger.current || !panel.current) return;
            const anchor = trigger.current.getBoundingClientRect();
            const preview = panel.current.getBoundingClientRect();
            const below = anchor.bottom + 8;
            setPosition({
                top: Math.max(
                    12,
                    Math.min(
                        below + preview.height <= window.innerHeight - 12
                            ? below
                            : anchor.top - preview.height - 8,
                        window.innerHeight - preview.height - 12,
                    ),
                ),
                left: Math.max(
                    12,
                    Math.min(
                        anchor.left,
                        window.innerWidth - preview.width - 12,
                    ),
                ),
            });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);
    return (
        <>
            <button
                ref={trigger}
                type="button"
                className={`detail-trigger ${className}`}
                aria-label={label}
                aria-describedby={open ? id : undefined}
                onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch') show();
                }}
                onPointerLeave={closeSoon}
                onFocus={show}
                onBlur={closeSoon}
                onClick={() => {
                    if (onActivate) {
                        hide();
                        onActivate();
                        return;
                    }
                    if (pinned.current) hide();
                    else {
                        pinned.current = true;
                        show();
                    }
                }}
            >
                {children}
            </button>
            {open &&
                createPortal(
                    <div
                        ref={panel}
                        id={id}
                        role="tooltip"
                        className="hover-details"
                        style={position}
                        onPointerEnter={cancelClose}
                        onPointerLeave={closeSoon}
                    >
                        {details}
                    </div>,
                    document.body,
                )}
        </>
    );
}
