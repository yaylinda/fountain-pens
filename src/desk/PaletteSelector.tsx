import type { DeskArrangement } from "../lib/deskPalette";
import { Icon } from "./Icon";

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
  return (
    <div className={`palette-selector ${value ? "" : "palette-selector-live"}`}>
      <span className="selector-mark" aria-hidden="true">
        <Icon name={value ? "ink" : "check"} />
      </span>
      <select
        id="saved-palette"
        aria-label="Palette"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <optgroup label="Live reference">
          <option value="">All currently inked</option>
        </optgroup>
        {!!palettes.length && (
          <optgroup label="Saved palettes">
            {palettes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <span className="select-chevron">
        <Icon name="chevron" />
      </span>
    </div>
  );
}
