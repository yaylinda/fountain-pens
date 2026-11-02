import { useSyncExternalStore } from "react";
const media = window.matchMedia("(max-width: 699px)");
const subscribe = (notify: () => void) => {
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
export const useMobilePalette = () =>
  useSyncExternalStore(subscribe, () => media.matches);
