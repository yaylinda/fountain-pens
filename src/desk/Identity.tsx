import type { Ink, Pen } from "../models/types";
import { today } from "../lib/collection";
import { displayDate } from "../lib/displayDate";
export function PenIdentity({ pen, emphasizeColor = false }: { pen: Pen; emphasizeColor?: boolean }) {
  return (
    <span className={`object-identity ${emphasizeColor ? "pen-identity-color" : ""}`}>
      {emphasizeColor && <strong className="pen-color">{pen.color.trim() || "Color not recorded"}</strong>}
      <span className="object-name">
        <span className="object-brand">{pen.brand}</span>{" "}
        <strong>{pen.model}</strong>
      </span>
      <PenDetails pen={pen} hideColor={emphasizeColor} />
    </span>
  );
}
export function PenDetails({ pen, hideColor = false }: { pen: Pen; hideColor?: boolean }) {
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
