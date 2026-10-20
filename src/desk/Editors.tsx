import { PenIdentity, InkIdentity, DateStamp } from "./Identity";
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
  getSwatch,
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
      title={entry ? "Edit refill log" : "New refill log"}
      className="refill-dialog"
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
          <div className="refill-topline">
            <div className="form-field">
              <Label htmlFor="refill-date">Date</Label>
              <Input
                id="refill-date"
                name="refill-date"
                type="date"
                max={today()}
                value={draft.date}
                onChangeText={(date) => patch({ date })}
              />
            </div>
            <div className="form-field">
              <span className="field-label" id="event-kind">
                Action
              </span>
              <div
                className="segmented-control"
                role="group"
                aria-labelledby="event-kind"
              >
                <Action
                  aria-pressed={!cleaning}
                  onPress={() => {
                    if (cleaning) patch({ inkIds: [] });
                  }}
                >
                  <Icon name="ink" />
                  Refill
                </Action>
                <Action
                  aria-pressed={cleaning}
                  onPress={() =>
                    patch({ inkIds: [EMPTY_INK_ID], notPure: false })
                  }
                >
                  <Icon name="refill" />
                  Clean
                </Action>
              </div>
            </div>
          </div>
          <div className="refill-columns">
            <section className="form-section">
              <Label htmlFor="pen-search">Pen</Label>
              <Input
                id="pen-search"
                name="pen-search"
                autoComplete="off"
                placeholder="Find a pen…"
                value={penSearch}
                onChangeText={setPenSearch}
              />
              <YStack className="desk-options" gap={5}>
                {!pens.length && <Muted>No matching pens.</Muted>}
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
                    <PenIdentity pen={p} />
                    {p.needsRefill && (
                      <span className="status status-red">Queued</span>
                    )}
                  </Action>
                ))}
              </YStack>
            </section>
            <section className="form-section">
              {!cleaning ? (
                <>
                  <Label htmlFor="ink-search">
                    Ink{" "}
                    <span className="field-hint">Select multiple to mix</span>
                  </Label>
                  <Input
                    id="ink-search"
                    name="ink-search"
                    autoComplete="off"
                    placeholder="Find an ink…"
                    value={inkSearch}
                    onChangeText={setInkSearch}
                  />
                  <YStack className="desk-options" gap={5}>
                    {!inks.length && <Muted>No matching inks.</Muted>}
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
                        <span
                          className="option-swatch"
                          style={{
                            backgroundColor: getSwatch(i)?.hex || "#e2e2e5",
                          }}
                        />
                        <InkIdentity ink={i} />
                        {draft.inkIds.includes(i.id) && <Icon name="check" />}
                      </Action>
                    ))}
                  </YStack>
                  <Action
                    aria-pressed={!!draft.notPure}
                    onPress={() => patch({ notPure: !draft.notPure })}
                  >
                    {draft.notPure && <Icon name="check" />}Residual ink
                  </Action>
                </>
              ) : (
                <div className="cleaning-summary">
                  <Icon name="refill" />
                  <Text fontSize={15} fontWeight="700">
                    Cleaned & empty
                  </Text>
                  <Muted>This log leaves the pen without ink.</Muted>
                  {queueAllowed && (
                    <Action
                      aria-pressed={!!draft.needsRefill}
                      onPress={() => patch({ needsRefill: !draft.needsRefill })}
                    >
                      {draft.needsRefill && <Icon name="check" />}Add to refill
                      queue
                    </Action>
                  )}
                </div>
              )}
            </section>
          </div>
          <div className="form-field">
            <Label htmlFor="refill-notes">Notes</Label>
            <TextArea
              id="refill-notes"
              value={draft.notes}
              onChangeText={(notes) => patch({ notes })}
              placeholder="Optional notes…"
            />
          </div>
          <Failure error={command.error} />
          <div className="dialog-footer">
            <div className="refill-summary" aria-live="polite">
              {draft.penId ? (
                <>
                  <strong>{penLabel(model.penById.get(draft.penId))}</strong>
                  <span>
                    {cleaning
                      ? "Cleaned & empty"
                      : draft.inkIds.length
                        ? draft.inkIds
                            .map((id) => inkLabel(model.inkById.get(id)))
                            .join(" + ")
                        : "No ink selected"}
                  </span>
                </>
              ) : (
                <span>No pen selected</span>
              )}
            </div>
            <Action onPress={close}>Cancel</Action>
            <Primary type="submit">
              {command.busy
                ? "Saving…"
                : entry
                  ? "Save changes"
                  : cleaning
                    ? "Save cleaning log"
                    : "Save refill log"}
            </Primary>
          </div>
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
    <Modal
      title="Writing history"
      className="writing-dialog"
      close={close}
      busy={command.busy}
    >
      <div className="writing-context">
        <PenIdentity pen={collection.pens.find((p) => p.id === entry.penId)!} />
        <div className="writing-fill">
          <span className="field-label">Filled</span>
          <DateStamp value={entry.date} />
        </div>
        <div className="writing-inks">
          {entry.inkIds.map((id) => {
            const ink = collection.inks.find((i) => i.id === id);
            return ink ? (
              <span className="ink-chip" key={id}>
                <span
                  className="chip-color"
                  style={{ backgroundColor: getSwatch(ink)?.hex || "#ddd" }}
                />
                <InkIdentity ink={ink} compact />
              </span>
            ) : null;
          })}
        </div>
      </div>
      {collection.canEdit && entry.id && (
        <form
          className="writing-form"
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
          <div className="form-field">
            <Label htmlFor="writing-date">
              {editing ? "Correct date" : "Add writing day"}
            </Label>
            <Input
              id="writing-date"
              name="writing-date"
              type="date"
              min={entry.date}
              max={today()}
              required
              value={date}
              onChangeText={setDate}
              disabled={command.busy}
            />
          </div>
          <Primary type="submit" disabled={command.busy}>
            {command.busy
              ? "Saving…"
              : editing
                ? "Save correction"
                : "Log writing"}
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
      {notice && (
        <Muted role="status" className="status status-green">
          {notice}
        </Muted>
      )}
      <div className="history-heading">
        <Text fontSize={15} fontWeight="700">
          Writing days
        </Text>
        <span className="status status-neutral">{logs.length}</span>
      </div>
      <YStack gap={8}>
        {logs.length ? (
          logs.map((log) => (
            <YStack key={log.id} className="history-row" gap={8}>
              <XStack
                alignItems="center"
                justifyContent="space-between"
                gap={8}
              >
                <DateStamp value={log.writtenOn} />
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
                      className="action-quiet action-danger"
                      disabled={command.busy}
                      onPress={() => setDeleting(log.id)}
                    >
                      Remove
                    </Action>
                  </XStack>
                )}
              </XStack>
              {deleting === log.id && (
                <XStack gap={5}>
                  <Action
                    className="action-danger"
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
                    Confirm remove
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
