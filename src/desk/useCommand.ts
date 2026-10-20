import { useRef, useState } from "react";
import { toast } from "tamagui";
export function useCommand() {
  const errorToast = useRef<string | number | undefined>(undefined);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<unknown>, done?: () => void) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    if (errorToast.current !== undefined) toast.dismiss(errorToast.current);
    try {
      await action();
      done?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save. Try again.";
      setError(message);
      errorToast.current = toast.error(message, { duration: Infinity });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run };
}
