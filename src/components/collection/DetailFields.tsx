import type { SourceLink } from '../../models/types';
import { Field } from './EditorFields';

const sourceTopics = (topics: string[]) => topics.map(topic => topic.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\./g, ' · ').toLowerCase()).join(', ');

export function DetailFields({ details, sources, onDetails, onSources }: {
    details: string; sources: SourceLink[];
    onDetails: (value: string) => void; onSources: (value: SourceLink[]) => void;
}) {
    const change = (index: number, key: 'label' | 'url', value: string) =>
        onSources(sources.map((source, i) => i === index ? { ...source, [key]: value } : source));
    return <details className="collection-detail-fields">
        <summary>Details & links</summary>
        <div className="detail-fields-content">
            <Field label="Description" optional>
                <textarea rows={5} value={details} onChange={event => onDetails(event.target.value)} />
            </Field>
            <p className="field-hint">Add a product page or source. These details are visible to everyone.</p>
            {sources.map((source, index) => <div className="source-editor" key={index}>
                <div className="field-pair">
                    <Field label={`Link ${index + 1} label`}><input value={source.label} onChange={event => change(index, 'label', event.target.value)} placeholder="e.g. Manufacturer product page" /></Field>
                    <Field label={`Link ${index + 1} URL`}><input type="url" value={source.url} onChange={event => change(index, 'url', event.target.value)} placeholder="https://" /></Field>
                </div>
                {source.supports?.length ? <p className="field-hint">Documents: {sourceTopics(source.supports)}</p> : null}
                <button type="button" className="text-link" onClick={() => onSources(sources.filter((_, i) => i !== index))}>Remove link {index + 1}</button>
            </div>)}
            <button type="button" className="button secondary" onClick={() => onSources([...sources, { label: '', url: '' }])}>Add link</button>
        </div>
    </details>;
}

export function SourceLinks({ sources }: { sources: SourceLink[] }) {
    return <ul>{sources.map((source, index) => <li key={index}>
        <a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>
        {source.supports?.length ? <span className="small muted"> — {sourceTopics(source.supports)}</span> : null}
    </li>)}</ul>;
}

export function PenDetails({ details, sources }: { details?: string; sources?: SourceLink[] }) {
    if (!details && !sources?.length) return null;
    return <section className="ink-story ink-story-expanded" aria-label="Pen details & links">
        <h2>Details & links</h2>
        <div className="ink-story-content">
            {details && <p className="ink-story-description">{details}</p>}
            {!!sources?.length && <SourceLinks sources={sources} />}
        </div>
    </section>;
}
