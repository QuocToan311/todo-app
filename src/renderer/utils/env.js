export function isElectronEnv() {
  return Boolean(window.electronAPI && window.electronAPI.isElectron);
}