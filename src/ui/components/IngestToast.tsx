import type { IngestToast as IngestToastType } from '../../hooks/useAutoIngest';

export function IngestToast(props: { toast: IngestToastType | null }) {
  const { toast } = props;
  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-50 rounded-lg border border-stone-200 bg-white px-4 py-2 shadow-sm text-xs text-stone-700">
      {toast.message}
    </div>
  );
}
