import { useCommand } from "./desk/useCommand";
import { useState } from "react";
import { H1, H2, Input, Label, Text, XStack, YStack } from "tamagui";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCollection } from "./hooks/useCollection";
import {
  saveNamedPalette,
  deleteNamedPalette,
  saveWritingLog,
} from "./services/dataService";
import {
  reconcilePalette,
  movePalette,
  type DeskArrangement,
} from "./lib/deskPalette";
import { sortInksByColor } from "./lib/colorOrder";
import {
  getSwatch,
  penLabel,
  penDescription,
  inkLabel,
  today,
  isCleaning,
  type JournalEntry,
} from "./lib/collection";
import type { Ink } from "./models/types";
import { Action, Primary, Muted, Panel, Modal, Failure } from "./desk/ui";
import { Access } from "./desk/Access";
import { RefillEditor, WritingEditor } from "./desk/Editors";
function Swatch({
  ink,
  selected,
  editing,
  select,
  omit,
}: {
  ink: Ink;
  selected: boolean;
  editing: boolean;
  select: () => void;
  omit: () => void;
}) {
  const sort = useSortable({ id: ink.id, disabled: !editing });
  return (
    <YStack
      ref={(node) => sort.setNodeRef(node as HTMLElement | null)}
      style={{
        transform: CSS.Transform.toString(sort.transform),
        transition: sort.transition,
      }}
      gap={5}
      minWidth={0}
    >
      <Action
        className="desk-swatch"
        position="relative"
        aria-label={inkLabel(ink)}
        aria-pressed={selected}
        onPress={select}
        height={112}
        padding={0}
        borderWidth={selected ? 3 : 0}
        borderColor="white"
        backgroundColor={getSwatch(ink)?.hex || "#e2e2e5"}
      >
        <YStack position="absolute" bottom={12} left={13} right={13}>
          <Text color="white" fontSize={23}>
            Aa
          </Text>
          <XStack gap={4} marginTop={8}>
            {[0.85, 0.5, 0.25].map((opacity) => (
              <YStack
                key={opacity}
                flex={1}
                height={3}
                backgroundColor="white"
                opacity={opacity}
              />
            ))}
          </XStack>
        </YStack>
      </Action>
      <Text fontSize={12}>{ink.name}</Text>
      <Muted fontSize={10}>{ink.brand}</Muted>
      {editing && (
        <XStack gap={4}>
          <Action
            flex={1}
            height={28}
            fontSize={10}
            {...sort.attributes}
            {...sort.listeners}
            role="button"
            aria-label={`Move ${inkLabel(ink)}`}
          >
            ↔ Move
          </Action>
          <Action
            height={28}
            fontSize={10}
            aria-label={`Omit ${inkLabel(ink)}`}
            onPress={omit}
          >
            −
          </Action>
        </XStack>
      )}
    </YStack>
  );
}
export function App() {
  const { collection, model, loading, error, warning, retry } = useCollection();
  const [selectedPen, setSelectedPen] = useState("");
  const [selected, setSelected] = useState(""),
    [paletteId, setPaletteId] = useState("");
  const [draft, setDraft] = useState<
    (Omit<DeskArrangement, "id"> & { id: string | null }) | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dialog, setDialog] = useState<
    | { kind: "refill"; penId?: string; entry?: JournalEntry }
    | { kind: "writing"; entry: JournalEntry }
    | { kind: "activity" }
    | null
  >(null);
  const command = useCommand();
  const [notice, setNotice] = useState("");
  const canEdit = !!collection.canEdit;
  const currentIds = new Set(
    model.inked.flatMap((p) => model.latest.get(p.id)?.inkIds || []),
  );
  const currentInks = sortInksByColor(
    collection.inks.filter((ink) => currentIds.has(ink.id)),
  );
  const palettes = model.palettes.length
    ? model.palettes
    : [{ id: "default", name: "My palette", items: model.palette }];
  const palette = palettes.find((p) => p.id === paletteId) || palettes[0];
  const editing = canEdit && !!draft;
  const items = reconcilePalette(
    editing ? draft.items : palette.items,
    currentInks,
  );
  const visible = items.filter(
    (item) => !item.omitted && currentIds.has(item.inkId),
  );
  const activeInk = model.inkById.get(
    visible.some((item) => item.inkId === selected)
      ? selected
      : visible[0]?.inkId,
  );
  const activePens = activeInk ? model.currentPens(activeInk.id) : [];
  const activePenId = activePens.some((p) => p.id === selectedPen)
    ? selectedPen
    : activePens[0]?.id;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const begin = (mode: "edit" | "new" | "copy") => {
    setConfirmDelete(false);
    setDraft({
      id: mode === "edit" ? palette.id : null,
      name:
        mode === "new"
          ? ""
          : mode === "copy"
            ? `${palette.name} copy`.slice(0, 80)
            : palette.name,
      items: reconcilePalette(mode === "new" ? [] : palette.items, currentInks),
    });
  };
  return (
    <div className="desk-shell">
      <a className="desk-skip" href="#desk-main">
        Skip to desk
      </a>
      <header className="desk-rail">
        <Text fontFamily="pixel" fontSize={24}>
          FOUNTAIN <span style={{ color: "#ec5b4c" }}>P</span>
          <span style={{ color: "#38a169" }}>E</span>
          <span style={{ color: "#1686ed" }}>N</span>
          <span className="brand-mark">S</span>
        </Text>
        <nav className="desk-rail-nav">
          <Action className="nav-active" onPress={() => setDialog(null)}>
            My desk
          </Action>
          <Action onPress={() => setDialog({ kind: "activity" })}>
            Activity
          </Action>
        </nav>
      </header>
      <main id="desk-main" className="desk-main">
        <XStack
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={16}
          marginBottom={28}
        >
          <YStack gap={8}>
            <H1 fontSize={34} lineHeight="42px">
              My desk<span className="brand-mark">_</span>
            </H1>
            <Muted>
              {model.inked.length} inked pens · {currentInks.length} colors ·{" "}
              {model.activePens.filter((p) => p.needsRefill).length} need refill
            </Muted>
          </YStack>
          <Access canEdit={canEdit} />
        </XStack>
        {loading ? (
          <Muted role="status">Loading collection…</Muted>
        ) : error ? (
          <Panel>
            <Failure error={error} />
            <Action onPress={() => void retry()}>Retry connection</Action>
          </Panel>
        ) : (
          <>
            <Failure error={warning} />
            <Failure error={command.error} />
            <Muted role="status">{notice}</Muted>
            <div className="desk-workbench">
              <YStack gap={20}>
                <XStack gap={8} flexWrap="wrap" alignItems="center">
                  {palettes.map((p) => (
                    <Action
                      key={p.id}
                      disabled={editing || command.busy}
                      aria-pressed={p.id === palette.id}
                      onPress={() => {
                        setPaletteId(p.id);
                        setSelected("");
                        setConfirmDelete(false);
                      }}
                    >
                      {p.name}
                    </Action>
                  ))}
                </XStack>
                {canEdit && (
                  <XStack gap={8} flexWrap="wrap">
                    {editing ? (
                      <>
                        <Primary
                          disabled={command.busy || !draft.name.trim()}
                          onPress={() =>
                            void command.run(
                              async () => {
                                const saved = await saveNamedPalette(
                                  draft.id,
                                  draft.name.trim(),
                                  items,
                                );
                                setPaletteId(saved.id);
                              },
                              () => {
                                setDraft(null);
                                setNotice("Palette saved.");
                              },
                            )
                          }
                        >
                          {command.busy ? "Saving…" : "Save palette"}
                        </Primary>
                        <Action
                          disabled={command.busy}
                          onPress={() => setDraft(null)}
                        >
                          Cancel
                        </Action>
                      </>
                    ) : (
                      <>
                        <Action onPress={() => begin("edit")}>
                          Edit palette
                        </Action>
                        <Action onPress={() => begin("new")}>New</Action>
                        <Action onPress={() => begin("copy")}>Duplicate</Action>
                        <Action onPress={() => setConfirmDelete(true)}>
                          Delete
                        </Action>
                      </>
                    )}
                  </XStack>
                )}
                {editing && (
                  <YStack gap={8}>
                    <Label htmlFor="palette-name">Palette name</Label>
                    <Input
                      id="palette-name"
                      maxLength={80}
                      value={draft.name}
                      disabled={command.busy}
                      onChangeText={(name) => setDraft({ ...draft, name })}
                    />
                  </YStack>
                )}
                {confirmDelete && canEdit && (
                  <Panel>
                    <Text>Delete “{palette.name}”?</Text>
                    <XStack gap={8}>
                      <Action
                        disabled={command.busy}
                        onPress={() =>
                          void command.run(
                            () => deleteNamedPalette(palette.id),
                            () => {
                              setConfirmDelete(false);
                              setPaletteId("");
                              setNotice("Palette deleted.");
                            },
                          )
                        }
                      >
                        Confirm delete
                      </Action>
                      <Action onPress={() => setConfirmDelete(false)}>
                        Keep palette
                      </Action>
                    </XStack>
                  </Panel>
                )}
                <DndContext
                  sensors={sensors}
                  onDragEnd={({ active, over }) => {
                    if (editing && !command.busy && over)
                      setDraft({
                        ...draft,
                        items: movePalette(
                          items,
                          String(active.id),
                          String(over.id),
                        ),
                      });
                  }}
                >
                  <SortableContext
                    items={visible.map((item) => item.inkId)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="desk-swatches">
                      {visible.map((item) => (
                        <Swatch
                          key={item.inkId}
                          ink={model.inkById.get(item.inkId)!}
                          selected={activeInk?.id === item.inkId}
                          select={() => setSelected(item.inkId)}
                          editing={editing && !command.busy}
                          omit={() =>
                            editing &&
                            setDraft({
                              ...draft,
                              items: items.map((i) =>
                                i.inkId === item.inkId
                                  ? { ...i, omitted: true }
                                  : i,
                              ),
                            })
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {!visible.length && (
                  <Muted>
                    {currentInks.length
                      ? "No colors in this palette."
                      : "No currently inked pens."}
                  </Muted>
                )}
                {editing &&
                  items.some((i) => i.omitted && currentIds.has(i.inkId)) && (
                    <YStack gap={8}>
                      <Muted>Omitted colors</Muted>
                      <XStack gap={6} flexWrap="wrap">
                        {items
                          .filter((i) => i.omitted && currentIds.has(i.inkId))
                          .map((item) => (
                            <Action
                              key={item.inkId}
                              disabled={command.busy}
                              onPress={() =>
                                setDraft({
                                  ...draft,
                                  items: items.map((i) =>
                                    i.inkId === item.inkId
                                      ? { ...i, omitted: false }
                                      : i,
                                  ),
                                })
                              }
                            >
                              Restore {model.inkById.get(item.inkId)?.name}
                            </Action>
                          ))}
                      </XStack>
                    </YStack>
                  )}
              </YStack>
              <YStack className="desk-active" gap={16}>
                <Panel>
                  {activeInk ? (
                    <>
                      <Muted>SELECTED INK</Muted>
                      <H2 fontSize={26} lineHeight="32px">
                        {activeInk.name}
                      </H2>
                      <Muted>
                        {activeInk.brand} · {activeInk.collection}
                      </Muted>
                      <YStack
                        height={8}
                        borderRadius={4}
                        backgroundColor={getSwatch(activeInk)?.hex || "#ddd"}
                      />
                      {activePens.length > 1 && (
                        <YStack gap={6}>
                          {activePens.map((pen) => (
                            <Action
                              key={pen.id}
                              height="auto"
                              minHeight={38}
                              padding={8}
                              justifyContent="flex-start"
                              aria-pressed={pen.id === activePenId}
                              onPress={() => setSelectedPen(pen.id)}
                            >
                              {penLabel(pen)} · {pen.color} · {pen.nibSize}
                            </Action>
                          ))}
                        </YStack>
                      )}
                      {activePens
                        .filter((pen) => pen.id === activePenId)
                        .map((pen) => {
                          const entry = model.latest.get(pen.id)!;
                          const logs = model.writingLogs
                            .filter((log) => log.refillId === entry.id)
                            .sort((a, b) =>
                              b.writtenOn.localeCompare(a.writtenOn),
                            );
                          const used = logs.some(
                            (log) => log.writtenOn === today(),
                          );
                          return (
                            <YStack
                              key={pen.id}
                              gap={10}
                              paddingTop={10}
                              borderTopWidth={1}
                              borderColor="borderColor"
                            >
                              <Text fontSize={14}>{penLabel(pen)}</Text>
                              <Muted>{penDescription(pen)}</Muted>
                              <Muted>
                                Filled {entry.date}
                                {entry.inkIds.length > 1
                                  ? ` · Mix: ${entry.inkIds.map((id) => inkLabel(model.inkById.get(id))).join(" + ")}`
                                  : ""}
                                {entry.notPure ? " · Residual ink" : ""}
                              </Muted>
                              <Muted>
                                Last written:{" "}
                                {logs[0]?.writtenOn || "Not recorded"}
                              </Muted>
                              {canEdit && (
                                <Primary
                                  disabled={command.busy || used || !entry.id}
                                  onPress={() =>
                                    void command.run(
                                      () => saveWritingLog(entry.id!, today()),
                                      () =>
                                        setNotice(
                                          `Writing day saved for ${penLabel(pen)}.`,
                                        ),
                                    )
                                  }
                                >
                                  {used ? "✓ Written today" : "Wrote today"}
                                </Primary>
                              )}
                              <XStack gap={6} flexWrap="wrap">
                                <Action
                                  onPress={() =>
                                    setDialog({ kind: "writing", entry })
                                  }
                                >
                                  Writing history
                                </Action>
                                {canEdit && (
                                  <Action
                                    onPress={() =>
                                      setDialog({
                                        kind: "refill",
                                        penId: pen.id,
                                      })
                                    }
                                  >
                                    Refill / clean
                                  </Action>
                                )}
                              </XStack>
                            </YStack>
                          );
                        })}
                      {!activePens.length && (
                        <Muted>No current pens use this ink.</Muted>
                      )}
                    </>
                  ) : (
                    <Muted>Select a color to see its pens.</Muted>
                  )}
                </Panel>
                {canEdit && (
                  <Primary onPress={() => setDialog({ kind: "refill" })}>
                    + Refill or clean a pen
                  </Primary>
                )}
                <Panel>
                  <Text fontSize={14}>Refill queue</Text>
                  {model.activePens
                    .filter((p) => p.needsRefill)
                    .map((p) => (
                      <YStack key={p.id} gap={5}>
                        <Text fontSize={12}>{penLabel(p)}</Text>
                        <Muted>{penDescription(p)}</Muted>
                        {canEdit && (
                          <Action
                            onPress={() =>
                              setDialog({ kind: "refill", penId: p.id })
                            }
                          >
                            Fill this pen
                          </Action>
                        )}
                      </YStack>
                    ))}
                  {!model.activePens.some((p) => p.needsRefill) && (
                    <Muted>No pens waiting.</Muted>
                  )}
                </Panel>
              </YStack>
            </div>
          </>
        )}
      </main>
      {dialog?.kind === "refill" && canEdit && (
        <RefillEditor
          collection={collection}
          model={model}
          entry={dialog.entry}
          penId={dialog.penId}
          close={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "writing" && (
        <WritingEditor
          entry={dialog.entry}
          collection={collection}
          close={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "activity" && (
        <Modal title="Refill activity" close={() => setDialog(null)}>
          <Muted>{model.journal.length} events · newest first</Muted>
          <YStack gap={16}>
            {model.journal.map((entry) => (
              <YStack key={entry.id || entry.index} gap={8}>
                <Text fontSize={13}>
                  {entry.date} · {penLabel(model.penById.get(entry.penId))}
                </Text>
                <Muted>
                  {isCleaning(entry)
                    ? "Cleaned & empty"
                    : entry.inkIds
                        .map((id) => inkLabel(model.inkById.get(id)))
                        .join(" + ")}
                  {entry.notPure ? " · Residual ink" : ""}
                </Muted>
                {entry.notes && <Muted>{entry.notes}</Muted>}
                <XStack gap={5} flexWrap="wrap">
                  {!isCleaning(entry) && (
                    <Action
                      onPress={() => setDialog({ kind: "writing", entry })}
                    >
                      Writing history
                    </Action>
                  )}
                  {canEdit && (
                    <Action
                      onPress={() => setDialog({ kind: "refill", entry })}
                    >
                      Correct refill
                    </Action>
                  )}
                </XStack>
              </YStack>
            ))}
          </YStack>
        </Modal>
      )}
    </div>
  );
}
