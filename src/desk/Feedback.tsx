import { Toast } from "tamagui";
import { Icon } from "./Icon";

export function Feedback() {
  return (
    <Toast duration={4000} position="bottom-center" visibleToasts={1}>
      <Toast.Viewport className="desk-toasts">
        <Toast.List
          renderItem={({ toast, index, handleClose }) => (
            <Toast.Item
              toast={toast}
              index={index}
              className={`feedback-toast ${toast.type === "error" ? "feedback-error" : "feedback-success"}`}
              role={toast.type === "error" ? "alert" : "status"}
              aria-live={toast.type === "error" ? "assertive" : "polite"}
            >
              <div className="feedback-content">
                <Icon name={toast.type === "error" ? "warning" : "check"} />
                <span>
                  {typeof toast.title === "function"
                    ? toast.title()
                    : toast.title}
                </span>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={handleClose}
                >
                  <Icon name="close" />
                </button>
              </div>
            </Toast.Item>
          )}
        />
      </Toast.Viewport>
    </Toast>
  );
}
