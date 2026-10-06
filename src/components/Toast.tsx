import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import './Toast.css';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
  /** Default 6 detik — cukup lama untuk dibaca dengan tenang. */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'tone' | 'duration'>> {
  id: number;
  action?: ToastOptions['action'];
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const counter = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    counter.current += 1;
    setToast({ id: counter.current, tone: 'info', duration: 6000, ...options });
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Region selalu ada di DOM supaya pengumuman dibaca pembaca layar. */}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toast && <Toast key={toast.id} item={toast} onDismiss={() => setToast(null)} />}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const Icon = ICONS[item.tone];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onDismiss, item.duration);
    return () => clearTimeout(timer);
  }, [paused, item.duration, onDismiss]);

  return (
    <div
      className={`toast toast--${item.tone}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="toast__icon" aria-hidden="true" />
      <p className="toast__message">{item.message}</p>
      {item.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            item.action?.onClick();
            onDismiss();
          }}
        >
          {item.action.label}
        </button>
      )}
      <button type="button" className="toast__close" aria-label="Tutup pemberitahuan" onClick={onDismiss}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return useMemo(() => ({ show }), [show]);
}
