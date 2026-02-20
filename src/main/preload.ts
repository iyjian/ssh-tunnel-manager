import { contextBridge, ipcRenderer } from 'electron';
import type {
  ConfirmDialogOptions,
  HostDraft,
  TunnelApi,
  TunnelStatusChange,
  UpdateState,
} from '../shared/types';

const api: TunnelApi = {
  listHosts: () => ipcRenderer.invoke('host:list'),
  saveHost: (host: HostDraft) => ipcRenderer.invoke('host:save', host),
  deleteHost: (id: string) => ipcRenderer.invoke('host:delete', id),
  deleteForward: (hostId: string, forwardId: string) =>
    ipcRenderer.invoke('forward:delete', { hostId, forwardId }),
  startForward: (id: string) => ipcRenderer.invoke('forward:start', id),
  stopForward: (id: string) => ipcRenderer.invoke('forward:stop', id),
  importPrivateKey: () => ipcRenderer.invoke('auth:import-private-key'),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),
  getUpdateState: () => ipcRenderer.invoke('updater:get-state'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  confirmAction: (options: ConfirmDialogOptions) => ipcRenderer.invoke('dialog:confirm', options),
  onStatusChanged: (listener: (change: TunnelStatusChange) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, change: TunnelStatusChange): void => {
      listener(change);
    };

    ipcRenderer.on('forward:status', wrapped);

    return () => {
      ipcRenderer.removeListener('forward:status', wrapped);
    };
  },
  onUpdateStateChanged: (listener: (state: UpdateState) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: UpdateState): void => {
      listener(state);
    };

    ipcRenderer.on('updater:state', wrapped);

    return () => {
      ipcRenderer.removeListener('updater:state', wrapped);
    };
  },
};

contextBridge.exposeInMainWorld('tunnelApi', api);
