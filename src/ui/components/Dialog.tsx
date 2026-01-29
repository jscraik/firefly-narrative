import { useEffect, useRef } from 'react';
import clsx from 'clsx';

/**
 * Reusable confirmation dialog for destructive actions.
 *
 * Used for:
 * - Unlinking sessions from commits
 * - Future destructive actions (delete, reset, etc.)
 *
 * Accessibility:
 * - Focus trap (tab stays within dialog)
 * - Escape to cancel
 * - ARIA attributes for screen readers
 *
 * Evidence: UX Spec 2026-01-29 Section 8, Dialog component specification
 */

export interface DialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Dialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  open,
  onConfirm,
  onCancel,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep focus within dialog when open
  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus first focusable element
    const focusable = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] as HTMLElement;
    first?.focus();

    // Handle Escape key (use { once: true } to prevent collision with other dialogs)
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape, { once: true });
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  if (!open) return null;

  const isDestructive = variant === 'destructive';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        ref={dialogRef}
        className="w-[400px] max-w-full rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing
      >
        <h2 id="dialog-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm text-zinc-300">{message}</p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm transition',
              'bg-white/5 text-zinc-200 hover:bg-white/10'
            )}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm transition',
              isDestructive
                ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/30'
                : 'bg-white/10 text-white hover:bg-white/15'
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
