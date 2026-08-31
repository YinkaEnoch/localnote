interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** When true, the confirm button is rendered in the destructive error color. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation dialog replacing window.confirm(), which blocks the
 * WebView's main thread and freezes rendering on Android while open.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      {/* Scrim / Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Dialog card */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-[400px] rounded-xl bg-surface-container p-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
      >
        <span className="material-symbols-outlined block text-[32px] mb-sm" style={{ color: 'var(--color-primary)' }}>
          {destructive ? 'delete_forever' : 'help'}
        </span>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-sm">{title}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-lg">{message}</p>
        <div className="flex justify-end gap-sm">
          <button
            className="px-md py-sm rounded-full text-primary font-label-lg text-label-lg hover:bg-surface-container-high transition-colors"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            autoFocus
            className={`px-md py-sm rounded-full font-label-lg text-label-lg transition-colors ${
              destructive
                ? 'text-error hover:bg-error-container/20'
                : 'text-on-primary hover:opacity-90'
            }`}
            style={!destructive ? { backgroundColor: 'var(--color-primary)' } : undefined}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
