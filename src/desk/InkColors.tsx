import type { Ink } from "../models/types";
import { getSwatch } from "../lib/collection";
import { InkIdentity } from "./Identity";
import { Icon } from "./Icon";

export function InkColors({
  inks,
  compact = false,
}: {
  inks: Ink[];
  compact?: boolean;
}) {
  if (!inks.length)
    return (
      <span className="empty-fill">
        <Icon name="circle" /> Cleaned & empty
      </span>
    );
  return (
    <div className="ink-colors">
      {inks.map((ink, index) => (
        <span className="ink-color-item" key={ink.id}>
          {index > 0 && (
            <span className="ink-separator" aria-label="mixed with">
              +
            </span>
          )}
          <span
            className={`ink-color-chip ${getSwatch(ink) ? "" : "unknown-color"}`}
            aria-hidden="true"
            style={{ backgroundColor: getSwatch(ink)?.hex }}
          />
          <InkIdentity ink={ink} compact={compact} />
        </span>
      ))}
    </div>
  );
}
