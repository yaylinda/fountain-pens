import { useEffect, useRef, type ReactNode } from 'react';
import type { Ink, Pen } from '../../models/types';
import type {
    Collection,
    CollectionModel,
    EditorState,
} from '../../lib/collection';
import { Icon } from './Primitives';

export interface EditorProps {
    collection: Collection;
    model: CollectionModel;
    canEdit: boolean;
    onClose: () => void;
    onDirty: (value: boolean) => void;
    onSaved: (message: string, item?: Pen | Ink) => void;
    onOpen: (editor: EditorState) => void;
    backLabel: string;
}
export function Field({
    label,
    optional,
    children,
}: {
    label: string;
    optional?: boolean;
    children: ReactNode;
}) {
    return (
        <label className="field">
            <span>
                {label}
                {optional && <span className="optional">Optional</span>}
            </span>
            {children}
        </label>
    );
}
export function ErrorMessage({ message }: { message: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (message) ref.current?.focus();
    }, [message]);
    return message ? (
        <div ref={ref} tabIndex={-1} className="form-error" role="alert">
            {message}
        </div>
    ) : null;
}
export function EditorHeading({
    label,
    title,
    onClose,
}: {
    label: string;
    title: string;
    onClose: () => void;
}) {
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => heading.current?.focus(), []);
    return (
        <header className="editor-heading">
            <button className="text-link" onClick={onClose}>
                <Icon name="back" />
                Back to {label}
            </button>
            <h1 ref={heading} tabIndex={-1}>
                {title}
            </h1>
        </header>
    );
}
