import { useState } from "react";
import {
  Button,
  Dialog,
  H1,
  H2,
  Input,
  Label,
  Paragraph,
  Separator,
  Text,
  XStack,
  YStack,
  styled,
} from "tamagui";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  inks,
  initialPalettes,
  initialRefills,
  recordDay,
  moveInk,
  localDate,
  fillPen,
  inkTextColor,
} from "./model";

const Action = styled(Button, {
  name: "DeskAction",
  height: "control",
  borderRadius: "control",
  fontSize: 13,
  fontWeight: "400",
  borderWidth: 1,
  borderColor: "borderColor",
  backgroundColor: "surface",
  color: "color",
});
const Primary = styled(Action, {
  name: "DeskPrimary",
  backgroundColor: "accent",
  color: "accentText",
  borderColor: "accent",
});
const Muted = styled(Text, {
  name: "DeskMuted",
  color: "muted",
  fontSize: 12,
  lineHeight: "18px",
});
const Panel = styled(YStack, {
  name: "DeskPanel",
  backgroundColor: "surface",
  borderRadius: "panel",
  borderWidth: 1,
  borderColor: "borderColor",
  padding: "section",
  gap: "stack",
});
const Eyebrow = styled(Text, {
  name: "DeskEyebrow",
  fontSize: 11,
  fontWeight: "400",
  color: "muted",
});
function Swatch({
  id,
  selected,
  onSelect,
  editing,
  onRemove,
}: {
  id: number;
  selected: boolean;
  onSelect: () => void;
  editing: boolean;
  onRemove: () => void;
}) {
  const ink = inks[id];
  const sort = useSortable({ id, disabled: !editing });
  return (
    <YStack
      ref={(node) => sort.setNodeRef(node as HTMLElement | null)}
      style={{
        transform: CSS.Transform.toString(sort.transform),
        transition: sort.transition,
      }}
      gap={5}
    >
      <Button
        position="relative"
        className="lab-swatch"
        aria-label={`${ink.name}, ${ink.brand}`}
        aria-pressed={selected}
        onPress={onSelect}
        height={112}
        padding={0}
        borderRadius={6}
        overflow="hidden"
        backgroundColor={ink.color}
        borderWidth={selected ? 3 : 0}
        borderColor="white"
      >
        <YStack position="absolute" bottom={12} left={13} right={13}>
          <Text color="white" fontFamily="body" fontSize={23} opacity={0.85}>
            Aa
          </Text>
          <XStack marginTop={8} gap={4}>
            {[0.85, 0.5, 0.25].map((o) => (
              <YStack
                key={o}
                height={3}
                flex={1}
                backgroundColor="white"
                opacity={o}
              />
            ))}
          </XStack>
        </YStack>
      </Button>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={12} fontWeight="400">
          {ink.name}
        </Text>
        {selected && (
          <Text color="color" fontSize={12}>
            ●
          </Text>
        )}
      </XStack>
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
            aria-label={`Move ${ink.name}`}
          >
            ↔ Move
          </Action>
          <Action
            height={28}
            paddingHorizontal={7}
            aria-label={`Remove ${ink.name} from palette`}
            onPress={onRemove}
          >
            ×
          </Action>
        </XStack>
      )}
    </YStack>
  );
}
export function DeskLab() {
  const [palettes, setPalettes] = useState(initialPalettes);
  const [palette, setPalette] = useState(0);
  const [selected, setSelected] = useState(4);
  const [refills, setRefills] = useState(initialRefills);
  const [active, setActive] = useState("r1");
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<
    "write" | "refill" | "palette" | "reference" | null
  >(null);
  const [date, setDate] = useState(localDate());
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"desk" | "activity">("desk");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ink = inks[selected];
  const current = refills.filter((r) => !r.closed);
  const matching = current.filter((r) => r.inks.includes(selected));
  const refill = matching.find((r) => r.id === active) ?? matching[0];
  function selectInk(id: number) {
    setSelected(id);
    setActive(refills.find((r) => !r.closed && r.inks.includes(id))?.id ?? "");
  }
  function reorder(event: DragEndEvent) {
    if (event.over)
      setPalettes((p) =>
        p.map((v, i) =>
          i === palette
            ? {
                ...v,
                ids: moveInk(
                  v.ids,
                  Number(event.active.id),
                  Number(event.over!.id),
                ),
              }
            : v,
        ),
      );
  }
  function logWriting() {
    if (!refill || !date || date > localDate() || date < refill.filled) return;
    setRefills((r) => recordDay(r, refill.id, date));
    setNotice(`Writing saved · ${refill.pen} · ${date}`);
    setDialog(null);
  }
  const activity = refills
    .flatMap((r) => r.days.map((day) => ({ day, refill: r })))
    .sort((a, b) => b.day.localeCompare(a.day));
  return (
    <div className="lab-shell">
      <a href="#main" className="lab-skip">
        Skip to desk
      </a>
      <aside className="lab-rail">
        <YStack gap={8}>
          <Text
            fontSize={25}
            fontFamily="pixel"
            fontWeight="400"
            letterSpacing={0}
          >
            <span className="brand-mark" aria-hidden="true">
              ◆
            </span>{" "}
            fount<span style={{ color: "#e94b58" }}>a</span>
            <span style={{ color: "#30a46c" }}>i</span>
            <span style={{ color: "#1686ed" }}>n</span>
          </Text>
        </YStack>
        <YStack className="lab-rail-nav" gap={8}>
          <Action
            justifyContent="flex-start"
            className={tab === "desk" ? "nav-active" : ""}
            backgroundColor="transparent"
            onPress={() => setTab("desk")}
          >
            ▦ My Desk
          </Action>
          <Action
            justifyContent="flex-start"
            className={tab === "activity" ? "nav-active" : ""}
            backgroundColor="transparent"
            onPress={() => setTab("activity")}
          >
            ◷ Activity
          </Action>
          <Action
            justifyContent="flex-start"
            backgroundColor="transparent"
            onPress={() => setDialog("reference")}
          >
            ▤ Collection
          </Action>
        </YStack>
      </aside>
      <main id="main" className="lab-main">
        <XStack
          justifyContent="space-between"
          alignItems="center"
          gap={16}
          flexWrap="wrap"
          marginBottom={28}
        >
          <YStack gap={8}>
            <Eyebrow>
              {tab === "desk" ? "Personal collection" : "Your refill journal"}
            </Eyebrow>
            <H1
              fontFamily="heading"
              fontSize={34}
              lineHeight="44px"
              fontWeight="400"
              letterSpacing={-1}
            >
              {tab === "desk" ? "My Desk" : "Writing activity"}
            </H1>
          </YStack>
          <XStack gap={10} alignItems="center">
            <Muted>
              {current.length} pens · {inks.length} inks
            </Muted>
            <Text
              backgroundColor="soft"
              color="color"
              paddingHorizontal={12}
              paddingVertical={7}
              borderRadius={6}
              fontSize={11}
            >
              Local demo
            </Text>
          </XStack>
        </XStack>
        {tab === "activity" ? (
          <Panel>
            <XStack justifyContent="space-between">
              <H2 fontSize={22}>Recent writing</H2>
              <Muted>{activity.length} writing days across refills</Muted>
            </XStack>
            {activity.map(({ day, refill: r }) => (
              <XStack
                key={r.id + day}
                alignItems="center"
                gap={16}
                paddingVertical={10}
                borderBottomWidth={1}
                borderColor="borderColor"
              >
                <Text width={88} fontSize={12}>
                  {day}
                </Text>
                <YStack
                  width={10}
                  height={32}
                  borderRadius={5}
                  backgroundColor={inks[r.inks[0]].color}
                />
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="400">
                    {r.pen}
                  </Text>
                  <Muted>{r.inks.map((id) => inks[id].name).join(" + ")}</Muted>
                </YStack>
                {r.closed ? (
                  <Muted>Previous refill</Muted>
                ) : (
                  <Action
                    onPress={() => {
                      selectInk(r.inks[0]);
                      setActive(r.id);
                      setTab("desk");
                    }}
                  >
                    Open refill ↗
                  </Action>
                )}
              </XStack>
            ))}
          </Panel>
        ) : (
          <div className="lab-workbench">
            <YStack gap={20}>
              <XStack
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={10}
              >
                <YStack gap={5}>
                  <H2 fontFamily="heading" fontSize={21} fontWeight="400">
                    Color palettes
                  </H2>
                  <Muted>
                    {palettes[palette].ids.length} colors ·{" "}
                    {palettes[palette].name}
                  </Muted>
                </YStack>
                <XStack gap={6}>
                  <Action onPress={() => setEditing(!editing)}>
                    {editing ? "Done" : "Arrange"}
                  </Action>
                  <Action
                    aria-label="Create palette"
                    onPress={() => setDialog("palette")}
                  >
                    ＋
                  </Action>
                </XStack>
              </XStack>
              <XStack gap={7} flexWrap="wrap">
                {palettes.map((p, i) => (
                  <Action
                    key={p.name}
                    height={32}
                    fontSize={11}
                    borderRadius={6}
                    backgroundColor={i === palette ? "soft" : "transparent"}
                    borderColor={
                      i === palette ? "selectedBorder" : "borderColor"
                    }
                    onPress={() => {
                      setPalette(i);
                      setEditing(false);
                    }}
                  >
                    {p.name}
                  </Action>
                ))}
              </XStack>
              <DndContext sensors={sensors} onDragEnd={reorder}>
                <SortableContext
                  items={palettes[palette].ids}
                  strategy={rectSortingStrategy}
                >
                  <div className="lab-swatches">
                    {palettes[palette].ids.map((id) => (
                      <Swatch
                        key={id}
                        id={id}
                        selected={selected === id}
                        onSelect={() => selectInk(id)}
                        editing={editing}
                        onRemove={() =>
                          setPalettes((p) =>
                            p.map((v, i) =>
                              i === palette
                                ? { ...v, ids: v.ids.filter((n) => n !== id) }
                                : v,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {editing && (
                <YStack gap={8}>
                  <Muted>
                    Drag a Move handle, or focus it and use Space + arrow keys.
                  </Muted>
                  <Action
                    onPress={() =>
                      setPalettes((p) =>
                        p.map((v, i) =>
                          i === palette
                            ? { ...v, ids: inks.map((a) => a.id) }
                            : v,
                        ),
                      )
                    }
                  >
                    Restore all colors in this palette
                  </Action>
                </YStack>
              )}
            </YStack>
            <YStack className="lab-active" gap={16}>
              <Panel padding={0} overflow="hidden">
                <YStack padding={22} gap={9} backgroundColor={ink.color}>
                  <Text
                    color={inkTextColor(ink.color)}
                    fontSize={11}
                    fontWeight="700"
                    letterSpacing={1.5}
                  >
                    Selected ink
                  </Text>
                  <H2
                    color={inkTextColor(ink.color)}
                    fontFamily="heading"
                    fontSize={28}
                    fontWeight="400"
                  >
                    {ink.name}
                  </H2>
                  <Text color={inkTextColor(ink.color)} fontSize={12}>
                    {ink.brand}
                  </Text>
                </YStack>
                <YStack padding={22} gap={16}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Eyebrow>
                      In {matching.length}{" "}
                      {matching.length === 1 ? "pen" : "pens"}
                    </Eyebrow>
                    <Action
                      height={29}
                      fontSize={11}
                      paddingHorizontal={10}
                      onPress={() => setDialog("refill")}
                    >
                      ＋ Fill a pen
                    </Action>
                  </XStack>
                  {matching.length === 0 ? (
                    <Muted>No active refill with this ink.</Muted>
                  ) : (
                    matching.map((r) => (
                      <Button
                        key={r.id}
                        onPress={() => setActive(r.id)}
                        height="auto"
                        minHeight={65}
                        padding={12}
                        borderRadius={10}
                        borderWidth={1}
                        borderColor={
                          refill?.id === r.id ? "selectedBorder" : "borderColor"
                        }
                        backgroundColor={
                          refill?.id === r.id ? "soft" : "surface"
                        }
                        justifyContent="flex-start"
                      >
                        <YStack gap={4} flex={1}>
                          <Text fontSize={14} fontWeight="400">
                            {r.pen}
                          </Text>
                          <Muted>{r.nib}</Muted>
                          {r.inks.length > 1 && (
                            <Muted>
                              Mix ·{" "}
                              {r.inks.map((id) => inks[id].name).join(" + ")}
                            </Muted>
                          )}
                        </YStack>
                        <Text color="color">
                          {refill?.id === r.id ? "●" : "○"}
                        </Text>
                      </Button>
                    ))
                  )}
                  {refill && (
                    <>
                      <Separator />
                      <XStack justifyContent="space-between">
                        <YStack gap={4}>
                          <Muted>Filled</Muted>
                          <Text fontSize={12}>{refill.filled}</Text>
                        </YStack>
                        <YStack gap={4}>
                          <Muted>Last written</Muted>
                          <Text fontSize={12}>
                            {refill.days.at(-1) ?? "Not yet"}
                          </Text>
                        </YStack>
                        <YStack gap={4}>
                          <Muted>Days</Muted>
                          <Text fontSize={12}>{refill.days.length}</Text>
                        </YStack>
                      </XStack>
                      <Primary
                        onPress={() => {
                          setDate(localDate());
                          setDialog("write");
                        }}
                      >
                        ✎ Log writing
                      </Primary>
                      <Muted textAlign="center" fontSize={10}>
                        For this refill · one entry per date
                      </Muted>
                    </>
                  )}
                </YStack>
              </Panel>
              <Panel gap={12}>
                <XStack justifyContent="space-between">
                  <Eyebrow>Ready for a fresh fill</Eyebrow>
                  <Muted>{current.filter((r) => r.needsRefill).length}</Muted>
                </XStack>
                {current
                  .filter((r) => r.needsRefill)
                  .map((r) => (
                    <XStack key={r.id} alignItems="center" gap={10}>
                      <YStack
                        width={12}
                        height={12}
                        borderRadius={6}
                        backgroundColor={inks[r.inks[0]].color}
                      />
                      <YStack flex={1}>
                        <Text fontSize={12} fontWeight="400">
                          {r.pen}
                        </Text>
                        <Muted fontSize={10}>{r.nib}</Muted>
                      </YStack>
                      <Action
                        height={30}
                        fontSize={11}
                        onPress={() => setDialog("refill")}
                      >
                        Fill ↗
                      </Action>
                    </XStack>
                  ))}
              </Panel>
            </YStack>
          </div>
        )}
        <XStack
          marginTop={28}
          paddingTop={14}
          borderTopWidth={1}
          borderColor="borderColor"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={8}
        >
          <Muted fontSize={10}>TAMAGUI / DESK LAB</Muted>
          <Text role="status" aria-live="polite" fontSize={12} color="color">
            {notice || "Local demo · changes reset on reload"}
          </Text>
        </XStack>
      </main>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay backgroundColor="rgba(20,35,27,.35)" />
          <Dialog.Content
            className="lab-dialog"
            backgroundColor="surface"
            borderRadius={6}
            padding={28}
            gap={18}
          >
            <Dialog.Title fontFamily="heading" fontSize={25}>
              {dialog === "write"
                ? "A day of writing"
                : dialog === "refill"
                  ? `Fill with ${ink.name}`
                  : dialog === "palette"
                    ? "New color palette"
                    : "Collection reference"}
            </Dialog.Title>
            <Dialog.Description color="muted" fontSize={13}>
              {dialog === "write"
                ? `${refill?.pen} · ${refill?.inks.map((id) => inks[id].name).join(" + ")}`
                : dialog === "refill"
                  ? "Demo refill · choose a pen. Needs-refill pens appear first."
                  : dialog === "palette"
                    ? "Starts with the colors in your current palette."
                    : "Full inventory editing is intentionally outside this experiment."}
            </Dialog.Description>
            {dialog === "write" && (
              <>
                <Label htmlFor="writing-date">Writing date</Label>
                <Input
                  id="writing-date"
                  name="writing-date"
                  type="date"
                  value={date}
                  min={refill?.filled}
                  max={localDate()}
                  onChangeText={setDate}
                />
                {refill?.days.includes(date) && (
                  <Muted>
                    This date is already logged. Saving keeps one entry.
                  </Muted>
                )}
                <Primary
                  disabled={
                    !date ||
                    date > localDate() ||
                    (!!refill && date < refill.filled)
                  }
                  onPress={logWriting}
                >
                  Save writing day
                </Primary>
              </>
            )}
            {dialog === "refill" &&
              [...current]
                .sort(
                  (a, b) => Number(!!b.needsRefill) - Number(!!a.needsRefill),
                )
                .map((r) => (
                  <Action
                    key={r.id}
                    height="auto"
                    minHeight={48}
                    justifyContent="space-between"
                    onPress={() => {
                      const id = `demo-${Date.now()}`;
                      setRefills((all) =>
                        fillPen(all, r.id, selected, localDate(), id),
                      );
                      setActive(id);
                      setNotice(`Demo refill saved · ${r.pen}`);
                      setDialog(null);
                    }}
                  >
                    {r.pen}
                    <Muted>
                      {r.needsRefill ? "Needs refill" : "Replace current fill"}
                    </Muted>
                  </Action>
                ))}
            {dialog === "palette" && (
              <>
                <Label htmlFor="palette-name">Name</Label>
                <Input
                  id="palette-name"
                  name="palette-name"
                  autoComplete="off"
                  maxLength={40}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Autumn letters"
                />
                <Primary
                  disabled={
                    !name.trim() || palettes.some((p) => p.name === name.trim())
                  }
                  onPress={() => {
                    setPalettes((p) => [
                      ...p,
                      { name: name.trim(), ids: [...p[palette].ids] },
                    ]);
                    setPalette(palettes.length);
                    setName("");
                    setDialog(null);
                  }}
                >
                  Create palette
                </Primary>
              </>
            )}
            {dialog === "reference" && (
              <>
                <Paragraph fontSize={13}>
                  20 synthetic inks · 6 pens. Catalog search, reference links,
                  owner sign-in, and inventory editing remain in the existing
                  app.
                </Paragraph>
                <a href="/">Open existing collection ↗</a>
              </>
            )}
            <Action onPress={() => setDialog(null)}>Close</Action>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </div>
  );
}
