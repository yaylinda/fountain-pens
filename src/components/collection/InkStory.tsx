import { useId } from 'react';
import type { Ink } from '../../models/types';
import { getInkReference, referenceHex } from '../../lib/inkReference';
import './InkStory.css';

export function InkStory({ ink, expanded = false }: { ink: Ink; expanded?: boolean }) {
    const headingId = useId();
    const reference = getInkReference(ink);
    if (!reference) return null;
    const { inspiration, color, properties, glitterColors, sources, nameOrigin, writing } = reference;
    const hex = referenceHex(reference);
    const content = (
        <div className="ink-story-content">
            <div className="ink-story-origin">
                <span className="overline">{inspiration.series}</span>
                {nameOrigin && (
                    <>
                        <strong className="ink-name-japanese" lang="ja">{nameOrigin.japanese}</strong>
                        <span lang="ja" className="small muted">{nameOrigin.reading}</span>
                        <span>{nameOrigin.meaning}</span>
                    </>
                )}
                {inspiration.author && <strong>{inspiration.author}</strong>}
                {inspiration.work && <cite>{inspiration.work}</cite>}
                {reference.exclusiveTo && (
                    <span className="small muted">{reference.exclusiveTo} exclusive</span>
                )}
            </div>
            <p className="ink-story-description">{reference.description}</p>
            {properties.length > 0 && (
                <ul className="ink-properties" aria-label="Ink properties">
                    {properties.map((property) => <li key={property}>{property}</li>)}
                </ul>
            )}
            {glitterColors.length > 0 && (
                <p className="small muted">{glitterColors.join(' + ')} glitter</p>
            )}
            {(color || reference.productCode) && (
                <dl className="ink-reference-values">
                    {color && (
                        <>
                            <div>
                                <dt>RGB</dt>
                                <dd>
                                    {hex && <span className="ink-reference-chip" style={{ backgroundColor: hex }} aria-hidden="true" />}
                                    {color.rgb?.join(' / ') || 'Not verified'}
                                </dd>
                            </div>
                            <div><dt>P value</dt><dd>{color.p || 'Not verified'}</dd></div>
                        </>
                    )}
                    {reference.productCode && (
                        <div><dt>Product code</dt><dd>{reference.productCode}</dd></div>
                    )}
                </dl>
            )}
            {writing && (
                <div className="ink-writing">
                    <p className="overline">Vanness observations</p>
                    <dl className="ink-reference-values">
                        <div><dt>Flow</dt><dd className="ink-value-label">{writing.flow}</dd></div>
                        <div><dt>Shading</dt><dd className="ink-value-label">{writing.shading}</dd></div>
                        <div><dt>Sheen</dt><dd>{writing.sheen}</dd></div>
                        <div><dt>Shimmer</dt><dd>{writing.shimmer ? 'Yes' : 'No'}</dd></div>
                        <div><dt>Dry time</dt><dd>About {writing.dryTimeSeconds} seconds</dd></div>
                        <div><dt>Water resistance</dt><dd className="ink-value-label">{writing.waterResistance}</dd></div>
                    </dl>
                    <p className="small muted">
                        Dry time tested with {writing.testPen} on {writing.testPaper}. Results vary with pen and paper.
                    </p>
                </div>
            )}
            <details className="ink-source-details">
                <summary>Sources & notes</summary>
                <div>
                    <p>Summarized from the linked sources. Screen colors are approximate.</p>
                    {writing && (
                        <p>
                            Vanness lists: made in {reference.countryOfOrigin}; {writing.ironGall ? 'iron gall' : 'no iron gall'};
                            {' '}{writing.pigment ? 'pigmented' : 'no pigment'}; {reference.limitedEdition ? 'limited edition' : 'standard edition'}.
                            {' '}Writing observations follow the retailer’s table; any differences in its prose are noted below.
                        </p>
                    )}
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
