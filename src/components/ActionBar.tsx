import type { ReactNode } from 'react';
import './ActionBar.css';

/**
 * Wadah aksi utama. Di ponsel menempel di bawah layar (mudah dijangkau ibu jari),
 * di layar besar mengalir biasa di bawah konten.
 */
export function ActionBar({
  children,
  mobileOnly = false,
  label,
}: {
  children: ReactNode;
  mobileOnly?: boolean;
  label?: string;
}) {
  return (
    <div className={`action-bar${mobileOnly ? ' action-bar--mobile-only' : ''}`} role="group" aria-label={label}>
      <div className="action-bar__inner">{children}</div>
    </div>
  );
}
