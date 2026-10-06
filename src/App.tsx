import { useCallback, useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { FilePickerProvider, useFilePicker } from './components/FilePicker';
import { ToastProvider } from './components/Toast';
import { useNyalin, type NyalinController } from './state/useNyalin';
import { useHashRoute, type Route } from './state/useHashRoute';
import { HomeView } from './views/HomeView';
import { SelectedView } from './views/SelectedView';
import { ProcessingView } from './views/ProcessingView';
import { ResultView } from './views/ResultView';
import { ErrorView } from './views/ErrorView';
import { HistoryView } from './views/HistoryView';
import './views/views.css';

export default function App() {
  const nyalin = useNyalin();
  const { route, navigate } = useHashRoute();
  const { selectFile } = nyalin;

  const handleFile = useCallback(
    (file: File) => {
      selectFile(file);
      navigate('home');
    },
    [selectFile, navigate],
  );

  return (
    <ToastProvider>
      <FilePickerProvider onFile={handleFile}>
        <Shell nyalin={nyalin} route={route} navigate={navigate} onFile={handleFile} />
      </FilePickerProvider>
    </ToastProvider>
  );
}

function Shell({
  nyalin,
  route,
  navigate,
  onFile,
}: {
  nyalin: NyalinController;
  route: Route;
  navigate: (r: Route) => void;
  onFile: (file: File) => void;
}) {
  const { openFiles } = useFilePicker();
  const { state } = nyalin;

  // Fokus otomatis ke judul hanya setelah user berpindah tahap, bukan saat halaman pertama dibuka.
  const initialPhase = useRef(state.phase);
  const [hasMoved, setHasMoved] = useState(false);
  useEffect(() => {
    if (state.phase !== initialPhase.current) setHasMoved(true);
  }, [state.phase]);

  // Tempel gambar langsung dari clipboard (Ctrl+V) di desktop.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('textarea, input, [contenteditable="true"]')) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      onFile(file);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onFile]);

  // Mulai ulang: kembali ke awal dan langsung buka pemilih gambar.
  const startFresh = useCallback(() => {
    nyalin.reset();
    navigate('home');
    openFiles();
  }, [nyalin, navigate, openFiles]);

  const goHome = useCallback(() => {
    navigate('home');
  }, [navigate]);

  return (
    <>
      <a className="skip-link" href="#main">
        Langsung ke konten
      </a>
      <Navbar
        onHome={goHome}
        onHistory={() => navigate('history')}
        onStart={startFresh}
        historyActive={route === 'history'}
      />
      <main id="main" tabIndex={-1}>
        {route === 'history' ? (
          <HistoryView
            onStart={startFresh}
            onOpen={(entry) => {
              nyalin.openHistoryEntry(entry);
              navigate('home');
            }}
          />
        ) : (
          <MainFlow nyalin={nyalin} onFile={onFile} focusOnMount={hasMoved} />
        )}
      </main>
    </>
  );
}

function MainFlow({ nyalin, onFile, focusOnMount }: { nyalin: NyalinController; onFile: (f: File) => void; focusOnMount: boolean }) {
  const { state } = nyalin;
  switch (state.phase) {
    case 'empty':
      return <HomeView onFile={onFile} selectionError={state.selectionError} />;
    case 'selected':
      return (
        <SelectedView
          key={state.image.url}
          image={state.image}
          selectionError={state.selectionError}
          onStart={nyalin.start}
          focusOnMount={focusOnMount}
        />
      );
    case 'processing':
      return <ProcessingView image={state.image} progress={state.progress} onCancel={nyalin.cancel} />;
    case 'result':
      return (
        <ResultView
          key={state.image.url}
          image={state.image}
          result={state.result}
          onEdit={nyalin.editText}
          onAgain={nyalin.reset}
          focusOnMount={focusOnMount}
        />
      );
    case 'error':
      return (
        <ErrorView
          code={state.code}
          image={state.image}
          hasPartial={Boolean(state.partialText)}
          onRetry={nyalin.retry}
          onShowPartial={nyalin.showPartial}
        />
      );
  }
}
