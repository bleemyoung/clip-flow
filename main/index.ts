import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { CLIPBOARD_HISTORY_LIMIT, CLIPBOARD_POLLING_INTERVAL, APP_NAME, WINDOW_CONFIG } from '@shared/constants/app'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import { ClipboardHistoryService } from './clipboard-history'

let mainWindow: BrowserWindow | null = null
let clipboardHistoryService: ClipboardHistoryService | null = null
const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])

function getClipboardHistoryService(): ClipboardHistoryService {
  if (!clipboardHistoryService) {
    throw new Error('Clipboard history service is not ready.')
  }

  return clipboardHistoryService
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    minWidth: WINDOW_CONFIG.minWidth,
    minHeight: WINDOW_CONFIG.minHeight,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()

    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.webContents.on('before-input-event', (_, input) => {
    const isOpenDevTools = input.key === 'F12'
    const isToggleShortcut = input.control && input.shift && input.key.toLowerCase() === 'i'

    if (isOpenDevTools || isToggleShortcut) {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  if (isDev) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerClipboardIpc(): void {
  ipcMain.handle(IPC_CHANNELS.clipboardGetHistory, () => getClipboardHistoryService().getSnapshot())
  ipcMain.handle(IPC_CHANNELS.clipboardCopyItem, async (_event, id: string) => {
    await getClipboardHistoryService().copyItem(id)
  })
  ipcMain.handle(IPC_CHANNELS.clipboardTogglePin, (_event, id: string) =>
    getClipboardHistoryService().togglePin(id)
  )
  ipcMain.handle(IPC_CHANNELS.clipboardDeleteItem, (_event, id: string) =>
    getClipboardHistoryService().deleteItem(id)
  )
  ipcMain.handle(IPC_CHANNELS.clipboardClearNormal, () =>
    getClipboardHistoryService().clearNormalItems()
  )
}

app.whenReady().then(async () => {
  clipboardHistoryService = new ClipboardHistoryService()
  clipboardHistoryService.setOnChange((snapshot) => {
    mainWindow?.webContents.send(IPC_CHANNELS.clipboardHistoryChanged, snapshot)
  })

  await clipboardHistoryService.initialize()
  registerClipboardIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.clipboardHistoryChanged, {
        items: getClipboardHistoryService().getSnapshot().items,
        limit: CLIPBOARD_HISTORY_LIMIT,
        pollingInterval: CLIPBOARD_POLLING_INTERVAL
      })
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  clipboardHistoryService?.dispose()
})
