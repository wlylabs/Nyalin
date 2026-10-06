import { History, Plus } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import './Navbar.css';

export function Navbar({
  onHome,
  onHistory,
  onStart,
  historyActive,
}: {
  onHome: () => void;
  onHistory: () => void;
  onStart: () => void;
  historyActive: boolean;
}) {
  return (
    <header className="navbar">
      <nav className="navbar__inner" aria-label="Navigasi utama">
        <a
          href="#/"
          className="navbar__brand"
          aria-label="Nyalin, ke halaman awal"
          onClick={(e) => {
            e.preventDefault();
            onHome();
          }}
        >
          <Logo size={30} />
        </a>
        <div className="navbar__actions">
          <a
            href="#/riwayat"
            className="navbar__link"
            aria-current={historyActive ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onHistory();
            }}
          >
            <History aria-hidden="true" />
            <span>Riwayat</span>
          </a>
          <Button variant="primary" size="sm" icon={<Plus />} onClick={onStart} className="navbar__cta">
            Mulai Nyalin
          </Button>
        </div>
      </nav>
    </header>
  );
}
