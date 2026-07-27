export const IPC_CHANNELS = {
  clipboardGetHistory: 'clipboard:get-history',
  clipboardCopyItem: 'clipboard:copy-item',
  clipboardTogglePin: 'clipboard:toggle-pin',
  clipboardDeleteItem: 'clipboard:delete-item',
  clipboardClearNormal: 'clipboard:clear-normal',
  clipboardHistoryChanged: 'clipboard:history-changed',
  snippetGetAll: 'snippet:get-all',
  snippetCreate: 'snippet:create',
  snippetUpdate: 'snippet:update',
  snippetDelete: 'snippet:delete',
  snippetCopy: 'snippet:copy',
  textCopy: 'text:copy'
} as const
