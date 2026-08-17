import React from 'react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, default 6000 for error, 4000 for success
  timestamp: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  targetElementOrSelector?: string | HTMLElement | null;
  focusTarget?: boolean;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private recentMessages: Map<string, number> = new Map(); // For deduplication

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener([...this.toasts]);
    }
  }

  /**
   * Sanitizes technical errors, stack traces, and HTTP codes into clear, user-friendly messages.
   */
  public sanitizeErrorMessage(err: any): string {
    if (!err) return 'An unexpected error occurred. Please try again.';

    let rawMessage = '';
    if (typeof err === 'string') {
      rawMessage = err;
    } else if (err.message && typeof err.message === 'string') {
      rawMessage = err.message;
    } else if (err.error && typeof err.error === 'string') {
      rawMessage = err.error;
    } else if (err.msg && typeof err.msg === 'string') {
      rawMessage = err.msg;
    } else {
      rawMessage = String(err);
    }

    rawMessage = rawMessage.trim();

    // Check for HTTP Status / Common Network codes
    if (rawMessage.includes('405') || rawMessage.includes('Method Not Allowed')) {
      return 'The requested operation is not supported or cannot be performed at this time.';
    }
    if (rawMessage.includes('403') || rawMessage.includes('Forbidden') || rawMessage.includes('permission') || rawMessage.includes('Permission denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (rawMessage.includes('401') || rawMessage.includes('Unauthorized') || rawMessage.includes('JWT expired')) {
      return 'Your session has expired or you are not authorized. Please log in again.';
    }
    if (rawMessage.includes('404') || rawMessage.includes('Not Found')) {
      return 'The requested record or resource could not be found.';
    }
    if (rawMessage.includes('500') || rawMessage.includes('Internal Server Error')) {
      return 'A server error occurred. Please try again in a moment.';
    }
    if (
      rawMessage.toLowerCase().includes('failed to fetch') ||
      rawMessage.toLowerCase().includes('networkerror') ||
      rawMessage.toLowerCase().includes('network request failed') ||
      rawMessage.toLowerCase().includes('err_connection_refused')
    ) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    // Clean up JavaScript internal crashes
    if (
      rawMessage.includes('Cannot access') ||
      rawMessage.includes('is not a function') ||
      rawMessage.includes('Cannot read properties of undefined') ||
      rawMessage.includes('Cannot read property') ||
      rawMessage.includes('null is not an object') ||
      rawMessage.includes('ReferenceError') ||
      rawMessage.includes('TypeError')
    ) {
      return 'An unexpected system error occurred. Please try again.';
    }

    // Return human-readable message, truncating absurdly long payloads
    return rawMessage.length > 300 ? rawMessage.slice(0, 300) + '...' : rawMessage;
  }

  /**
   * Adds a toast notification with deduplication.
   */
  public addToast(type: ToastType, rawMessage: string | Error | any, options: ToastOptions = {}): string | null {
    const message = type === 'error' ? this.sanitizeErrorMessage(rawMessage) : String(rawMessage || '').trim();
    if (!message) return null;

    // Deduplication check: ignore identical message within 2500ms
    const now = Date.now();
    const dedupKey = `${type}:${message.toLowerCase()}`;
    const lastSeen = this.recentMessages.get(dedupKey);

    if (lastSeen && now - lastSeen < 2500) {
      // Refresh timestamp and return existing without duplicating UI
      this.recentMessages.set(dedupKey, now);
      return null;
    }
    this.recentMessages.set(dedupKey, now);

    // Clean up old deduplication cache
    if (this.recentMessages.size > 50) {
      for (const [key, timestamp] of this.recentMessages.entries()) {
        if (now - timestamp > 10000) {
          this.recentMessages.delete(key);
        }
      }
    }

    const id = `toast-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options.duration ?? (type === 'error' ? 6500 : 4000);

    const defaultTitle = 
      type === 'error' ? 'Error' :
      type === 'success' ? 'Success' :
      type === 'warning' ? 'Warning' : 'Information';

    const newToast: ToastItem = {
      id,
      type,
      title: options.title || defaultTitle,
      message,
      duration,
      timestamp: now,
      action: options.action
    };

    // Keep at most 4 toasts at a time
    this.toasts = [newToast, ...this.toasts.slice(0, 3)];
    this.notify();

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }

    // Auto-scroll if error and requested
    if (type === 'error') {
      this.scrollToError(options.targetElementOrSelector, { focus: options.focusTarget ?? true });
    }

    return id;
  }

  public removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  public clearAll() {
    this.toasts = [];
    this.notify();
  }

  /**
   * Helper to find the closest scrollable container for an element
   */
  private findScrollContainer(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      // Check for explicit modal/drawer markers
      if (
        parent.getAttribute('data-modal-content') === 'true' ||
        parent.getAttribute('data-scroll-container') === 'true' ||
        parent.classList.contains('custom-scrollbar') ||
        parent.classList.contains('overflow-y-auto') ||
        parent.classList.contains('overflow-y-scroll')
      ) {
        return parent;
      }

      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight;
      if (isScrollable) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  /**
   * Smart auto-scrolling that locates the error in modals, drawers, or page viewport,
   * scrolls the relevant container, and focuses the target element.
   */
  public scrollToError(
    targetOrSelector?: string | HTMLElement | null,
    options: { containerSelector?: string; focus?: boolean } = {}
  ) {
    // Run asynchronously to allow state updates/DOM renders to settle
    setTimeout(() => {
      let targetElement: HTMLElement | null = null;

      if (typeof targetOrSelector === 'string') {
        targetElement = document.querySelector(targetOrSelector) as HTMLElement | null;
      } else if (targetOrSelector instanceof HTMLElement) {
        targetElement = targetOrSelector;
      }

      // If no explicit target provided, auto-detect first error element or invalid input
      if (!targetElement) {
        targetElement = (
          document.querySelector('[data-error="true"]') ||
          document.querySelector('.error-banner') ||
          document.querySelector('.border-red-500') ||
          document.querySelector('.border-red-500\\/60') ||
          document.querySelector('[aria-invalid="true"]') ||
          document.querySelector('form :invalid') ||
          document.querySelector('.text-red-400') ||
          document.querySelector('.error-message')
        ) as HTMLElement | null;
      }

      if (!targetElement) {
        // Fallback: check if an active modal is open and scroll its top
        const activeModalContainer = document.querySelector('[data-modal-content="true"], .custom-scrollbar') as HTMLElement | null;
        if (activeModalContainer) {
          activeModalContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      // Find the specific container (modal body, drawer, or window)
      const scrollContainer = this.findScrollContainer(targetElement);

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        // Calculate offset relative to the scroll container
        const currentScrollTop = scrollContainer.scrollTop;
        const relativeOffset = targetRect.top - containerRect.top + currentScrollTop - 40; // 40px margin

        scrollContainer.scrollTo({
          top: Math.max(0, relativeOffset),
          behavior: 'smooth'
        });
      } else {
        // Scroll window/page
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

      // Highlight / Focus for accessibility
      if (options.focus !== false) {
        if (
          targetElement instanceof HTMLInputElement ||
          targetElement instanceof HTMLSelectElement ||
          targetElement instanceof HTMLTextAreaElement ||
          targetElement.hasAttribute('tabindex')
        ) {
          try {
            targetElement.focus({ preventScroll: true });
          } catch (e) {}
        }

        // Temporary visual flash highlight
        const originalTransition = targetElement.style.transition;
        const originalOutline = targetElement.style.outline;
        targetElement.style.transition = 'all 0.3s ease';
        targetElement.style.outline = '2px solid rgba(239, 68, 68, 0.8)';
        targetElement.style.outlineOffset = '2px';

        setTimeout(() => {
          if (targetElement) {
            targetElement.style.outline = originalOutline;
            targetElement.style.transition = originalTransition;
          }
        }, 2000);
      }
    }, 60);
  }
}

export const toast = new ToastManager();

// Global convenience shortcuts
export function showError(message: string | Error | any, options?: ToastOptions): string | null {
  return toast.addToast('error', message, options);
}

export function showSuccess(message: string, options?: ToastOptions): string | null {
  return toast.addToast('success', message, options);
}

export function showWarning(message: string, options?: ToastOptions): string | null {
  return toast.addToast('warning', message, options);
}

export function showInfo(message: string, options?: ToastOptions): string | null {
  return toast.addToast('info', message, options);
}

export function scrollToError(targetOrSelector?: string | HTMLElement | null, options?: { containerSelector?: string; focus?: boolean }) {
  toast.scrollToError(targetOrSelector, options);
}

// Attach to window for universal access across any library or callback
if (typeof window !== 'undefined') {
  (window as any).showError = showError;
  (window as any).showSuccess = showSuccess;
  (window as any).showWarning = showWarning;
  (window as any).showInfo = showInfo;
  (window as any).scrollToError = scrollToError;

  // Listen for custom app-error events
  window.addEventListener('app-error', (e: any) => {
    if (e.detail) {
      showError(e.detail.message || e.detail, e.detail.options);
    }
  });

  window.addEventListener('app-success', (e: any) => {
    if (e.detail) {
      showSuccess(e.detail.message || e.detail, e.detail.options);
    }
  });
}
