import { useCommand } from "./useCommand";
import { useEffect, useState } from "react";
import { Input, Label, XStack } from "tamagui";
import { getSupabase } from "../services/supabaseClient";
import {
  activateCollection,
  isCollectionSaving,
} from "../services/dataService";
import { Action, Primary, Muted, Modal, Failure } from "./ui";
export function Access({ canEdit }: { canEdit: boolean }) {
  const [signedIn, setSignedIn] = useState(false),
    [open, setOpen] = useState(false),
    [ready, setReady] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const command = useCommand();
  useEffect(() => {
    try {
      const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
        activateCollection(next?.user.id || null);
        setSignedIn(!!next);
        setReady(true);
        if (next) {
          setOpen(false);
          setPassword("");
        }
      });
      return () => data.subscription.unsubscribe();
    } catch {
      setReady(false);
    }
  }, []);
  const close = () => {
    setOpen(false);
    setPassword("");
  };
  return (
    <>
      <XStack gap={10} alignItems="center" flexWrap="wrap">
        <Muted>
          {canEdit ? "Editing" : signedIn ? "View only" : "Public view"}
        </Muted>
        <Action
          disabled={!ready || command.busy}
          onPress={() =>
            signedIn
              ? void command.run(async () => {
                  if (isCollectionSaving())
                    throw new Error("Wait for the current save to finish.");
                  const { error } = await getSupabase().auth.signOut({
                    scope: "local",
                  });
                  if (error) throw new Error("Could not sign out. Try again.");
                })
              : setOpen(true)
          }
        >
          {signedIn ? "Sign out" : "Owner sign in"}
        </Action>
      </XStack>
      {!open && <Failure error={command.error} />}
      {open && (
        <Modal title="Owner sign in" close={close} busy={command.busy}>
          <form
            className="desk-form"
            onSubmit={(event) => {
              event.preventDefault();
              void command.run(async () => {
                const { error } = await getSupabase().auth.signInWithPassword({
                  email: email.trim(),
                  password,
                });
                if (error)
                  throw new Error(
                    "Sign-in failed. Check your email and password.",
                  );
              });
            }}
          >
            <Label htmlFor="owner-email">Email</Label>
            <Input
              id="owner-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChangeText={setEmail}
              disabled={command.busy}
            />
            <Label htmlFor="owner-password">Password</Label>
            <Input
              id="owner-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChangeText={setPassword}
              disabled={command.busy}
            />
            <Failure error={command.error} />
            <Primary type="submit" disabled={command.busy}>
              {command.busy ? "Signing in…" : "Sign in"}
            </Primary>
          </form>
        </Modal>
      )}
    </>
  );
}
