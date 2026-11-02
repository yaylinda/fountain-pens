import { type ReactNode } from "react";
import { Modal } from "./ui";

export function PaletteSelection({
  mobile,
  open,
  close,
  children,
  inkName,
}: {
  mobile: boolean;
  open: boolean;
  close: () => void;
  children: ReactNode;
  inkName: string;
}) {
  if (mobile)
    return open ? (
      <Modal
        title={inkName}
        hideHeading
        showCloseButton={false}
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
