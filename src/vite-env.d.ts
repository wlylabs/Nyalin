/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OCR_PROVIDER?: string;
  readonly VITE_OCR_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
