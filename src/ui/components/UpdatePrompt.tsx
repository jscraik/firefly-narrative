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

  /**
 * Maps technical errors to user-friendly messages
 */
function getUserFriendlyError(error: string): { title: string; message: string; isWebMode?: boolean } {
  const lowerError = error.toLowerCase();
  
  // Tauri API unavailable (running in browser mode)
  if (lowerError.includes('cannot read properties of undefined') && lowerError.includes('invoke')) {
    return {
      title: 'Desktop Features Unavailable',
      message: 'Auto-updates are only available in the desktop app. Please download the latest version from our releases page.',
      isWebMode: true,
    };
  }
  
  // Network errors
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return {
      title: 'Connection Issue',
      message: 'Unable to check for updates. Please check your internet connection and try again.',
    };
  }
  
  // Server errors
  if (lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503')) {
    return {
      title: 'Server Error',
      message: 'Our update server is temporarily unavailable. Please try again later.',
    };
  }
  
  // Default error
  return {
    title: 'Update Error',
    message: 'Something went wrong while checking for updates. Please try again.',
  };
}

// Error state
  if (status.type === 'error') {
    const { title, message, isWebMode } = getUserFriendlyError(status.error);
    
    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right fade-in duration-300">
        <div className="rounded-xl border border-accent-red-light bg-accent-red-bg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-red mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-accent-red text-sm">{title}</div>
              <p className="text-xs text-text-secondary mt-1">{message}</p>
              <div className="flex gap-2 mt-3">
                {onCheckAgain && !isWebMode && (
                  <button
                    type="button"
                    onClick={onCheckAgain}
                    className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try Again
                  </button>
                )}
                {isWebMode && (
                  <a
                    href="https://github.com/jscraik/narrative/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-accent-blue hover:text-accent-blue/80 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download App
                  </a>
                )}
              </div>
            </div>
            {handleClose ? (
              <button
                type="button"
                onClick={handleClose}
                className="text-text-tertiary hover:text-text-secondary transition-colors"
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
        <div className="rounded-xl border border-accent-blue-light bg-accent-blue-bg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-accent-blue motion-safe:animate-spin shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-text-primary text-sm">Downloading Update</div>
              <div className="mt-2 h-1.5 bg-accent-blue-light rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent-blue transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <div className="text-xs text-text-tertiary mt-1">{status.progress}%</div>
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
        <div className="rounded-xl border border-accent-green-light bg-accent-green-bg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-accent-green mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-text-primary text-sm">Update Ready</div>
              <p className="text-xs text-text-tertiary mt-1">
                The update has been downloaded. Restart the app to apply changes.
              </p>
            </div>
            {handleClose ? (
              <button
                type="button"
                onClick={handleClose}
                className="text-text-tertiary hover:text-text-secondary transition-colors"
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
          <div className="rounded-xl border border-border-light bg-bg-card shadow-lg p-4">
            <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-blue-bg border border-accent-blue-light flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-accent-blue" />
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
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-strong text-text-inverse text-xs font-medium hover:bg-surface-strong-hover transition-colors"
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
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-accent-amber-light bg-accent-amber-bg text-accent-amber text-xs font-medium hover:bg-bg-hover transition-colors motion-safe:animate-pulse"
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
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-accent-green-light bg-accent-green-bg text-accent-green text-xs font-medium hover:bg-bg-hover transition-colors"
        title="Update ready to install"
      >
        <CheckCircle className="w-3 h-3" />
        Restart to Update
      </button>
    );
  }

  return null;
}
