import type { CSSProperties } from "react";

type AppToastProps = {
  message: string | null;
  onClick?: () => void;
  style?: CSSProperties;
};

export function AppToast({ message, onClick, style }: AppToastProps) {
  if (!message) return null;
  if (onClick) {
    return (
      <button
        type="button"
        className="app-toast app-toast--action"
        style={style}
        onClick={onClick}
      >
        {message}
      </button>
    );
  }
  return (
    <div className="app-toast" style={style} role="status" aria-live="polite">
      {message}
    </div>
  );
}
