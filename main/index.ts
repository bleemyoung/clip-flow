import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { APP_NAME, WINDOW_CONFIG } from '@shared/constants/app'

let mainWindow: BrowserWindow | null = null
const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])

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

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
