export interface AppMeta {
  name: string
  version: string
}

export interface AppShellApi {
  getAppMeta: () => AppMeta
}
