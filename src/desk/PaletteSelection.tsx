import { type ReactNode } from "react";
import { Modal } from "./ui";

export function PaletteSelection({
  mobile,
  open,
  close,
  children,
}: {
  mobile: boolean;
  open: boolean;
  close: () => void;
  children: ReactNode;
}) {
  if (mobile)
    return open ? (
      <Modal
        title="Selected ink"
        close={close}
        className="palette-selection-dialog"
      >
        {children}
      </Modal>
    ) : null;
  return (
    <aside className="desk-active">
      <div className="selection-slot">
        <div className="selection-empty" hidden={open}>
          <strong>No ink selected</strong>
          <span>Select a swatch to see its pens and writing history.</span>
        </div>
        <div
          className={`selected-panel ${open ? "is-open" : ""}`}
          inert={!open}
          aria-hidden={!open}
        >
          {children}
        </div>
      </div>
    </aside>
  );
}
