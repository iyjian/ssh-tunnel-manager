import { EventEmitter } from 'node:events';
import { app, dialog, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import type { UpdateState } from '../shared/types';

type UpdateTrigger = 'auto' | 'manual';

const AUTO_CHECK_DELAY_MS = 10_000;
const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export class AppUpdater extends EventEmitter {
  private readonly isPackaged = app.isPackaged;
  private readonly currentVersion = app.getVersion();

  private state: UpdateState;
  private isChecking = false;
  private started = false;
  private timer?: ReturnType<typeof setInterval>;
  private lastTrigger: UpdateTrigger = 'auto';
  private promptedDownloadVersion?: string;
  private promptedInstallVersion?: string;

  constructor(private readonly getWindow: () => BrowserWindow | null) {
    super();

    this.state = this.isPackaged
      ? {
          status: 'idle',
          currentVersion: this.currentVersion,
          trigger: 'auto',
        }
      : {
          status: 'unsupported',
          currentVersion: this.currentVersion,
          trigger: 'auto',
          message: 'Auto update works in packaged builds only.',
        };
  }

  start(): void {
    if (this.started || !this.isPackaged) {
      this.emitState();
      return;
    }

    this.started = true;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowDowngrade = false;

    this.bindEvents();
    this.emitState();

    setTimeout(() => {
      void this.checkForUpdates('auto');
    }, AUTO_CHECK_DELAY_MS);

    this.timer = setInterval(() => {
      void this.checkForUpdates('auto');
    }, AUTO_CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  async checkForUpdates(trigger: UpdateTrigger = 'manual'): Promise<UpdateState> {
    this.lastTrigger = trigger;

    if (!this.isPackaged) {
      this.setState({
        status: 'unsupported',
        currentVersion: this.currentVersion,
        trigger,
        message: 'Auto update works in packaged builds only.',
      });
      return this.getState();
    }

    if (this.isChecking) {
      return this.getState();
    }

    this.isChecking = true;
    this.setState({
      status: 'checking',
      currentVersion: this.currentVersion,
      trigger,
      message: 'Checking for updates...',
    });

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.handleError(error, trigger);
    } finally {
      this.isChecking = false;
    }

    return this.getState();
  }

  private bindEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      this.setState({
        status: 'checking',
        currentVersion: this.currentVersion,
        trigger: this.lastTrigger,
        message: 'Checking for updates...',
      });
    });

    autoUpdater.on('update-not-available', () => {
      this.setState({
        status: 'up-to-date',
        currentVersion: this.currentVersion,
        trigger: this.lastTrigger,
        message: `You're up to date (${this.currentVersion}).`,
      });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.setState({
        status: 'available',
        currentVersion: this.currentVersion,
        availableVersion: info.version,
        trigger: this.lastTrigger,
        message: `Update ${info.version} is available.`,
      });
      void this.promptDownload(info);
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.setState({
        status: 'downloading',
        currentVersion: this.currentVersion,
        availableVersion: this.state.availableVersion,
        progressPercent: progress.percent,
        trigger: this.lastTrigger,
        message: `Downloading update ${this.state.availableVersion ?? ''} (${Math.round(progress.percent)}%).`,
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.setState({
        status: 'downloaded',
        currentVersion: this.currentVersion,
        availableVersion: info.version,
        downloadedVersion: info.version,
        trigger: this.lastTrigger,
        message: `Update ${info.version} downloaded. Restart to install.`,
      });
      void this.promptInstall(info);
    });

    autoUpdater.on('error', (error: Error) => {
      this.handleError(error, this.lastTrigger);
    });
  }

  private async promptDownload(info: UpdateInfo): Promise<void> {
    const version = info.version || '';
    if (!version) {
      return;
    }
    if (this.promptedDownloadVersion === version && this.lastTrigger === 'auto') {
      return;
    }
    this.promptedDownloadVersion = version;

    const result = await this.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Version ${version} is available.`,
      detail: 'Do you want to download and install it now?',
      buttons: ['Later', 'Download'],
      cancelId: 0,
      defaultId: 1,
      noLink: true,
    });

    if (result.response !== 1) {
      return;
    }

    try {
      this.setState({
        status: 'downloading',
        currentVersion: this.currentVersion,
        availableVersion: version,
        trigger: this.lastTrigger,
        message: `Downloading update ${version}...`,
      });
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.handleError(error, this.lastTrigger);
    }
  }

  private async promptInstall(info: UpdateInfo): Promise<void> {
    const version = info.version || '';
    if (!version || this.promptedInstallVersion === version) {
      return;
    }
    this.promptedInstallVersion = version;

    const result = await this.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${version} has been downloaded.`,
      detail: 'Restart now to apply the update.',
      buttons: ['Later', 'Restart Now'],
      cancelId: 0,
      defaultId: 1,
      noLink: true,
    });

    if (result.response !== 1) {
      return;
    }

    autoUpdater.quitAndInstall(false, true);
  }

  private handleError(error: unknown, trigger: UpdateTrigger): void {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = this.buildFriendlyError(rawMessage);

    this.setState({
      status: 'error',
      currentVersion: this.currentVersion,
      availableVersion: this.state.availableVersion,
      trigger,
      message,
      rawMessage,
    });

    console.error('[Updater] Update flow failed', {
      trigger,
      error: rawMessage,
    });
  }

  private buildFriendlyError(rawMessage: string): string {
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes('net::err_internet_disconnected')) {
      return 'Update check failed: no internet connection.';
    }
    if (normalized.includes('net::err_name_not_resolved')) {
      return 'Update check failed: DNS lookup failed.';
    }
    if (normalized.includes('status code 404')) {
      return 'Update metadata was not found in the release assets.';
    }
    if (normalized.includes('cannot find channel')) {
      return 'Update channel metadata is missing.';
    }

    return `Update check failed: ${rawMessage}`;
  }

  private async showMessageBox(
    options: Electron.MessageBoxOptions
  ): Promise<Electron.MessageBoxReturnValue> {
    const window = this.getWindow();
    if (window) {
      return dialog.showMessageBox(window, options);
    }
    return dialog.showMessageBox(options);
  }

  private setState(next: UpdateState): void {
    this.state = next;
    this.emitState();
  }

  private emitState(): void {
    this.emit('state-changed', this.getState());
  }
}
