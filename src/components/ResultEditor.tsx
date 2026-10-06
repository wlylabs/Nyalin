import { forwardRef, useId, useLayoutEffect, useImperativeHandle, useRef } from 'react';
import './ResultEditor.css';

export interface ResultEditorHandle {
  focus: () => void;
}

/**
 * Editor hasil: textarea biasa (paling andal untuk mobile, IME, dan pembaca layar),
 * tumbuh mengikuti isi agar tidak ada scroll ganda.
 */
export const ResultEditor = forwardRef<
  ResultEditorHandle,
  { value: string; onChange: (v: string) => void; describedBy?: string; reveal?: boolean }
>(
  /** `reveal`: teks muncul dari atas ke bawah sekali, seperti hasil pindaian — hanya untuk hasil baru. */
  function ResultEditor({ value, onChange, describedBy, reveal = false }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const id = useId();

    useImperativeHandle(ref, () => ({
      focus() {
        const el = textareaRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        el.setSelectionRange(el.value.length, el.value.length);
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      },
    }));

    useLayoutEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight + 2}px`;
    }, [value]);

    return (
      <div className={`result-editor${reveal ? ' text-reveal' : ''}`}>
        <label htmlFor={id} className="sr-only">
          Teks hasil Nyalin, bisa diedit
        </label>
        <textarea
          ref={textareaRef}
          id={id}
          className="result-editor__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          placeholder="Ketik atau perbaiki teks di sini."
          spellCheck
          lang="id"
          autoCapitalize="sentences"
        />
      </div>
    );
  },
);
