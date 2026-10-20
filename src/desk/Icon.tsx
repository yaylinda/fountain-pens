const paths = {
  history: "M4 5v5h5M4 10a8 8 0 1 1 2 8M12 7v5l3 2",
  grip: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  chevron: "m6 9 6 6 6-6",
  restore: "M4 5v6h6M4 11a8 8 0 1 1 2 7",
  circle: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  ink: "M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  move: "M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4",
  refill: "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1",
  edit: "m4 16-1 5 5-1L20 8l-4-4L4 16Zm9-9 4 4",
  copy: "M9 9h12v12H9zM15 5V3H3v12h2",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
};
export function Icon({ name }: { name: keyof typeof paths | "more" }) {
  return (
    <svg
      className="ui-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "more" ? (
        <>
          <circle cx="5" cy="12" r="1.3" fill="currentColor" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" />
          <circle cx="19" cy="12" r="1.3" fill="currentColor" />
        </>
      ) : (
        <path d={paths[name]} />
      )}
    </svg>
  );
}
