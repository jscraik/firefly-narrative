import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, MessageSquare, GitCommit, Sparkles, BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface TraceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * TraceDetailModal — Modal for commit-focused details in the Command Center.
 *
 * Shows focused details when a commit is selected: files changed,
 * session excerpt, attribution, and intent for that specific commit.
 */
export function TraceDetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: TraceDetailModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed z-50 top-[5%] left-[50%] w-full max-w-4xl max-h-[85vh] translate-x-[-50%] rounded-2xl bg-bg-secondary border border-border-subtle shadow-2xl overflow-hidden flex flex-col"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-border-subtle bg-bg-tertiary/50">
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-lg font-semibold text-text-primary truncate">
                      {title}
                    </Dialog.Title>
                    {subtitle && (
                      <Dialog.Description className="text-sm text-text-tertiary mt-1 truncate">
                        {subtitle}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// Tab-like sections for inside the modal
export function DetailSection({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon?: React.ElementType;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2 select-none list-none">
        <span className="w-4 h-4 flex items-center justify-center rounded-sm bg-bg-primary group-open:bg-bg-hover transition-colors">
          <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 16 16" fill="none">
            <title>Toggle section</title>
            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {Icon && <Icon className="w-4 h-4 text-text-muted" />}
        <span>{title}</span>
      </summary>
      <div className="pl-6 pt-2 pb-4">
        {children}
      </div>
    </details>
  );
}
