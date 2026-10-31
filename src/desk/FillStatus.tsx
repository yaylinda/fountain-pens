import { isCleaning, type JournalEntry } from "../lib/collection";
import { Icon } from "./Icon";

export function FillStatus({ entry }: { entry?: JournalEntry }) {
  const inked = entry && !isCleaning(entry);
  return (
    <span className={`status ${inked ? "status-green" : "status-neutral"}`}>
      <Icon name={inked ? "ink" : "circle"} />
      {inked ? "Inked" : entry ? "Cleaned & empty" : "No fill recorded"}
    </span>
  );
}
