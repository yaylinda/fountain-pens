import type { Ink, Pen } from "../models/types";
import { today } from "../lib/collection";
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
export function PenDetails({ pen }: { pen: Pen }) {
  return (
    <span className="object-meta">
      <span>{pen.color}</span>
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
    <span className={`object-identity ${compact ? "ink-identity-inline" : ""}`}>
      <strong className="object-name">{ink.name}</strong>
      <span className="object-meta">
        {[ink.brand, ink.collection].filter(Boolean).join(" · ")}
      </span>
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
