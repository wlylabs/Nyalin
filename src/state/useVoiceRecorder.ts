'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_RECORDING_SECONDS } from '../lib/audio';
import type { NyalinErrorCode } from '../services/errors';

export type RecorderStatus = 'idle' | 'requesting' | 'recording';

const LEVEL_BARS = 32;

/** Urutan dari xenova/whisper-web: pilih format pertama yang didukung browser (Safari → mp4). */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];

function pickMimeType(): string | undefined {
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported?.(t));
}

function extensionFor(mime: string): string {
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

function recordingName(ext: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Rekaman ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${ext}`;
}

interface Options {
  onComplete: (file: File, durationSeconds: number) => void;
  onError: (code: NyalinErrorCode) => void;
}

/**
 * Perekam voice note dengan MediaRecorder.
 * Mikrofon diminta hanya saat user menekan "Rekam suara" dan dilepas begitu selesai/batal.
 * Rekaman hanya ada di memori — tidak diunggah, tidak disimpan.
 */
export function useVoiceRecorder({ onComplete, onError }: Options) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_BARS).fill(0));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number>(0);
  const startedAt = useRef(0);
  const discard = useRef(false);
  const callbacks = useRef({ onComplete, onError });
  callbacks.current = { onComplete, onError };

  const release = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(
    () => () => {
      discard.current = true;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      release();
    },
    [release],
  );

  const stop = useCallback(() => {
    discard.current = false;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    discard.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    else {
      release();
      setStatus('idle');
    }
  }, [release]);

  const start = useCallback(async () => {
    if (status !== 'idle') return;
    setStatus('requesting');
    setElapsed(0);
    setLevels(Array(LEVEL_BARS).fill(0));

    // AudioContext dibuat sebelum await apa pun: iOS Safari hanya mengizinkannya dalam gesture user.
    let context: AudioContext | null = null;
    try {
      const AudioCtx =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      context = new AudioCtx();
      void context.resume();
    } catch {
      /* meter level opsional */
    }
    contextRef.current = context;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (error) {
      release();
      setStatus('idle');
      const name = (error as DOMException)?.name;
      callbacks.current.onError(
        name === 'NotAllowedError' || name === 'SecurityError' ? 'mic-denied' : 'mic-unavailable',
      );
      return;
    }
    streamRef.current = stream;

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });
    recorder.addEventListener('stop', () => {
      const duration = (performance.now() - startedAt.current) / 1000;
      const type = recorder.mimeType || mimeType || 'audio/webm';
      release();
      setStatus('idle');
      if (discard.current || chunks.length === 0) return;
      const blob = new Blob(chunks, { type });
      callbacks.current.onComplete(new File([blob], recordingName(extensionFor(type)), { type }), duration);
    });
    recorderRef.current = recorder;

    // Meter level: bukti visual bahwa mikrofon menangkap suara. Timer tetap jalan tanpa meter.
    let analyser: AnalyserNode | null = null;
    let data: Float32Array<ArrayBuffer> | null = null;
    if (context) {
      try {
        analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        data = new Float32Array(analyser.fftSize);
      } catch {
        analyser = null;
      }
    }
    let lastPush = 0;
    const tick = (now: number) => {
      const seconds = (now - startedAt.current) / 1000;
      if (now - lastPush > 90) {
        lastPush = now;
        if (analyser && data) {
          analyser.getFloatTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v));
          setLevels((prev) => [...prev.slice(1), Math.min(1, peak * 2.2)]);
        }
        setElapsed(seconds);
      }
      if (seconds >= MAX_RECORDING_SECONDS) {
        stop();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    startedAt.current = performance.now();
    discard.current = false;
    recorder.start(1000);
    frameRef.current = requestAnimationFrame(tick);
    setStatus('recording');
  }, [status, release, stop]);

  return { status, elapsed, levels, start, stop, cancel };
}

export type VoiceRecorder = ReturnType<typeof useVoiceRecorder>;
