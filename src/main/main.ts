import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { TunnelManager, type ForwardRuntimeConfig } from './tunnelManager';
import { TunnelStore } from './store';
import type {
  ConfirmDialogOptions,
  ForwardRule,
  ForwardRuleDraft,
  HostConfig,
  HostDraft,
  HostView,
  JumpHostConfig,
  TunnelAuthType,
} from '../shared/types';

const manager = new TunnelManager();
let store: TunnelStore | null = null;
const APP_ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'icon.png');
const APP_DISPLAY_NAME = 'SSH Tunnel Manager';

app.setName(APP_DISPLAY_NAME);
app.setAboutPanelOptions({
  applicationName: APP_DISPLAY_NAME,
});

const IPC_CHANNELS = {
  listHosts: 'host:list',
  saveHost: 'host:save',
  deleteHost: 'host:delete',
  deleteForward: 'forward:delete',
  startForward: 'forward:start',
  stopForward: 'forward:stop',
  importPrivateKey: 'auth:import-private-key',
  confirmAction: 'dialog:confirm',
  status: 'forward:status',
};

interface DeleteForwardPayload {
  hostId: string;
  forwardId: string;
}

interface SshEndpointDraft {
  sshHost: string;
  sshPort: number | string;
  username: string;
  authType: TunnelAuthType;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

function getStore(): TunnelStore {
  if (!store) {
    throw new Error('Tunnel store is not initialized.');
  }
  return store;
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  return window;
}

function getAppIconImage(): Electron.NativeImage | null {
  const icon = nativeImage.createFromPath(APP_ICON_PATH);
  return icon.isEmpty() ? null : icon;
}

function applyAppIcon(): void {
  if (process.platform !== 'darwin') {
    return;
  }

  const icon = getAppIconImage();
  if (icon) {
    app.dock.setIcon(icon);
  }
}

function applyAppMenu(): void {
  if (process.platform !== 'darwin') {
    return;
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: APP_DISPLAY_NAME,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [{ role: 'close' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
    {
      label: 'Help',
      submenu: [],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function validateForwardDraft(input: ForwardRuleDraft): ForwardRule {
  const forward: ForwardRule = {
    id: input.id?.trim() || randomUUID(),
    localHost: input.localHost.trim(),
    localPort: Number(input.localPort),
    remoteHost: input.remoteHost.trim(),
    remotePort: Number(input.remotePort),
    autoStart: Boolean(input.autoStart),
  };

  if (!forward.localHost) {
    throw new Error('Local host is required.');
  }
  if (!forward.remoteHost) {
    throw new Error('Remote host is required.');
  }

  const ports = [forward.localPort, forward.remotePort];
  for (const port of ports) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Ports must be integers in range 1-65535.');
    }
  }

  return forward;
}

function validateSshEndpoint(input: SshEndpointDraft, scope: 'target' | 'jump'): JumpHostConfig {
  const label = scope === 'target' ? 'Target' : 'Jump host';
  const endpoint: JumpHostConfig = {
    sshHost: input.sshHost.trim(),
    sshPort: Number(input.sshPort),
    username: input.username.trim(),
    authType: input.authType,
    password: input.password,
    privateKey: input.privateKey,
    passphrase: input.passphrase,
  };

  if (!endpoint.sshHost) {
    throw new Error(`${label} SSH host is required.`);
  }
  if (!endpoint.username) {
    throw new Error(`${label} SSH username is required.`);
  }
  if (!Number.isInteger(endpoint.sshPort) || endpoint.sshPort < 1 || endpoint.sshPort > 65535) {
    throw new Error(`${label} SSH port must be an integer in range 1-65535.`);
  }

  if (endpoint.authType === 'password') {
    if (!endpoint.password) {
      throw new Error(`${label} password is required for password authentication.`);
    }
    endpoint.privateKey = undefined;
    endpoint.passphrase = undefined;
  } else {
    if (!endpoint.privateKey?.trim()) {
      throw new Error(`${label} private key is required for private key authentication.`);
    }
    endpoint.password = undefined;
  }

  return endpoint;
}

function validateHostDraft(input: HostDraft): HostConfig {
  const target = validateSshEndpoint(
    {
      sshHost: input.sshHost,
      sshPort: input.sshPort,
      username: input.username,
      authType: input.authType,
      password: input.password,
      privateKey: input.privateKey,
      passphrase: input.passphrase,
    },
    'target'
  );

  const host: HostConfig = {
    id: input.id?.trim() || randomUUID(),
    name: input.name.trim(),
    sshHost: target.sshHost,
    sshPort: target.sshPort,
    username: target.username,
    authType: target.authType,
    password: target.password,
    privateKey: target.privateKey,
    passphrase: target.passphrase,
    jumpHost: input.jumpHost ? validateSshEndpoint(input.jumpHost, 'jump') : undefined,
    forwards: (input.forwards ?? []).map((item) => validateForwardDraft(item)),
  };

  if (!host.name) {
    throw new Error('Host name is required.');
  }
  if (host.forwards.length === 0) {
    throw new Error('At least one forwarding rule is required.');
  }

  return host;
}

function toRuntimeConfig(host: HostConfig, forward: ForwardRule): ForwardRuntimeConfig {
  return {
    id: forward.id,
    sshHost: host.sshHost,
    sshPort: host.sshPort,
    username: host.username,
    authType: host.authType,
    password: host.password,
    privateKey: host.privateKey,
    passphrase: host.passphrase,
    jumpHost: host.jumpHost ? { ...host.jumpHost } : undefined,
    localHost: forward.localHost,
    localPort: forward.localPort,
    remoteHost: forward.remoteHost,
    remotePort: forward.remotePort,
  };
}

function toHostView(host: HostConfig): HostView {
  return {
    ...host,
    forwards: host.forwards.map((forward) => {
      const status = manager.getStatus(forward.id);
      return {
        ...forward,
        status: status.status,
        error: status.error,
      };
    }),
  };
}

async function stopAndClearRemovedForwards(existing: HostConfig, next: HostConfig): Promise<void> {
  const nextIds = new Set(next.forwards.map((item) => item.id));
  const removed = existing.forwards.filter((item) => !nextIds.has(item.id));

  for (const forward of removed) {
    await manager.stop(forward.id);
    manager.clearTunnel(forward.id);
  }
}

async function stopAllHostForwards(host: HostConfig): Promise<void> {
  await Promise.all(host.forwards.map((forward) => manager.stop(forward.id)));
}

async function autoStartHostForwards(host: HostConfig): Promise<void> {
  for (const forward of host.forwards) {
    if (!forward.autoStart) {
      continue;
    }

    void manager.start(toRuntimeConfig(host, forward)).catch(() => {
      // state updates are emitted by manager
    });
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.listHosts, async () => {
    const hosts = getStore().listHosts();
    for (const host of hosts) {
      for (const forward of host.forwards) {
        manager.setKnownTunnel(forward.id);
      }
    }
    return hosts.map(toHostView);
  });

  ipcMain.handle(IPC_CHANNELS.saveHost, async (_event, draft: HostDraft) => {
    const next = validateHostDraft(draft);
    const existing = getStore().findHostById(next.id);

    for (const forward of next.forwards) {
      manager.setKnownTunnel(forward.id);
    }

    if (existing) {
      await stopAllHostForwards(existing);
      await stopAndClearRemovedForwards(existing, next);
    }

    await getStore().upsertHost(next);
    await autoStartHostForwards(next);

    return toHostView(next);
  });

  ipcMain.handle(IPC_CHANNELS.deleteHost, async (_event, hostId: string) => {
    const host = getStore().findHostById(hostId);
    if (!host) {
      return;
    }

    await stopAllHostForwards(host);
    for (const forward of host.forwards) {
      manager.clearTunnel(forward.id);
    }

    await getStore().removeHost(hostId);
  });

  ipcMain.handle(IPC_CHANNELS.deleteForward, async (_event, payload: DeleteForwardPayload) => {
    const host = getStore().findHostById(payload.hostId);
    if (!host) {
      return;
    }

    const forward = host.forwards.find((item) => item.id === payload.forwardId);
    if (!forward) {
      return;
    }

    await manager.stop(forward.id);
    manager.clearTunnel(forward.id);
    await getStore().removeForward(payload.hostId, payload.forwardId);
  });

  ipcMain.handle(IPC_CHANNELS.startForward, async (_event, id: string) => {
    const lookup = getStore().findForwardById(id);
    if (!lookup) {
      throw new Error('Forward rule not found.');
    }

    try {
      await manager.start(toRuntimeConfig(lookup.host, lookup.forward));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[IPC forward:start] Failed to start ${id}: ${message}`);
      throw new Error(message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.stopForward, async (_event, id: string) => {
    await manager.stop(id);
  });

  ipcMain.handle(IPC_CHANNELS.confirmAction, async (event, options: ConfirmDialogOptions) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const icon = getAppIconImage();
    const messageBoxOptions = {
      type: options.kind ?? 'question',
      title: options.title,
      message: options.message,
      detail: options.detail,
      buttons: [options.cancelLabel ?? 'Cancel', options.confirmLabel ?? 'Confirm'],
      defaultId: 1,
      cancelId: 0,
      noLink: true,
      ...(icon ? { icon } : {}),
    };
    const result = parentWindow
      ? await dialog.showMessageBox(parentWindow, messageBoxOptions)
      : await dialog.showMessageBox(messageBoxOptions);

    return result.response === 1;
  });

  ipcMain.handle(IPC_CHANNELS.importPrivateKey, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Private Key File',
      defaultPath: path.join(app.getPath('home'), '.ssh'),
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    const content = await fs.readFile(selectedPath, 'utf8');
    return {
      path: selectedPath,
      content,
    };
  });
}

function wireStatusBroadcast(): void {
  manager.on('status-changed', (change) => {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      window.webContents.send(IPC_CHANNELS.status, change);
    }
  });
}

async function autoStartForwards(): Promise<void> {
  const hosts = getStore().listHosts();
  for (const host of hosts) {
    await autoStartHostForwards(host);
  }
}

async function bootstrap(): Promise<void> {
  store = new TunnelStore(path.join(app.getPath('userData'), 'tunnels.json'));
  await store.load();

  applyAppIcon();
  applyAppMenu();
  registerIpcHandlers();
  wireStatusBroadcast();
  createWindow();
  await autoStartForwards();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.whenReady()
  .then(() => bootstrap())
  .catch((error) => {
    console.error('Failed to bootstrap app:', error);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    void manager.stopAll().finally(() => app.quit());
  }
});

app.on('before-quit', () => {
  void manager.stopAll();
});
