const { app, BrowserWindow, ipcMain } = require('electron');
const { connectMongo, closeMongo } = require('./src/main/database');
const { createMainWindow } = require('./src/main/window');
const { registerAuthHandlers } = require('./src/main/ipc/authHandlers');
const { registerTaskHandlers } = require('./src/main/ipc/taskHandlers');

// Initialize app
app.whenReady().then(async () => {
  try {
    await connectMongo();
    createMainWindow();

    // Register IPC handlers
    registerAuthHandlers(ipcMain);
    registerTaskHandlers(ipcMain);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeMongo().finally(() => app.quit());
  }
});

app.on('before-quit', async () => {
  await closeMongo();
});