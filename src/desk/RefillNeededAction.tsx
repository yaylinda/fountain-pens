import { toast } from "tamagui";
import type { Pen } from "../models/types";
import {
  setPenNeedsRefill,
  subscribeCollection,
  getCollection,
  isCollectionSaving,
} from "../services/dataService";
import { useSyncExternalStore } from "react";
import { useCommand } from "./useCommand";
import { Action, Failure } from "./ui";
import { Icon } from "./Icon";

export function RefillNeededAction({ pen }: { pen: Pen }) {
  const collection = useSyncExternalStore(subscribeCollection, getCollection);
  const saving = useSyncExternalStore(subscribeCollection, isCollectionSaving);
  const command = useCommand();
  if (!collection.canEdit || pen.archived) return null;
  return (
    <div className="refill-needed-action">
      <Action
        disabled={command.busy || saving}
        onPress={() =>
          void command.run(
            () => setPenNeedsRefill(pen.id, !pen.needsRefill),
            () =>
              toast.success(
                pen.needsRefill
                  ? "Removed from refill queue"
                  : "Added to refill queue",
              ),
          )
        }
      >
        <Icon name={pen.needsRefill ? "minus" : "refill"} />
        {pen.needsRefill ? "Remove from queue" : "Add to refill queue"}
      </Action>
      <Failure error={command.error} />
    </div>
  );
}
