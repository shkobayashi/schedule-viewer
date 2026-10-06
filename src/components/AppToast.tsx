type AppToastProps = {
  message: string | null;
  onClick?: () => void;
};

export function AppToast({ message, onClick }: AppToastProps) {
  if (!message) return null;
  if (onClick) {
    return (
      <button
        type="button"
        className="app-toast app-toast--action"
        onClick={onClick}
      >
        {message}
      </button>
    );
  }
  return (
    <div className="app-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
