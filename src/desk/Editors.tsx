import { Icon } from "./Icon";
import { useCommand } from "./useCommand";
import { useState } from "react";
import { Input, Label, Text, TextArea, XStack, YStack } from "tamagui";
import {
  addRefillLog,
  updateRefillLog,
  saveWritingLog,
  deleteWritingLog,
} from "../services/dataService";
import {
  EMPTY_INK_ID,
  today,
  isCleaning,
  penLabel,
  penDescription,
  inkLabel,
  matches,
  byPenName,
  validateRefill,
  refillPayload,
  type Collection,
  type CollectionModel,
  type RefillDraft,
  type JournalEntry,
} from "../lib/collection";
import { Action, Primary, Muted, Modal, Failure } from "./ui";
export function RefillEditor({
  collection,
  model,
  entry,
  penId = "",
  close,
}: {
  collection: Collection;
  model: CollectionModel;
  entry?: JournalEntry;
  penId?: string;
  close: () => void;
}) {
  const [draft, setDraft] = useState<RefillDraft>(() =>
    entry
      ? {
          ...entry,
          inkIds: isCleaning(entry) ? [EMPTY_INK_ID] : [...entry.inkIds],
        }
      : {
          date: today(),
          penId,
          inkIds: [],
          notes: "",
          needsRefill: !!model.penById.get(penId)?.needsRefill,
        },
  );
  const [penSearch, setPenSearch] = useState(""),
    [inkSearch, setInkSearch] = useState("");
  const command = useCommand();
  const cleaning = isCleaning(draft) && draft.inkIds.includes(EMPTY_INK_ID);
  const patch = (value: Partial<RefillDraft>) =>
    setDraft((previous) => ({ ...previous, ...value }));
  const pens = collection.pens
    .filter(
      (p) =>
        (!p.archived || p.id === draft.penId) &&
        matches(penSearch, penLabel(p), penDescription(p)),
    )
    .sort(
      (a, b) =>
        Number(!!b.needsRefill) - Number(!!a.needsRefill) || byPenName(a, b),
    );
  const inks = collection.inks.filter(
    (i) =>
      i.id !== EMPTY_INK_ID &&
      (!i.archived || draft.inkIds.includes(i.id)) &&
      matches(inkSearch, inkLabel(i), i.collection),
  );
  const queueAllowed =
    !entry &&
    draft.date <= today() &&
    draft.date >= (model.latest.get(draft.penId)?.date || "");
  return (
    <Modal
      title={entry ? "Correct refill" : "Refill or clean"}
      close={close}
      busy={command.busy}
    >
      <form
        className="desk-form"
        onSubmit={(event) => {
          event.preventDefault();
          void command.run(async () => {
            const error = validateRefill(draft, collection);
            if (error) throw new Error(error);
            const payload = refillPayload(draft);
            if (entry) await updateRefillLog(payload, entry);
            else
              await addRefillLog(
                payload,
                cleaning && queueAllowed ? draft.needsRefill : undefined,
              );
          }, close);
        }}
      >
        <fieldset disabled={command.busy} className="desk-form">
          <Label htmlFor="refill-date">Date</Label>
          <Input
            id="refill-date"
            type="date"
            max={today()}
            value={draft.date}
            onChangeText={(date) => patch({ date })}
          />
          <Label htmlFor="pen-search">Pen</Label>
          <Input
            id="pen-search"
            placeholder="Find a pen"
            value={penSearch}
            onChangeText={setPenSearch}
          />
          <Muted>
            {draft.penId
              ? penLabel(model.penById.get(draft.penId)) +
                " · " +
                penDescription(model.penById.get(draft.penId)!)
              : "No pen selected"}
          </Muted>
          <YStack className="desk-options" gap={5}>
            {pens.map((p) => (
              <Action
                key={p.id}
                aria-pressed={draft.penId === p.id}
                onPress={() =>
                  patch({ penId: p.id, needsRefill: !!p.needsRefill })
                }
                height="auto"
                minHeight={42}
                justifyContent="flex-start"
              >
                {penLabel(p)} · {penDescription(p)}
                {p.needsRefill ? " · Needs refill" : ""}
              </Action>
            ))}
          </YStack>
          <XStack gap={8}>
            <Action
              aria-pressed={!cleaning}
              onPress={() => {
                if (cleaning) patch({ inkIds: [] });
              }}
            >
              Fill with ink
            </Action>
            <Action
              aria-pressed={cleaning}
              onPress={() => patch({ inkIds: [EMPTY_INK_ID], notPure: false })}
            >
              Cleaned & empty
            </Action>
          </XStack>
          {!cleaning ? (
            <>
              <Label htmlFor="ink-search">
                Inks · select more than one to mix
              </Label>
              <Input
                id="ink-search"
                placeholder="Find an ink"
                value={inkSearch}
                onChangeText={setInkSearch}
              />
              <Muted>
                {draft.inkIds
                  .map((id) => inkLabel(model.inkById.get(id)))
                  .join(" + ") || "No ink selected"}
              </Muted>
              <YStack className="desk-options" gap={5}>
                {inks.map((i) => (
                  <Action
                    key={i.id}
                    aria-pressed={draft.inkIds.includes(i.id)}
                    onPress={() =>
                      patch({
                        inkIds: draft.inkIds.includes(i.id)
                          ? draft.inkIds.filter((id) => id !== i.id)
                          : [...draft.inkIds, i.id],
                      })
                    }
                    justifyContent="flex-start"
                    height="auto"
                    minHeight={38}
                  >
                    {inkLabel(i)}
                  </Action>
                ))}
              </YStack>
              <Action
                aria-pressed={!!draft.notPure}
                onPress={() => patch({ notPure: !draft.notPure })}
              >
                {draft.notPure && <Icon name="check" />}Residual ink / not pure
              </Action>
            </>
          ) : (
            queueAllowed && (
              <Action
                aria-pressed={!!draft.needsRefill}
                onPress={() => patch({ needsRefill: !draft.needsRefill })}
              >
                {draft.needsRefill && <Icon name="check" />}Add to refill queue
              </Action>
            )
          )}
          <Label htmlFor="refill-notes">Notes</Label>
          <TextArea
            id="refill-notes"
            value={draft.notes}
            onChangeText={(notes) => patch({ notes })}
          />
          <Failure error={command.error} />
          <Primary type="submit">
            {command.busy ? "Saving…" : "Save refill"}
          </Primary>
        </fieldset>
      </form>
    </Modal>
  );
}
export function WritingEditor({
  entry,
  collection,
  close,
}: {
  entry: JournalEntry;
  collection: Collection;
  close: () => void;
}) {
  const [date, setDate] = useState(today()),
    [editing, setEditing] = useState<string | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const command = useCommand();
  const logs = (collection.writingLogs || [])
    .filter((log) => log.refillId === entry.id)
    .sort((a, b) => b.writtenOn.localeCompare(a.writtenOn));
  return (
    <Modal title="Writing history" close={close} busy={command.busy}>
      <Muted>
        {penLabel(collection.pens.find((p) => p.id === entry.penId))} · Filled{" "}
        {entry.date}
      </Muted>
      {collection.canEdit && entry.id && (
        <form
          className="desk-form"
          onSubmit={(event) => {
            event.preventDefault();
            void command.run(
              () => saveWritingLog(entry.id!, date, editing),
              () => {
                setEditing(null);
                setDate(today());
                setNotice("Writing day saved.");
              },
            );
          }}
        >
          <Label htmlFor="writing-date">
            {editing ? "Correct date" : "Add writing day"}
          </Label>
          <Input
            id="writing-date"
            type="date"
            min={entry.date}
            max={today()}
            required
            value={date}
            onChangeText={setDate}
            disabled={command.busy}
          />
          <Primary type="submit" disabled={command.busy}>
            {command.busy
              ? "Saving…"
              : editing
                ? "Save correction"
                : "Save writing day"}
          </Primary>
          {editing && (
            <Action
              disabled={command.busy}
              onPress={() => {
                setEditing(null);
                setDate(today());
              }}
            >
              Cancel correction
            </Action>
          )}
        </form>
      )}
      <Failure error={command.error} />
      <Muted role="status">{notice}</Muted>
      <YStack gap={8}>
        {logs.length ? (
          logs.map((log) => (
            <YStack key={log.id} gap={5}>
              <XStack
                alignItems="center"
                justifyContent="space-between"
                gap={8}
              >
                <Text fontSize={13}>{log.writtenOn}</Text>
                {collection.canEdit && (
                  <XStack gap={4}>
                    <Action
                      disabled={command.busy}
                      onPress={() => {
                        setEditing(log.id);
                        setDate(log.writtenOn);
                        setDeleting(null);
                      }}
                    >
                      Correct
                    </Action>
                    <Action
                      disabled={command.busy}
                      onPress={() => setDeleting(log.id)}
                    >
                      Delete
                    </Action>
                  </XStack>
                )}
              </XStack>
              {deleting === log.id && (
                <XStack gap={5}>
                  <Action
                    disabled={command.busy}
                    onPress={() =>
                      void command.run(
                        () => deleteWritingLog(log.id),
                        () => {
                          setDeleting(null);
                          if (editing === log.id) {
                            setEditing(null);
                            setDate(today());
                          }
                          setNotice("Writing day deleted.");
                        },
                      )
                    }
                  >
                    Confirm delete
                  </Action>
                  <Action
                    onPress={() => setDeleting(null)}
                    disabled={command.busy}
                  >
                    Keep day
                  </Action>
                </XStack>
              )}
            </YStack>
          ))
        ) : (
          <Muted>No writing days recorded.</Muted>
        )}
      </YStack>
    </Modal>
  );
}
