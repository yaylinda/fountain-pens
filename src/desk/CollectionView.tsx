import {
  SidebarCard,
  SidebarSection,
  SidebarFacts,
  SidebarActions,
} from "./Sidebar";
import { RefillNeededAction } from "./RefillNeededAction";
import { FillStatus } from "./FillStatus";
import { InkColors } from "./InkColors";
import type { JournalEntry } from "../lib/collection";
import {
  PenIdentity,
  PenDetails,
  InkIdentity,
  InkDetails,
  DateStamp,
} from "./Identity";
import { Icon } from "./Icon";
import { useState } from "react";
import { Input, Label, Text, XStack, YStack } from "tamagui";
import {
  byPenName,
  deriveCollection,
  getSwatch,
  inkLabel,
  isCleaning,
  matches,
  penDescription,
  penLabel,
  type Collection,
} from "../lib/collection";
import { getInkReference } from "../lib/inkReference";
import { Action, Muted } from "./ui";

export function CollectionView({
  kind,
  collection,
  model,
  onRefill,
  onHistory,
}: {
  onRefill: (penId: string) => void;
  onHistory: (entry: JournalEntry) => void;
  kind: "pens" | "inks";
  collection: Collection;
  model: ReturnType<typeof deriveCollection>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const pens = [...collection.pens]
    .sort(byPenName)
    .filter(
      (p) =>
        (includeArchived || !p.archived) &&
        matches(query, penLabel(p), penDescription(p), p.details),
    );
  const inks = [...collection.inks]
    .sort((a, b) => inkLabel(a).localeCompare(inkLabel(b)))
    .filter(
      (i) =>
        (includeArchived || !i.archived) &&
        matches(query, inkLabel(i), i.collection, i.details),
    );
  const pen = kind === "pens" ? model.penById.get(selected) : undefined;
  const ink = kind === "inks" ? model.inkById.get(selected) : undefined;
  const item = pen || ink;
  const reference = getInkReference(ink);
  const swatch = getSwatch(ink);
  const entry = pen && model.latest.get(pen.id);
  const lastWritten =
    entry &&
    model.writingLogs
      .filter((log) => log.refillId === entry.id)
      .sort((a, b) => b.writtenOn.localeCompare(a.writtenOn))[0];
  return (
    <div className="collection-view">
      <YStack gap={16} minWidth={0}>
        <Label className="visually-hidden" htmlFor="collection-search">
          Search {kind}
        </Label>
        <Input
          id="collection-search"
          type="search"
          value={query}
          onChangeText={setQuery}
          placeholder={
            kind === "pens"
              ? "Brand, model, color or nib…"
              : "Brand, ink or collection…"
          }
        />
        <XStack
          justifyContent="space-between"
          alignItems="center"
          gap={12}
          flexWrap="wrap"
        >
          <Muted role="status">
            {kind === "pens" ? pens.length : inks.length} shown
          </Muted>
          <Action
            aria-pressed={includeArchived}
            onPress={() => setIncludeArchived(!includeArchived)}
          >
            Include archived
          </Action>
        </XStack>
        <div className="collection-list">
          {kind === "pens"
            ? pens.map((p) => (
                <Action
                  className="collection-row"
                  key={p.id}
                  aria-pressed={selected === p.id}
                  onPress={() => setSelected(p.id)}
                >
                  <PenIdentity pen={p} />
                  <span className="pen-statuses">
                    {p.archived && (
                      <span className="status status-neutral">Archived</span>
                    )}
                    <FillStatus entry={model.latest.get(p.id)} />
                    {p.needsRefill && (
                      <span className="status status-red">
                        <Icon name="refill" /> Queued for refill
                      </span>
                    )}
                  </span>
                </Action>
              ))
            : inks.map((i) => (
                <Action
                  className="collection-row"
                  key={i.id}
                  aria-pressed={selected === i.id}
                  onPress={() => setSelected(i.id)}
                >
                  <span
                    className="reference-swatch"
                    style={{ backgroundColor: getSwatch(i)?.hex || "#e2e2e5" }}
                  />
                  <InkIdentity ink={i} />
                </Action>
              ))}
          {!(kind === "pens" ? pens.length : inks.length) && (
            <Muted>
              No matches. Try another name or include archived items.
            </Muted>
          )}
        </div>
      </YStack>
      <SidebarCard
        className="reference-detail"
        title={
          !item ? (
            `Select ${kind === "pens" ? "a pen" : "an ink"}`
          ) : pen ? (
            <>
              <span className="object-brand">{pen.brand}</span> {pen.model}
            </>
          ) : (
            ink!.name
          )
        }
        subtitle={
          !item ? (
            "Browse the collection to open its reference."
          ) : pen ? (
            <PenDetails pen={pen} />
          ) : (
            <InkDetails ink={ink!} />
          )
        }
        accent={ink ? swatch?.hex || "#e2e2e5" : undefined}
      >
        {item && (
          <>
            {item.favorite && (
              <Text className="status status-green">★ Favorite</Text>
            )}
            {item.archived && <Muted>Archived</Muted>}
            {pen && (
              <SidebarSection title="Current fill">
                {entry ? (
                  <>
                    <InkColors
                      inks={
                        isCleaning(entry)
                          ? []
                          : entry.inkIds.map((id) => model.inkById.get(id)!)
                      }
                    />
                    {entry.notPure && (
                      <span className="status status-neutral">
                        Residual ink
                      </span>
                    )}
                    <SidebarFacts
                      items={[
                        {
                          label: isCleaning(entry) ? "Cleaned" : "Filled",
                          value: <DateStamp value={entry.date} />,
                        },
                        {
                          label: "Last written",
                          value: lastWritten ? (
                            <DateStamp value={lastWritten.writtenOn} />
                          ) : (
                            "Not recorded"
                          ),
                        },
                      ]}
                    />
                  </>
                ) : (
                  <Muted>No refill recorded</Muted>
                )}
                <SidebarActions>
                  {entry && !isCleaning(entry) && (
                    <Action onPress={() => onHistory(entry)}>
                      View history
                    </Action>
                  )}
                  {collection.canEdit && !pen.archived && (
                    <Action onPress={() => onRefill(pen.id)}>
                      Add refill log
                    </Action>
                  )}
                </SidebarActions>
              </SidebarSection>
            )}
            {pen && (
              <SidebarSection title="Refill queue">
                <Muted>
                  {pen.needsRefill ? "Queued for refill" : "Not queued for refill"}
                </Muted>
                <Muted>
                  Queueing plans a future refill. It does not change the current fill.
                </Muted>
                <RefillNeededAction pen={pen} />
              </SidebarSection>
            )}
            {ink && (
              <SidebarSection title="Currently in">
                {model.currentPens(ink.id).length ? (
                  model.currentPens(ink.id).map((p) => (
                    <div className="sidebar-pen" key={p.id}>
                      <PenIdentity pen={p} />
                      <RefillNeededAction pen={p} />
                    </div>
                  ))
                ) : (
                  <Muted>No currently inked pens.</Muted>
                )}
              </SidebarSection>
            )}
            {item.details && (
              <SidebarSection title="Details">
                <Text className="reference-prose">{item.details}</Text>
              </SidebarSection>
            )}
            {reference && (
              <SidebarSection title="Reference">
                <dl className="reference-facts">
                  {Object.entries({
                    "Product code": reference.productCode,
                    "Name origin":
                      reference.nameOrigin &&
                      `${reference.nameOrigin.japanese} · ${reference.nameOrigin.reading} · ${reference.nameOrigin.meaning}`,
                    Inspiration: [
                      reference.inspiration.author,
                      reference.inspiration.work,
                      reference.inspiration.series,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                    Properties: [
                      ...reference.properties,
                      ...(reference.colorGuideProperties || []),
                    ].join(", "),
                    Glitter: reference.glitterColors.join(", "),
                    Origin: reference.countryOfOrigin,
                    Edition: [
                      reference.edition,
                      reference.limitedEdition ? "Limited edition" : "",
                      reference.exclusiveTo,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                    Notes: reference.notes?.join("\n"),
                  })
                    .filter(([, value]) => value)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  {reference.writing && (
                    <div>
                      <dt>Writing reference</dt>
                      <dd>
                        {reference.writing.flow} flow ·{" "}
                        {reference.writing.shading} shading ·{" "}
                        {reference.writing.sheen} sheen ·{" "}
                        {reference.writing.dryTimeSeconds}s dry time
                        <br />
                        {reference.writing.waterResistance} water resistance ·{" "}
                        {reference.writing.shimmer ? "Shimmer" : "No shimmer"}
                        <br />
                        Tested with {reference.writing.testPen} on{" "}
                        {reference.writing.testPaper}.{" "}
                        <a
                          href={reference.writing.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Source ↗
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </SidebarSection>
            )}
            {!!item.sources?.length && (
              <SidebarSection title="Sources">
                {item.sources.map((s, index) => (
                  <a
                    key={`${s.url}-${index}`}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.label} ↗
                  </a>
                ))}
              </SidebarSection>
            )}
            {swatch?.url && (
              <a href={swatch.url} target="_blank" rel="noreferrer">
                Swatch reference ↗
              </a>
            )}
          </>
        )}
      </SidebarCard>
    </div>
  );
}
