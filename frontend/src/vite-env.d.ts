/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENABLE_GRAPH_VIEW: string;
  readonly VITE_ENABLE_CLUSTERING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
