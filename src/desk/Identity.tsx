import type { Ink, Pen } from "../models/types";
import { today } from "../lib/collection";
import { Icon } from "./Icon";
import { displayDate } from "../lib/displayDate";
export function PenIdentity({ pen }: { pen: Pen }) {
  return (
    <span className="object-identity">
      <span className="object-name">
        <span className="object-brand">{pen.brand}</span>{" "}
        <strong>{pen.model}</strong>
      </span>
      <PenDetails pen={pen} />
    </span>
  );
}

// Shared color-first pen identity for palette and ink-reference sidebars.
// Status markers and actions belong to the surrounding view.
export function PenSummary({ pen }: { pen: Pen }) {
  return (
    <span className="object-identity pen-identity-color">
      <strong className="pen-color">
        {pen.color.trim() || "Color not recorded"}
      </strong>
      <span className="pen-summary">
        <span className="object-name">
          <span className="object-brand">{pen.brand}</span>{" "}
          <strong>{pen.model}</strong>
        </span>
        {[pen.nibSize, pen.nibType]
          .map((detail) => detail.trim())
          .filter(Boolean)
          .map((detail, index) => (
            <span className="pen-summary-detail" key={index}>
              <span aria-hidden="true"> · </span>
              {detail}
            </span>
          ))}
      </span>
    </span>
  );
}
export function PenFillBadges({
  queued,
  residual,
}: {
  queued?: boolean;
  residual?: boolean;
}) {
  if (!queued && !residual) return null;
  return (
    <span className="pen-fill-badges">
      {queued && (
        <span className="status status-red">
          <Icon name="refill" /> Queued for refill
        </span>
      )}
      {residual && (
        <span className="status status-neutral">
          <Icon name="ink" /> Residual ink
        </span>
      )}
    </span>
  );
}
export function PenDetails({
  pen,
  hideColor = false,
}: {
  pen: Pen;
  hideColor?: boolean;
}) {
  return (
    <span className="object-meta">
      {!hideColor && <span>{pen.color}</span>}
      {pen.nibSize && (
        <span className="status status-neutral">{pen.nibSize}</span>
      )}
      {pen.nibType && <span>{pen.nibType}</span>}
    </span>
  );
}
export function InkIdentity({
  ink,
  compact = false,
}: {
  ink: Ink;
  compact?: boolean;
}) {
  return (
    <span
      className={`object-identity ink-identity ${compact ? "ink-identity-inline" : ""}`}
    >
      <strong className="object-name">{ink.name}</strong>
      <InkDetails ink={ink} />
    </span>
  );
}
export function InkDetails({ ink }: { ink: Ink }) {
  return (
    <span
      className="ink-details"
      title={[ink.brand, ink.collection].filter(Boolean).join(" · ")}
    >
      <span>{ink.brand}</span>
      {ink.collection?.trim() && (
        <span className="ink-collection"> ({ink.collection})</span>
      )}
    </span>
  );
}
export function DateStamp({ value }: { value: string }) {
  const date = displayDate(value, today());
  return (
    <time className="date-stamp" dateTime={value}>
      <span>{date.absolute}</span>
      <small>{date.relative}</small>
    </time>
  );
}
