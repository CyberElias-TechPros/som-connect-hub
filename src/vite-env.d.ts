/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_ENV?: string
  readonly VITE_ENABLE_OFFLINE?: string
  readonly VITE_ENABLE_NOTIFICATIONS?: string
  readonly VITE_HAPPY_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

