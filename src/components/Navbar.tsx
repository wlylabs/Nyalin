import Link from 'next/link';
import { History, Plus } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import './Navbar.css';

export function Navbar({ onStart, historyActive }: { onStart: () => void; historyActive: boolean }) {
  return (
    <header className="navbar">
      <nav className="navbar__inner" aria-label="Navigasi utama">
        <Link href="/" className="navbar__brand" aria-label="Nyalin, ke halaman awal">
          <Logo size={30} />
        </Link>
        <div className="navbar__actions">
          <Link href="/riwayat" className="navbar__link" aria-current={historyActive ? 'page' : undefined}>
            <History aria-hidden="true" />
            <span>Riwayat</span>
          </Link>
          <Button variant="primary" size="sm" icon={<Plus />} onClick={onStart} className="navbar__cta">
            Mulai Nyalin
          </Button>
        </div>
      </nav>
    </header>
  );
}
