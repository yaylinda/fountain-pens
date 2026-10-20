import { Icon } from "./Icon";
import { useEffect, useRef, type ReactNode } from "react";
import { Button, Dialog, Text, YStack, styled } from "tamagui";
export const Action = styled(Button, {
  height: 42,
  borderRadius: 6,
  fontSize: 12,
  fontWeight: "500",
  borderWidth: 1,
  borderColor: "borderColor",
  backgroundColor: "surface",
  color: "color",
});
export const Primary = styled(Action, {
  fontWeight: "700",
  backgroundColor: "accent",
  color: "accentText",
  borderColor: "accent",
});
export const Muted = styled(Text, {
  color: "muted",
  fontSize: 12,
  lineHeight: "18px",
});
export const Panel = styled(YStack, {
  backgroundColor: "surface",
  borderRadius: "panel",
  borderWidth: 1,
  borderColor: "borderColor",
  padding: "section",
  gap: "stack",
});
export function Modal({
  title,
  children,
  close,
  busy = false,
  showCloseButton = true,
  className = "",
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
  showCloseButton?: boolean;
  className?: string;
}) {
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(
    () => () => {
      window.setTimeout(() => {
        if (
          !document.querySelector(".desk-dialog") &&
          returnFocus.current?.isConnected
        )
          returnFocus.current.focus();
      }, 0);
    },
    [],
  );
  return (
    <Dialog
      modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay backgroundColor="rgba(24,24,30,.3)" />
        <Dialog.Content
          className={`desk-dialog ${className}`}
          backgroundColor="background"
          padding={24}
          borderRadius={10}
          gap={16}
          aria-describedby={undefined}
        >
          <div className="dialog-heading">
            <Dialog.Title fontSize={23} fontWeight="700" lineHeight="30px">
              {title}
            </Dialog.Title>
            {showCloseButton && (
              <Action
                className="icon-button"
                aria-label="Close"
                disabled={busy}
                onPress={close}
              >
                <Icon name="close" />
              </Action>
            )}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
export function Failure({ error }: { error: string }) {
  return error ? (
    <Text role="alert" color="#ad2635" fontSize={12}>
      {error}
    </Text>
  ) : null;
}
