export const inks = [
  ["Sailor", "Sakura-mori", "#df9dba"],
  ["Wearingeul", "Suncatcher", "#de7644"],
  ["Pilot", "Yu-yake", "#ed9b39"],
  ["Ferris Wheel Press", "Butter Popcorn", "#c9b866"],
  ["Sailor", "Waka-uguisu", "#8c9b4d"],
  ["Pilot", "Chiku-rin", "#a7ae6a"],
  ["Diamine", "Meadow", "#6d935d"],
  ["Sailor", "Tokiwa-matsu", "#4e6a55"],
  ["Pilot", "Syo-ro", "#477c7b"],
  ["Wearingeul", "Robinson Crusoe", "#4397a1"],
  ["Herbin", "Bleu Pervenche", "#74b4d1"],
  ["Pilot", "Kon-peki", "#397aa5"],
  ["Sailor", "Nioi-sumire", "#7e7aaf"],
  ["Pilot", "Murasaki-shikibu", "#986b9d"],
  ["Diamine", "Writer’s Blood", "#783e51"],
  ["Herbin", "Rouille d’Ancre", "#bd8a7b"],
  ["Pilot", "Tsukushi", "#87614d"],
  ["Diamine", "Sepia", "#a68a59"],
  ["Sailor", "Doyou", "#5b514b"],
  ["Pilot", "Take-sumi", "#3c4140"],
].map(([brand, name, color], id) => ({ id, brand, name, color }));
export type Refill = {
  id: string;
  pen: string;
  nib: string;
  inks: number[];
  filled: string;
  days: string[];
  needsRefill?: boolean;
  closed?: boolean;
};
export const initialRefills: Refill[] = [
  {
    id: "r1",
    pen: "Sailor Pro Gear",
    nib: "MF · Spring Rain",
    inks: [4],
    filled: "2026-10-12",
    days: ["2026-10-14", "2026-10-16", "2026-10-18"],
  },
  {
    id: "r2",
    pen: "Pilot Custom 823",
    nib: "M · Amber",
    inks: [4],
    filled: "2026-10-10",
    days: ["2026-10-15", "2026-10-17"],
  },
  {
    id: "r3",
    pen: "Waterman Carène",
    nib: "F · Marine Amber",
    inks: [9, 10],
    filled: "2026-10-13",
    days: ["2026-10-15", "2026-10-18"],
  },
  {
    id: "r4",
    pen: "TWSBI Diamond 580",
    nib: "EF · Iris",
    inks: [12],
    filled: "2026-10-08",
    days: ["2026-10-14"],
  },
  {
    id: "r5",
    pen: "Kaweco Sport",
    nib: "M · Sage",
    inks: [1],
    filled: "2026-10-01",
    days: ["2026-10-08"],
    needsRefill: true,
  },
  {
    id: "r6",
    pen: "LAMY Safari",
    nib: "F · Cream",
    inks: [15],
    filled: "2026-09-29",
    days: ["2026-10-09"],
    needsRefill: true,
  },
];
export const initialPalettes = [
  { name: "Everyday spectrum", ids: inks.map((i) => i.id) },
  { name: "Garden notes", ids: [4, 5, 6, 7, 8, 15, 17, 0] },
  { name: "After hours", ids: [12, 13, 14, 18, 19, 11] },
];
export function recordDay(refills: Refill[], id: string, date: string) {
  return refills.map((r) =>
    r.id === id ? { ...r, days: [...new Set([...r.days, date])].sort() } : r,
  );
}
export function moveInk(ids: number[], from: number, to: number) {
  const next = [...ids];
  const index = next.indexOf(from);
  if (index < 0 || !next.includes(to)) return next;
  next.splice(index, 1);
  next.splice(ids.indexOf(to), 0, from);
  return next;
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fillPen(
  refills: Refill[],
  previousId: string,
  inkId: number,
  date: string,
  id: string,
) {
  const previous = refills.find((r) => r.id === previousId);
  if (!previous) return refills;
  return [
    ...refills.map((r) => (r.id === previousId ? { ...r, closed: true } : r)),
    {
      ...previous,
      id,
      inks: [inkId],
      filled: date,
      days: [],
      needsRefill: false,
      closed: false,
    },
  ];
}
export function inkTextColor(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return r * 0.2126 + g * 0.7152 + b * 0.0722 > 0.179 ? "#17221c" : "#ffffff";
}
