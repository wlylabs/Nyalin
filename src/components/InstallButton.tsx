import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { promptInstall, useInstallState } from '../lib/pwa';

/**
 * "Pasang" — hanya muncul bila browser mengizinkan instalasi.
 * Android/desktop: dialog instal bawaan browser. iOS Safari: petunjuk "Tambah ke Layar Utama".
 */
export function InstallButton() {
  const state = useInstallState();
  const [iosHelp, setIosHelp] = useState(false);
  if (state !== 'available' && state !== 'ios') return null;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        icon={<Download />}
        className="navbar__install"
        onClick={() => (state === 'ios' ? setIosHelp(true) : void promptInstall())}
      >
        Pasang
      </Button>
      <Modal open={iosHelp} onClose={() => setIosHelp(false)} title="Pasang Nyalin di iPhone">
        <ol className="install-steps">
          <li>
            Ketuk <Share aria-hidden="true" /> <strong>Bagikan</strong> di bilah bawah Safari.
          </li>
          <li>
            Pilih <SquarePlus aria-hidden="true" /> <strong>Tambah ke Layar Utama</strong>.
          </li>
          <li>Ketuk <strong>Tambah</strong>. Nyalin akan terbuka seperti aplikasi biasa.</li>
        </ol>
      </Modal>
    </>
  );
}
