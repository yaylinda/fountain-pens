import { useState } from "react";
import { Input, Text, XStack, toast } from "tamagui";
import type { DeskArrangement, PaletteItem } from "../lib/deskPalette";
import { saveNamedPalette } from "../services/dataService";
import { Action, Failure, Modal } from "./ui";
import { useCommand } from "./useCommand";

export function PaletteCreate({
  items,
  hasUnsavedChanges,
  created,
  close,
}: {
  items: PaletteItem[];
  hasUnsavedChanges: boolean;
  created: (palette: DeskArrangement) => void;
  close: () => void;
}) {
  const [name, setName] = useState("");
  const command = useCommand();
  return (
    <Modal
      title="New palette"
      close={close}
      busy={command.busy}
      showCloseButton={false}
    >
      <form
        className="desk-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          void command.run(async () => {
            const palette = await saveNamedPalette(null, name.trim(), items);
            created(palette);
            toast.success("Palette created");
          });
        }}
      >
        <label className="visually-hidden" htmlFor="new-palette-name">
          Name
        </label>
        <Input
          id="new-palette-name"
          name="palette-name"
          autoComplete="off"
          maxLength={80}
          value={name}
          onChangeText={setName}
          disabled={command.busy}
          required
        />
        {hasUnsavedChanges && (
          <Text fontSize={12}>
            Creating a palette will discard your current unsaved edits.
          </Text>
        )}
        <Failure error={command.error} />
        <XStack gap={8} justifyContent="flex-end">
          <Action
            backgroundColor="transparent"
            borderColor="transparent"
            disabled={command.busy}
            onPress={close}
          >
            Cancel
          </Action>
          <Action
            type="submit"
            backgroundColor="#226943"
            color="white"
            borderColor="#226943"
            disabled={command.busy || !name.trim()}
          >
            {command.busy ? "Creating…" : "Create"}
          </Action>
        </XStack>
      </form>
    </Modal>
  );
}
