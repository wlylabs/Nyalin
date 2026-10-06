'use client';

import { ViewTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNyalin } from '../state/NyalinProvider';
import { HomeView } from './HomeView';
import { SelectedView } from './SelectedView';
import { ProcessingView } from './ProcessingView';
import { ResultView } from './ResultView';
import { ErrorView } from './ErrorView';

/** Kelas animasi per arah (lihat styles/motion.css). */
const STAGE_MOTION = {
  forward: 'vt-forward',
  back: 'vt-back',
  default: 'vt-fade',
};

/**
 * Halaman utama: satu layar per tahap alur (kosong → dipilih → proses → hasil / error).
 * Setiap tahap masuk/keluar lewat View Transition; pratinjau media (nama "nyalin-media")
 * menjadi shared element sehingga berpindah posisi dengan mulus antar tahap.
 */
export function MainFlow() {
  const nyalin = useNyalin();
  return (
    <ViewTransition key={nyalin.state.phase} enter={STAGE_MOTION} exit={STAGE_MOTION} default="none">
      <Stage />
    </ViewTransition>
  );
}

function Stage(): ReactNode {
  const nyalin = useNyalin();
  const { state } = nyalin;

  // Fokus otomatis ke judul hanya setelah user berpindah tahap, bukan saat halaman pertama dibuka.
  const initialPhase = useRef(state.phase);
  const [hasMoved, setHasMoved] = useState(false);
  useEffect(() => {
    if (state.phase !== initialPhase.current) setHasMoved(true);
  }, [state.phase]);

  switch (state.phase) {
    case 'empty':
      return <HomeView onFile={(f) => nyalin.selectFile(f)} selectionError={state.selectionError} />;
    case 'selected':
      return (
        <SelectedView
          key={state.media.url}
          media={state.media}
          language={state.language}
          selectionError={state.selectionError}
          onStart={nyalin.start}
          onLanguageChange={nyalin.setLanguage}
          focusOnMount={hasMoved}
        />
      );
    case 'processing':
      return <ProcessingView media={state.media} progress={state.progress} onCancel={nyalin.cancel} />;
    case 'result':
      return (
        <ResultView
          key={state.media.url || state.result.historyId || 'result'}
          media={state.media}
          result={state.result}
          onEdit={nyalin.editText}
          onEditReceipt={nyalin.editReceipt}
          onAgain={nyalin.reset}
          focusOnMount={hasMoved}
        />
      );
    case 'error':
      return (
        <ErrorView
          code={state.code}
          media={state.media}
          hasPartial={Boolean(state.partialText)}
          onRetry={nyalin.retry}
          onShowPartial={nyalin.showPartial}
        />
      );
  }
}
