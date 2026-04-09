/// <reference types="vite/client" />

import type { AppShellApi } from '@shared/types/ipc'

declare global {
  interface Window {
    clipflow: AppShellApi
  }
}

export {}
