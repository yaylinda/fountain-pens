import {
  PenIdentity,
  PenDetails,
  InkIdentity,
  InkDetails,
  DateStamp,
} from "./Identity";
import { Icon } from "./Icon";
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
                  <Text
                    className={`status ${p.needsRefill ? "status-red" : "status-green"}`}
                  >
                    {!p.archived && (
                      <Icon
                        name={
                          p.needsRefill
                            ? "refill"
                            : model.inked.some((x) => x.id === p.id)
                              ? "ink"
                              : "circle"
                        }
                      />
                    )}
                    {p.archived
                      ? "Archived"
                      : p.needsRefill
                        ? "Needs refill"
                        : model.inked.some((x) => x.id === p.id)
                          ? "Inked"
                          : "Empty"}
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
            <H2 fontSize={24} fontWeight="700" lineHeight="32px">
              {pen ? (
                <>
                  <span className="object-brand">{pen.brand}</span> {pen.model}
                </>
              ) : (
                ink!.name
              )}
            </H2>
            {pen ? <PenDetails pen={pen} /> : <InkDetails ink={ink!} />}
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
                {entry ? (
                  <div className="reference-fill">
                    <DateStamp value={entry.date} />
                    <span
                      className={`status ${isCleaning(entry) ? "status-neutral" : "status-green"}`}
                    >
                      {isCleaning(entry) ? "Cleaned & empty" : "Inked"}
                    </span>
                    {!isCleaning(entry) && (
                      <Text fontSize={13}>
                        {entry.inkIds
                          .map((id) => inkLabel(model.inkById.get(id)))
                          .join(" + ")}
                      </Text>
                    )}
                    {entry.notPure && (
                      <span className="status status-neutral">
                        Residual ink
                      </span>
                    )}
                  </div>
                ) : (
                  <Muted>No refill recorded</Muted>
                )}
              </>
            )}
            {ink && (
              <>
                <Text fontWeight="700">Currently in</Text>
                {model.currentPens(ink.id).length ? (
                  model
                    .currentPens(ink.id)
                    .map((p) => <PenIdentity key={p.id} pen={p} />)
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
