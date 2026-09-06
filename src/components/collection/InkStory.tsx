import { useId } from 'react';
import type { Ink } from '../../models/types';
import { getInkReference, referenceHex } from '../../lib/inkReference';
import './InkStory.css';

export function InkStory({ ink, expanded = false }: { ink: Ink; expanded?: boolean }) {
    const headingId = useId();
    const reference = getInkReference(ink);
    if (!reference) return null;
    const { inspiration, color, properties, glitterColors, sources } = reference;
    const hex = referenceHex(reference);
    const content = (
        <div className="ink-story-content">
            <div className="ink-story-origin">
                <span className="overline">{inspiration.series}</span>
                {inspiration.author && <strong>{inspiration.author}</strong>}
                {inspiration.work && <cite>{inspiration.work}</cite>}
                {reference.exclusiveTo && (
                    <span className="small muted">{reference.exclusiveTo} exclusive</span>
                )}
            </div>
            <p className="ink-story-description">{reference.description}</p>
            <ul className="ink-properties" aria-label="Ink properties">
                {properties.map((property) => <li key={property}>{property}</li>)}
            </ul>
            {glitterColors.length > 0 && (
                <p className="small muted">{glitterColors.join(' + ')} glitter</p>
            )}
            <dl className="ink-reference-values">
                <div>
                    <dt>RGB</dt>
                    <dd>
                        {hex && <span className="ink-reference-chip" style={{ backgroundColor: hex }} aria-hidden="true" />}
                        {color.rgb?.join(' / ') || 'Not verified'}
                    </dd>
                </div>
                <div><dt>P value</dt><dd>{color.p || 'Not verified'}</dd></div>
                {reference.productCode && (
                    <div><dt>Product code</dt><dd>{reference.productCode}</dd></div>
                )}
            </dl>
            <details className="ink-source-details">
                <summary>Sources & notes</summary>
                <div>
                    <p>Summarized from the linked sources. Screen colors are approximate.</p>
                    {reference.colorGuideProperties && (
                        <p>Color guide: {reference.colorGuideProperties.join(', ')}.</p>
                    )}
                    {reference.notes?.map((note) => <p key={note}>{note}</p>)}
                    <ul>
                        {sources.map((source) => (
                            <li key={source.url}>
                                <a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>
                            </li>
                        ))}
                    </ul>
                </div>
            </details>
        </div>
    );
    return expanded ? (
        <section className="ink-story ink-story-expanded" aria-labelledby={headingId}>
            <h2 id={headingId}>Behind the ink</h2>
            {content}
        </section>
    ) : (
        <details className="ink-story">
            <summary>Story & details<span className="sr-only"> for {ink.name}</span></summary>
            {content}
        </details>
    );
}
