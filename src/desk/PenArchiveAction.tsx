import { useSyncExternalStore } from "react";
import { toast } from "tamagui";
import type { Pen } from "../models/types";
import {
  setPenArchived,
  subscribeCollection,
  getCollection,
  isCollectionSaving,
} from "../services/dataService";
import { SidebarSection } from "./Sidebar";
import { useCommand } from "./useCommand";
import { Action, Failure, Muted } from "./ui";
import { Icon } from "./Icon";

export function PenArchiveAction({ pen }: { pen: Pen }) {
  const collection = useSyncExternalStore(subscribeCollection, getCollection);
  const saving = useSyncExternalStore(subscribeCollection, isCollectionSaving);
  const command = useCommand();
  if (!collection.canEdit) return null;
  return (
    <SidebarSection title="Collection status">
      <Muted>
        {pen.archived
          ? "Archived. Restore this pen to your active collection."
          : "Archive this pen to hide it from your active collection. Its history is kept."}
      </Muted>
      <Action
        disabled={command.busy || saving}
        onPress={() =>
          void command.run(
            () => setPenArchived(pen.id, !pen.archived),
            () => toast.success(pen.archived ? "Pen restored" : "Pen archived"),
          )
        }
      >
        <Icon name={pen.archived ? "restore" : "archive"} />
        {pen.archived ? "Restore pen" : "Archive pen"}
      </Action>
      <Failure error={command.error} />
    </SidebarSection>
  );
}
