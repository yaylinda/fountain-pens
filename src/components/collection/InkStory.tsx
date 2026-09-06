import { useId } from 'react';
import type { Ink } from '../../models/types';
import { getInkReference, inkPropertyValues, referenceHex } from '../../lib/inkReference';
import './InkStory.css';

export function InkStory({ ink, expanded = false }: { ink: Ink; expanded?: boolean }) {
    const headingId = useId();
    const reference = getInkReference(ink);
    if (!reference) return null;
    const { inspiration, color, sources, nameOrigin, writing } = reference;
    const hex = referenceHex(reference);
    const properties = inkPropertyValues(reference);
    const hasReferenceDetails = color || reference.productCode || reference.countryOfOrigin ||
        reference.edition || reference.limitedEdition !== undefined || reference.exclusiveTo || writing;
    const content = (
        <div className="ink-story-content">
            <div className="ink-story-narrative">
                <h3 className="overline">Story & origin</h3>
                <div className="ink-story-origin">
                    <span className="small muted">{inspiration.series}</span>
                    {nameOrigin && (
                        <>
                            <strong className="ink-name-japanese" lang="ja">{nameOrigin.japanese}</strong>
                            <span lang="ja" className="small muted">{nameOrigin.reading}</span>
                            <strong>{nameOrigin.meaning}</strong>
                        </>
                    )}
                    {inspiration.author && <strong>{inspiration.author}</strong>}
                    {inspiration.work && <cite>{inspiration.work}</cite>}
                </div>
                <p className="ink-story-description">{reference.description}</p>
            </div>
            {(properties.length > 0 || hasReferenceDetails) && (
                <div className="ink-story-facts">
                    {properties.length > 0 && (
                        <section className="ink-story-section" aria-labelledby={`${headingId}-properties`}>
                            <h3 className="overline" id={`${headingId}-properties`}>Ink properties</h3>
                            <p className="small muted">
                                {writing ? 'Vanness observations' : `${ink.brand} product properties`}
                            </p>
                            <dl className="ink-reference-values">
                                {properties.map(({ label, value }) => (
                                    <div key={label}><dt>{label}</dt><dd className="ink-value-label">{value}</dd></div>
                                ))}
                            </dl>
                            {writing && (
                                <p className="small muted">
                                    Dry time tested with {writing.testPen} on {writing.testPaper}. Results vary with pen and paper.
                                </p>
                            )}
                        </section>
                    )}
                    {hasReferenceDetails && (
                        <section className="ink-story-section" aria-labelledby={`${headingId}-reference`}>
                            <h3 className="overline" id={`${headingId}-reference`}>Reference details</h3>
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
                                {reference.productCode && <div><dt>Product code</dt><dd>{reference.productCode}</dd></div>}
                                {reference.countryOfOrigin && <div><dt>Made in</dt><dd>{reference.countryOfOrigin}</dd></div>}
                                {(reference.edition || reference.limitedEdition !== undefined) && (
                                    <div><dt>Edition</dt><dd>{reference.edition || (reference.limitedEdition ? 'Limited' : 'Standard')}</dd></div>
                                )}
                                {reference.exclusiveTo && <div><dt>Exclusive to</dt><dd>{reference.exclusiveTo}</dd></div>}
                                {writing && (
                                    <>
                                        <div><dt>Iron gall</dt><dd>{writing.ironGall ? 'Yes' : 'No'}</dd></div>
                                        <div><dt>Pigmented</dt><dd>{writing.pigment ? 'Yes' : 'No'}</dd></div>
                                    </>
                                )}
                            </dl>
                        </section>
                    )}
                </div>
            )}
            <details className="ink-source-details">
                <summary>Sources & notes</summary>
                <div>
                    <p>Summarized from the linked sources. Screen colors are approximate.</p>
                    {writing ? (
                        <p>Writing observations and product details follow Vanness’s table; any differences in its prose are noted below.</p>
                    ) : (
                        <p>Only reported properties are shown. Glistening is listed as shimmer; an unlisted property is not verified.</p>
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
            <h2 id={headingId}>Story & details</h2>
            {content}
        </section>
    ) : (
        <details className="ink-story">
            <summary>Story & details<span className="sr-only"> for {ink.name}</span></summary>
            {content}
        </details>
    );
}
