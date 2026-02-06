import type { IngestToast as IngestToastType } from '../../hooks/useAutoIngest';

export interface IngestToastProps {
  toast: IngestToastType | null;
}

export function IngestToast(props: IngestToastProps) {
  const { toast } = props;
  if (!toast) return null;

  return (
    <output
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-50 rounded-lg border border-border-light bg-bg-card px-4 py-2 shadow-sm text-xs text-text-secondary animate-in slide-in-from-right fade-in duration-200"
    >
      {toast.message}
    </output>
  );
}
