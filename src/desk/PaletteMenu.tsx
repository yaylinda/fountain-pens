import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";

export function PaletteMenu({
  name,
  disabled,
  edit,
  duplicate,
  remove,
}: {
  name: string;
  disabled: boolean;
  edit: () => void;
  duplicate: () => void;
  remove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const openAtEnd = useRef(false);
  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLButtonElement>("button");
    items?.[openAtEnd.current ? items.length - 1 : 0]?.focus();
    openAtEnd.current = false;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div
      className="palette-menu"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="menu-trigger"
        disabled={disabled}
        aria-label={`Actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAtEnd.current = event.key === "ArrowUp";
            setOpen(true);
          }
        }}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div
          ref={menu}
          id={id}
          className="palette-menu-popup"
          role="menu"
          aria-label={`Actions for ${name}`}
          onKeyDown={(event) => {
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]',
              ),
            ];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (event.key === "Tab") close();
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              buttons[
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        buttons.length) %
                      buttons.length
              ]?.focus();
            }
          }}
        >
          <div className="menu-context">{name}</div>
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close();
              edit();
            }}
          >
            <Icon name="edit" />
            Edit palette
          </button>
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close();
              duplicate();
            }}
          >
            <Icon name="copy" />
            Duplicate
          </button>
          <div role="separator" className="menu-separator" />
          <button
            role="menuitem"
            tabIndex={-1}
            className="menu-delete"
            onClick={() => {
              close();
              remove();
            }}
          >
            <Icon name="trash" />
            Delete palette
          </button>
        </div>
      )}
    </div>
  );
}
