import { Download, X, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { UpdateStatus } from '../../hooks/useUpdater';

export interface UpdatePromptProps {
  status: UpdateStatus;
  onUpdate: () => void;
  onClose?: () => void;
  /**
   * @deprecated Use onClose instead.
   */
  onDismiss?: () => void;
  onCheckAgain?: () => void;
}

/**
 * Update notification component that displays update status
 * and allows users to download/install updates.
 */
export function UpdatePrompt({ status, onUpdate, onClose, onDismiss, onCheckAgain }: UpdatePromptProps) {
  const handleClose = onClose ?? onDismiss;
  // Don't show anything if no update or checking (silent)
  if (status.type === 'no_update' || status.type === 'checking') {
    return null;
  }

  // Error state
  if (status.type === 'error') {
    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right fade-in duration-300">
        <div className="rounded-xl border border-red-200 bg-red-50 shadow-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-red-800 text-sm">Update Error</div>
              <p className="text-xs text-red-600 mt-1">{status.error}</p>
              {onCheckAgain && (
                <button
                  type="button"
                  onClick={onCheckAgain}
                  className="mt-2 text-xs font-medium text-red-700 hover:text-red-900 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </button>
              )}
            </div>
            {handleClose ? (
              <button
                type="button"
                onClick={handleClose}
                className="text-red-400 hover:text-red-600 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Downloading state
  if (status.type === 'downloading') {
    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right fade-in duration-300">
        <div className="rounded-xl border border-sky-200 bg-sky-50 shadow-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-sky-500 animate-spin shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sky-800 text-sm">Downloading Update</div>
              <div className="mt-2 h-1.5 bg-sky-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <div className="text-xs text-sky-600 mt-1">{status.progress}%</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ready to install state
  if (status.type === 'ready') {
    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right fade-in duration-300">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 shadow-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-emerald-800 text-sm">Update Ready</div>
              <p className="text-xs text-emerald-600 mt-1">
                The update has been downloaded. Restart the app to apply changes.
              </p>
            </div>
            {handleClose ? (
              <button
                type="button"
                onClick={handleClose}
                className="text-emerald-400 hover:text-emerald-600 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Available update state (default)
  if (status.type === 'available') {
    const version = status.update.version;
    const currentVersion = status.update.currentVersion;

    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right fade-in duration-300">
        <div className="rounded-xl border border-amber-200 bg-white shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary text-sm">
                Update Available
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                Version <span className="font-medium text-text-secondary">{version}</span> is now available.
                {currentVersion && (
                  <span className="text-text-muted"> (Current: {currentVersion})</span>
                )}
              </p>
              
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={onUpdate}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-strong text-white text-xs font-medium hover:bg-surface-strong-hover transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download & Install
                </button>
                {handleClose ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3 py-1.5 rounded-lg border border-border-light text-text-secondary text-xs font-medium hover:bg-bg-subtle transition-colors"
                  >
                    Later
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Small update indicator for the status bar or header.
 * Shows a dot/badge when updates are available.
 */
export interface UpdateIndicatorProps {
  status: UpdateStatus | null;
  onClick: () => void;
}

export function UpdateIndicator({ 
  status, 
  onClick 
}: UpdateIndicatorProps) {
  if (!status) return null;
  
  if (status.type === 'available') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors animate-pulse"
        title={`Update available: ${status.update.version}`}
      >
        <Download className="w-3 h-3" />
        Update
      </button>
    );
  }

  if (status.type === 'ready') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors"
        title="Update ready to install"
      >
        <CheckCircle className="w-3 h-3" />
        Restart to Update
      </button>
    );
  }

  return null;
}
