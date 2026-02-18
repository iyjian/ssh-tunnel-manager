import { contextBridge, ipcRenderer } from 'electron';
import type { HostDraft, TunnelApi, TunnelStatusChange } from '../shared/types';

const api: TunnelApi = {
  listHosts: () => ipcRenderer.invoke('host:list'),
  saveHost: (host: HostDraft) => ipcRenderer.invoke('host:save', host),
  deleteHost: (id: string) => ipcRenderer.invoke('host:delete', id),
  deleteForward: (hostId: string, forwardId: string) =>
    ipcRenderer.invoke('forward:delete', { hostId, forwardId }),
  startForward: (id: string) => ipcRenderer.invoke('forward:start', id),
  stopForward: (id: string) => ipcRenderer.invoke('forward:stop', id),
  importPrivateKey: () => ipcRenderer.invoke('auth:import-private-key'),
  onStatusChanged: (listener: (change: TunnelStatusChange) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, change: TunnelStatusChange): void => {
      listener(change);
    };

    ipcRenderer.on('forward:status', wrapped);

    return () => {
      ipcRenderer.removeListener('forward:status', wrapped);
    };
  },
};

contextBridge.exposeInMainWorld('tunnelApi', api);
