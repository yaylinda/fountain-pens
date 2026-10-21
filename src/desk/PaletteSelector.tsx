import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Select } from "tamagui";
import type { DeskArrangement } from "../lib/deskPalette";
import { Icon } from "./Icon";

const ALL = "all-currently-inked";

export function PaletteSelector({
  value,
  palettes,
  disabled,
  onChange,
}: {
  value: string;
  palettes: DeskArrangement[];
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 320,
  });
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = anchor.current!.getBoundingClientRect();
      setPosition({
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
        height: Math.max(
          80,
          Math.min(320, window.innerHeight - rect.bottom - 18),
        ),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor.current!);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return (
    <div
      ref={anchor}
      className={`palette-selector ${value ? "" : "palette-selector-live"}`}
    >
      <Select
        value={value || ALL}
        open={open && !disabled}
        onOpenChange={setOpen}
        onValueChange={(id) => onChange(id === ALL ? "" : id)}
        renderValue={() =>
          value
            ? palettes.find((p) => p.id === value)?.name
            : "All currently inked"
        }
      >
        <Select.Trigger
          id="saved-palette"
          aria-label="Palette"
          disabled={disabled}
          className="palette-select-trigger"
        >
          <span className="selector-mark" aria-hidden="true">
            <Icon name={value ? "ink" : "check"} />
          </span>
          <Select.Value className="palette-select-value" />
          <span className="select-chevron" aria-hidden="true">
            <Icon name="chevron" />
          </span>
        </Select.Trigger>
        <Select.Content>
          {/* Tamagui 3.0.18 hard-codes selected-item overlay placement. Keep its
              listbox/focus behavior, but anchor this viewport below the trigger. */}
          <Select.Viewport
            className="palette-select-popup"
            aria-label="Palettes"
            style={
              {
                "--palette-left": `${position.left}px`,
                "--palette-top": `${position.top}px`,
                "--palette-width": `${position.width}px`,
                "--palette-height": `${position.height}px`,
              } as CSSProperties
            }
          >
            <Select.Group>
              <Select.Label className="palette-select-label">
                Live reference
              </Select.Label>
              <Select.Item value={ALL} className="palette-select-option">
                <Select.ItemText>All currently inked</Select.ItemText>
                <Select.ItemIndicator>
                  <Icon name="check" />
                </Select.ItemIndicator>
              </Select.Item>
            </Select.Group>
            {!!palettes.length && (
              <Select.Group className="palette-select-saved">
                <Select.Label className="palette-select-label">
                  Saved palettes
                </Select.Label>
                {palettes.map((p) => (
                  <Select.Item
                    key={p.id}
                    value={p.id}
                    className="palette-select-option"
                  >
                    <Select.ItemText>{p.name}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Icon name="check" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select>
    </div>
  );
}
