import { useState } from "react";
import { H2, Input, Label, Text, XStack, YStack } from "tamagui";
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
import { Action, Muted, Panel } from "./ui";

export function CollectionView({
  kind,
  collection,
  model,
}: {
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
  return (
    <div className="collection-view">
      <YStack gap={16} minWidth={0}>
        <Label htmlFor="collection-search">Search {kind}</Label>
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
            {kind === "pens" ? pens.length : inks.length} {kind}
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
                  <YStack gap={5} flex={1}>
                    <Text fontSize={15} fontWeight="700">
                      {penLabel(p)}
                    </Text>
                    <Muted>{penDescription(p)}</Muted>
                  </YStack>
                  <Text
                    className={`status ${p.needsRefill ? "status-red" : "status-green"}`}
                  >
                    {p.archived
                      ? "Archived"
                      : p.needsRefill
                        ? "↻ Needs refill"
                        : model.inked.some((x) => x.id === p.id)
                          ? "● Inked"
                          : "○ Empty"}
                  </Text>
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
                  <YStack gap={5} flex={1}>
                    <Text fontSize={15} fontWeight="700">
                      {i.name}
                    </Text>
                    <Muted>
                      {i.brand}
                      {i.collection ? ` · ${i.collection}` : ""}
                      {i.archived ? " · Archived" : ""}
                    </Muted>
                  </YStack>
                </Action>
              ))}
          {!(kind === "pens" ? pens.length : inks.length) && (
            <Muted>
              No matches. Try another name or include archived items.
            </Muted>
          )}
        </div>
      </YStack>
      <Panel className="reference-detail">
        {!item ? (
          <>
            <H2 fontSize={20}>Select {kind === "pens" ? "a pen" : "an ink"}</H2>
            <Muted>
              Browse the collection or search to open its reference.
            </Muted>
          </>
        ) : (
          <>
            <Text className="status status-blue">
              ◉ {pen ? "Pen reference" : "Ink reference"}
            </Text>
            <H2 fontSize={24} lineHeight="32px">
              {pen ? penLabel(pen) : ink!.name}
            </H2>
            <Muted>
              {pen
                ? penDescription(pen)
                : `${ink!.brand}${ink!.collection ? ` · ${ink!.collection}` : ""}`}
            </Muted>
            {ink && (
              <>
                <div
                  className="reference-color"
                  style={{ backgroundColor: swatch?.hex || "#e2e2e5" }}
                />
                <Muted>
                  {swatch
                    ? `${swatch.hex} · ${swatch.source}`
                    : "No color reference available"}
                </Muted>
              </>
            )}
            {item.favorite && (
              <Text className="status status-green">★ Favorite</Text>
            )}
            {item.archived && <Muted>Archived</Muted>}
            {item.details && (
              <Text className="reference-prose">{item.details}</Text>
            )}
            {pen && (
              <>
                <Text fontWeight="700">Current fill</Text>
                <Muted>
                  {entry
                    ? isCleaning(entry)
                      ? `Cleaned ${entry.date}`
                      : `${entry.inkIds.map((id) => inkLabel(model.inkById.get(id))).join(" + ")} · ${entry.date}${entry.notPure ? " · Residual ink" : ""}`
                    : "No refill recorded"}
                </Muted>
              </>
            )}
            {ink && (
              <>
                <Text fontWeight="700">Currently in</Text>
                {model.currentPens(ink.id).length ? (
                  model.currentPens(ink.id).map((p) => (
                    <Muted key={p.id}>
                      {penLabel(p)} · {penDescription(p)}
                    </Muted>
                  ))
                ) : (
                  <Muted>No currently inked pens.</Muted>
                )}
              </>
            )}
            {reference && (
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
            )}
            {!!item.sources?.length && (
              <YStack gap={8}>
                <Text fontWeight="700">Sources</Text>
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
              </YStack>
            )}
            {swatch?.url && (
              <a href={swatch.url} target="_blank" rel="noreferrer">
                Swatch reference ↗
              </a>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
