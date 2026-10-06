import './Logo.css';

/**
 * Logo Nyalin: goresan tangan yang melingkar lalu berubah menjadi garis lurus —
 * tulisan tangan yang "disalin" menjadi baris teks digital.
 */
export function LogoMark({ size = 32, title, draw = false }: { size?: number; title?: string; draw?: boolean }) {
  return (
    <svg
      className={`logo-mark${draw ? ' logo-mark--draw' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect width="40" height="40" rx="11" fill="var(--color-brand-600)" />
      <path
        className="logo-mark__stroke"
        pathLength={1}
        d="M9 23c3 0 5.5-3.5 6.5-7.5.9-3.7-.9-5.7-2.5-4.3-1.8 1.6-.8 6.8 2.4 10 1.6 1.4 3.1 1.8 5.1 1.8H31"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="logo-mark__line"
        pathLength={1}
        d="M9 29.5h15"
        stroke="#fff"
        strokeOpacity=".6"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** `draw`: goresan logo digambar saat halaman pertama dibuka (momen brand, < 1,2 dtk). */
export function Logo({ size = 32, draw = false }: { size?: number; draw?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={size} draw={draw} />
      <span className="logo__wordmark">Nyalin</span>
    </span>
  );
}
