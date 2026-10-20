import { useCommand } from "./desk/useCommand";
import { useEffect, useState } from "react";
import { H1, H2, Input, Text, XStack, YStack, toast } from "tamagui";
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
  currentlyInkedColors,
  movePalette,
  type DeskArrangement,
} from "./lib/deskPalette";
import {
  getSwatch,
  inkLabel,
  today,
  isCleaning,
  type JournalEntry,
} from "./lib/collection";
import type { Ink } from "./models/types";
import { Action, Primary, Muted, Panel, Failure } from "./desk/ui";
import { CollectionView } from "./desk/CollectionView";
import { PaletteMenu } from "./desk/PaletteMenu";
import {
  PenIdentity,
  InkIdentity,
  InkDetails,
  DateStamp,
} from "./desk/Identity";
import { Icon } from "./desk/Icon";
import { PaletteCreate } from "./desk/PaletteCreate";
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
      <InkIdentity ink={ink} />
      {editing && (
        <XStack gap={4}>
          <button
            type="button"
            className="drag-handle"
            ref={sort.setActivatorNodeRef}
            {...sort.attributes}
            {...sort.listeners}
            aria-label={`Move ${inkLabel(ink)}`}
          >
            <Icon name="grip" />
          </button>
          <Action
            height={36}
            fontSize={10}
            aria-label={`Omit ${inkLabel(ink)}`}
            onPress={omit}
          >
            <Icon name="minus" />
          </Action>
        </XStack>
      )}
    </YStack>
  );
}
const views = {
  desk: "My desk",
  inks: "Inks",
  pens: "Pens",
  refills: "Refills",
};
type View = keyof typeof views;
const readView = () => {
  const hash = location.hash.slice(1);
  const key = hash === "activity" || hash === "queue" ? "refills" : hash;
  return (key in views ? key : "desk") as View;
};

export function App() {
  const { collection, model, loading, error, warning, retry } = useCollection();
  const [view, setView] = useState<View>(readView);
  useEffect(() => {
    const navigate = () => setView(readView());
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    document.title = `Fountain Pens · ${views[view]}`;
  }, [view]);
  const [lastSelected, setLastSelected] = useState("");
  const [selectedPen, setSelectedPen] = useState("");
  const [selected, setSelected] = useState(""),
    [paletteId, setPaletteId] = useState("");
  const [draft, setDraft] = useState<
    (Omit<DeskArrangement, "id"> & { id: string | null }) | null
  >(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dialog, setDialog] = useState<
    | { kind: "refill"; penId?: string; entry?: JournalEntry }
    | { kind: "writing"; entry: JournalEntry }
    | null
  >(null);
  const command = useCommand();
  const canEdit = !!collection.canEdit;
  const currentInks = currentlyInkedColors(collection.inks, model);
  const currentIds = new Set(currentInks.map((ink) => ink.id));
  const palettes = model.palettes.length
    ? model.palettes
    : model.palette.length
      ? [{ id: "default", name: "My palette", items: model.palette }]
      : [];
  const palette = palettes.find((p) => p.id === paletteId);
  const isAll = !palette;
  const editing = canEdit && !!draft;
  const items = reconcilePalette(
    editing ? draft.items : palette?.items || [],
    currentInks,
  );
  const visible = items.filter(
    (item) => !item.omitted && currentIds.has(item.inkId),
  );
  const selectionOpen = visible.some((item) => item.inkId === selected);
  const activeInk = model.inkById.get(selected || lastSelected);
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
  const begin = (mode: "edit" | "copy") => {
    if (!palette) return;
    setConfirmDelete(false);
    setDraft({
      id: mode === "edit" ? palette.id : null,
      name:
        mode === "copy" ? `${palette.name} copy`.slice(0, 80) : palette.name,
      items: reconcilePalette(palette.items, currentInks),
    });
  };
  return (
    <div className="desk-shell" data-view={view}>
      <a
        className="desk-skip"
        href="#desk-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("desk-main")?.focus();
        }}
      >
        Skip to desk
      </a>
      <header className="desk-rail">
        <Text fontFamily="pixel" fontSize={24}>
          FOUNTAIN <span style={{ color: "#ec5b4c" }}>P</span>
          <span style={{ color: "#38a169" }}>E</span>
          <span style={{ color: "#1686ed" }}>N</span>
          <span className="brand-mark">S</span>
        </Text>
        <div className="header-access">
          <Access canEdit={canEdit} />
        </div>
        <nav className="desk-rail-nav" aria-label="Collection">
          {Object.entries(views).map(([key, title]) => (
            <a
              key={key}
              href={`#${key}`}
              aria-current={view === key ? "page" : undefined}
              className={view === key ? "nav-active" : ""}
            >
              {title}
            </a>
          ))}
        </nav>
      </header>
      <main id="desk-main" className="desk-main" tabIndex={-1}>
        <XStack
          className="page-heading"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={16}
          marginBottom={28}
        >
          <YStack gap={8} width="100%">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={24}
            >
              <H1 fontWeight="700" fontSize={34} lineHeight="42px">
                {views[view]}
                <span className="brand-mark">_</span>
              </H1>
              {canEdit &&
                !loading &&
                !error &&
                (view === "desk" || view === "refills") && (
                  <XStack
                    gap={8}
                    flexWrap="wrap"
                    alignItems="center"
                    justifyContent="flex-end"
                    marginLeft="auto"
                  >
                    {view === "desk" && (
                      <Primary
                        disabled={command.busy}
                        onPress={() => setCreating(true)}
                      >
                        <Icon name="plus" /> New palette
                      </Primary>
                    )}
                    {view === "refills" && (
                      <Primary
                        borderColor="#f3d51b"
                        onPress={() => setDialog({ kind: "refill" })}
                      >
                        <Icon name="plus" /> New refill log
                      </Primary>
                    )}
                  </XStack>
                )}
            </XStack>
            <Muted className="page-caption">
              {view === "desk"
                ? `${model.inked.length} inked pens · ${model.activePens.filter((p) => p.needsRefill).length} need refill`
                : view === "refills"
                  ? `${model.journal.length} refill logs · newest first`
                  : view === "pens"
                    ? `${model.activePens.length} pens · ${model.inked.length} currently inked`
                    : `${collection.inks.filter((i) => !i.archived).length} inks · ${currentInks.length} currently in use`}
            </Muted>
          </YStack>
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
            {(view === "pens" || view === "inks") && (
              <CollectionView
                key={view}
                kind={view}
                collection={collection}
                model={model}
              />
            )}
            {view === "desk" && (
              <div className="desk-workbench">
                <YStack gap={20}>
                  <div className="palette-controls">
                    <label
                      className="visually-hidden"
                      htmlFor={editing ? "palette-name" : "saved-palette"}
                    >
                      {editing
                        ? draft.id
                          ? "Edit palette"
                          : "New palette"
                        : "Saved palette"}
                    </label>
                    <div className="palette-toolbar">
                      {!editing && (
                        <button
                          className="all-palette"
                          aria-pressed={isAll}
                          disabled={command.busy}
                          onClick={() => {
                            setPaletteId("");
                            setSelected("");
                            setConfirmDelete(false);
                          }}
                        >
                          <strong>
                            <span className="palette-radio" aria-hidden="true">
                              {isAll && <Icon name="check" />}
                            </span>
                            All
                          </strong>
                          <span>Currently inked · {currentInks.length}</span>
                        </button>
                      )}
                      <div className="palette-choice">
                        {editing ? (
                          <Input
                            id="palette-name"
                            maxLength={80}
                            value={draft.name}
                            disabled={command.busy}
                            onChangeText={(name) =>
                              setDraft({ ...draft, name })
                            }
                          />
                        ) : (
                          <select
                            id="saved-palette"
                            name="saved-palette"
                            value={palette?.id || ""}
                            disabled={
                              editing || command.busy || !palettes.length
                            }
                            onChange={(event) => {
                              setPaletteId(event.target.value);
                              setSelected("");
                              setConfirmDelete(false);
                            }}
                          >
                            <option value="" disabled>
                              Select custom palette
                            </option>
                            {palettes.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {!editing && (
                          <span className="select-chevron">
                            <Icon name="chevron" />
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <XStack
                          className="palette-actions"
                          role="group"
                          aria-label="Palette actions"
                          gap={8}
                          flexWrap="wrap"
                          alignItems="center"
                        >
                          {editing ? (
                            <>
                              <Action
                                backgroundColor="#226943"
                                color="white"
                                borderColor="#226943"
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
                                      toast.success(
                                        draft.id ? "Saved" : "Created",
                                      );
                                    },
                                  )
                                }
                              >
                                {command.busy ? "Saving…" : "Save"}
                              </Action>
                              <Action
                                backgroundColor="transparent"
                                borderColor="transparent"
                                disabled={command.busy}
                                onPress={() => setDraft(null)}
                              >
                                Cancel
                              </Action>
                            </>
                          ) : palette ? (
                            <PaletteMenu
                              key={palette.id}
                              name={palette.name}
                              disabled={command.busy}
                              edit={() => begin("edit")}
                              duplicate={() => begin("copy")}
                              remove={() => setConfirmDelete(true)}
                            />
                          ) : null}
                        </XStack>
                      )}
                    </div>
                  </div>
                  {confirmDelete && canEdit && palette && (
                    <Panel>
                      <Text>Delete “{palette.name}”?</Text>
                      <XStack gap={8}>
                        <Action
                          className="action-danger"
                          disabled={command.busy}
                          onPress={() =>
                            void command.run(
                              () => deleteNamedPalette(palette.id),
                              () => {
                                setConfirmDelete(false);
                                setPaletteId("");
                                toast.success("Deleted");
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
                  {editing && (
                    <div className="palette-bulk">
                      <Action
                        disabled={command.busy || !visible.length}
                        onPress={() =>
                          setDraft({
                            ...draft,
                            items: items.map((i) =>
                              currentIds.has(i.inkId)
                                ? { ...i, omitted: true }
                                : i,
                            ),
                          })
                        }
                      >
                        <Icon name="minus" /> Omit all
                      </Action>
                      <Action
                        disabled={
                          command.busy ||
                          !items.some(
                            (i) => i.omitted && currentIds.has(i.inkId),
                          )
                        }
                        onPress={() =>
                          setDraft({
                            ...draft,
                            items: items.map((i) =>
                              currentIds.has(i.inkId)
                                ? { ...i, omitted: false }
                                : i,
                            ),
                          })
                        }
                      >
                        <Icon name="restore" /> Restore all
                      </Action>
                    </div>
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
                            selected={
                              selectionOpen && activeInk?.id === item.inkId
                            }
                            select={() => {
                              setLastSelected(item.inkId);
                              setSelected(
                                selected === item.inkId ? "" : item.inkId,
                              );
                            }}
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
                                <Icon name="restore" />
                                <span className="restore-label">Restore</span>
                                <span
                                  className="restore-swatch"
                                  style={{
                                    background:
                                      getSwatch(model.inkById.get(item.inkId)!)
                                        ?.hex || "#e2e2e5",
                                  }}
                                />
                                <strong>
                                  {model.inkById.get(item.inkId)?.name}
                                </strong>
                              </Action>
                            ))}
                        </XStack>
                      </YStack>
                    )}
                </YStack>
                <YStack className="desk-active" gap={16}>
                  <div className="selection-slot">
                    <div className="selection-empty" hidden={selectionOpen}>
                      <Text fontSize={18}>No ink selected</Text>
                      <Muted>
                        Select a swatch to see its pens and writing history.
                      </Muted>
                    </div>
                    <div
                      className={`selected-panel ${selectionOpen ? "is-open" : ""}`}
                      inert={!selectionOpen}
                      aria-hidden={!selectionOpen}
                    >
                      <Panel>
                        {activeInk ? (
                          <>
                            <XStack gap={12} alignItems="flex-start">
                              <div className="ink-identity">
                                <H2
                                  fontWeight="700"
                                  fontSize={26}
                                  lineHeight="32px"
                                >
                                  {activeInk.name}
                                </H2>
                                <InkDetails ink={activeInk} />
                              </div>
                              <Action
                                flexShrink={0}
                                aria-label="Deselect ink"
                                onPress={() => {
                                  document
                                    .querySelector<HTMLButtonElement>(
                                      '.desk-swatch[aria-pressed="true"]',
                                    )
                                    ?.focus();
                                  setSelected("");
                                }}
                              >
                                <Icon name="close" />
                              </Action>
                            </XStack>
                            <YStack
                              className="selected-ink-color"
                              height={8}
                              borderRadius={4}
                              backgroundColor={
                                getSwatch(activeInk)?.hex || "#ddd"
                              }
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
                                    <PenIdentity pen={pen} />
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
                                    {activePens.length === 1 && (
                                      <PenIdentity pen={pen} />
                                    )}
                                    <div className="pen-facts">
                                      <div>
                                        <span>Filled</span>
                                        <DateStamp value={entry.date} />
                                      </div>
                                      <div>
                                        <span>Last written</span>
                                        {logs[0] ? (
                                          <DateStamp
                                            value={logs[0].writtenOn}
                                          />
                                        ) : (
                                          <strong>Not recorded</strong>
                                        )}
                                      </div>
                                    </div>
                                    {(entry.inkIds.length > 1 ||
                                      entry.notPure) && (
                                      <Muted>
                                        {entry.inkIds.length > 1
                                          ? `Mix: ${entry.inkIds.map((id) => inkLabel(model.inkById.get(id))).join(" + ")}`
                                          : ""}
                                        {entry.notPure
                                          ? `${entry.inkIds.length > 1 ? " · " : ""}Residual ink`
                                          : ""}
                                      </Muted>
                                    )}

                                    <div className="ink-actions">
                                      {canEdit && (
                                        <Primary
                                          disabled={
                                            command.busy || used || !entry.id
                                          }
                                          onPress={() =>
                                            void command.run(
                                              () =>
                                                saveWritingLog(
                                                  entry.id!,
                                                  today(),
                                                ),
                                              () =>
                                                toast.success(
                                                  "Writing day saved",
                                                ),
                                            )
                                          }
                                        >
                                          {used ? (
                                            <>
                                              <Icon name="check" /> Logged today
                                            </>
                                          ) : (
                                            "Log writing today"
                                          )}
                                        </Primary>
                                      )}
                                      <XStack gap={6} flexWrap="wrap">
                                        <Action
                                          onPress={() =>
                                            setDialog({
                                              kind: "writing",
                                              entry,
                                            })
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
                                            New refill log
                                          </Action>
                                        )}
                                      </XStack>
                                    </div>
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
                    </div>
                  </div>
                </YStack>
              </div>
            )}
          </>
        )}
        {view === "refills" && !loading && !error && (
          <div className="refills-layout">
            <section className="activity-view" aria-label="Refill activity">
              <YStack gap={16}>
                {model.journal.map((entry) => (
                  <YStack
                    className="activity-entry"
                    key={entry.id || entry.index}
                    gap={8}
                  >
                    <div className="activity-content">
                      <div className="activity-heading">
                        <PenIdentity pen={model.penById.get(entry.penId)!} />
                        <DateStamp value={entry.date} />
                      </div>
                      <div className="activity-inks">
                        {isCleaning(entry) ? (
                          <Muted>Cleaned & empty</Muted>
                        ) : (
                          entry.inkIds.map((id, index) => (
                            <span className="activity-ink" key={id}>
                              {index > 0 && (
                                <span className="ink-separator">+</span>
                              )}
                              <InkIdentity
                                ink={model.inkById.get(id)!}
                                compact
                              />
                            </span>
                          ))
                        )}
                        {entry.notPure && (
                          <span className="status status-neutral">
                            Residual ink
                          </span>
                        )}
                      </div>
                      {entry.notes && <Muted>{entry.notes}</Muted>}
                    </div>
                    <XStack
                      className="activity-actions"
                      gap={5}
                      flexWrap="wrap"
                    >
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
            </section>
            <aside className="queue-view" aria-label="Refill queue">
              {" "}
              <Panel>
                <Text fontSize={16} fontWeight="700">
                  Refill queue
                </Text>
                {model.activePens
                  .filter((p) => p.needsRefill)
                  .map((p) => (
                    <YStack key={p.id} gap={5}>
                      <PenIdentity pen={p} />
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
            </aside>
          </div>
        )}
      </main>
      {creating && canEdit && (
        <PaletteCreate
          items={reconcilePalette([], currentInks)}
          hasUnsavedChanges={
            !!draft &&
            (draft.id === null ||
              draft.name !== palette?.name ||
              JSON.stringify(items) !==
                JSON.stringify(
                  reconcilePalette(palette?.items || [], currentInks),
                ))
          }
          close={() => setCreating(false)}
          created={(saved) => {
            setPaletteId(saved.id);
            setDraft(saved);
            setConfirmDelete(false);
            setCreating(false);
          }}
        />
      )}
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
    </div>
  );
}
