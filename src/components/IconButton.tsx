import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import './IconButton.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Wajib: label untuk pembaca layar dan tooltip. */
  label: string;
  icon: ReactNode;
  variant?: 'ghost' | 'secondary';
  size?: 'md' | 'sm';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={['icon-btn', `icon-btn--${variant}`, `icon-btn--${size}`, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
});
