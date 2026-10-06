import type { Metadata } from 'next';
import { HistoryView } from '../../views/HistoryView';

export const metadata: Metadata = {
  title: 'Riwayat',
  // Halaman pribadi per perangkat — tidak perlu diindeks.
  robots: { index: false },
};

export default function HistoryPage() {
  return <HistoryView />;
}
