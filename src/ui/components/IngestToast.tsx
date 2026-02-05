import type { IngestToast as IngestToastType } from '../../hooks/useAutoIngest';

export interface IngestToastProps {
  toast: IngestToastType | null;
}

export function IngestToast(props: IngestToastProps) {
  const { toast } = props;
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-50 rounded-lg border border-border-light bg-white px-4 py-2 shadow-sm text-xs text-text-secondary"
    >
      {toast.message}
    </div>
  );
}
