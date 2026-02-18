import { EventEmitter } from 'node:events';
import net from 'node:net';
import { Client } from 'ssh2';
import type { ConnectConfig } from 'ssh2';
import type { JumpHostConfig, TunnelAuthType, TunnelStatusChange } from '../shared/types';

export interface ForwardRuntimeConfig {
  id: string;
  sshHost: string;
  sshPort: number;
  username: string;
  authType: TunnelAuthType;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  jumpHost?: JumpHostConfig;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

interface RunningTunnel {
  targetClient: Client;
  jumpClient?: Client;
  server: net.Server;
}

export class TunnelManager extends EventEmitter {
  private readonly running = new Map<string, RunningTunnel>();
  private readonly statuses = new Map<string, TunnelStatusChange>();

  getStatus(id: string): TunnelStatusChange {
    return this.statuses.get(id) ?? { id, status: 'stopped' };
  }

  setKnownTunnel(id: string): void {
    if (!this.statuses.has(id)) {
      this.statuses.set(id, { id, status: 'stopped' });
    }
  }

  clearTunnel(id: string): void {
    this.statuses.delete(id);
  }

  async start(config: ForwardRuntimeConfig): Promise<void> {
    if (this.running.has(config.id)) {
      return;
    }

    this.updateStatus({ id: config.id, status: 'starting' });

    const targetClient = new Client();
    let jumpClient: Client | undefined;
    let server: net.Server | undefined;

    try {
      const targetConnectConfig = this.toConnectConfig({
        sshHost: config.sshHost,
        sshPort: config.sshPort,
        username: config.username,
        authType: config.authType,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });

      if (config.jumpHost) {
        jumpClient = new Client();
        await this.connectClient(jumpClient, this.toConnectConfig(config.jumpHost));
        targetConnectConfig.sock = await this.forwardThroughJump(
          jumpClient,
          config.sshHost,
          config.sshPort
        );
      }

      await this.connectClient(targetClient, targetConnectConfig);
      server = await this.createLocalServer(config, targetClient);

      this.running.set(config.id, { targetClient, jumpClient, server });
      this.bindRuntimeHandlers(config.id, targetClient, jumpClient, server);
      this.updateStatus({ id: config.id, status: 'running' });
    } catch (error) {
      this.safeCloseServer(server);
      this.safeEndClient(targetClient);
      this.safeEndClient(jumpClient);
      this.cleanup(config.id, { keepStatus: true });
      this.updateStatus({
        id: config.id,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async stop(id: string): Promise<void> {
    if (!this.running.has(id)) {
      this.updateStatus({ id, status: 'stopped' });
      return;
    }

    this.updateStatus({ id, status: 'stopping' });
    this.cleanup(id, { keepStatus: true });
    this.updateStatus({ id, status: 'stopped' });
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.running.keys()].map((id) => this.stop(id)));
  }

  private toConnectConfig(config: {
    sshHost: string;
    sshPort: number;
    username: string;
    authType: TunnelAuthType;
    password?: string;
    privateKey?: string;
    passphrase?: string;
  }): ConnectConfig {
    const connectConfig: ConnectConfig = {
      host: config.sshHost,
      port: config.sshPort,
      username: config.username,
      keepaliveInterval: 10000,
      keepaliveCountMax: 6,
      readyTimeout: 20000,
    };

    if (config.authType === 'password') {
      connectConfig.password = config.password ?? '';
    } else {
      connectConfig.privateKey = config.privateKey ?? '';
      if (config.passphrase) {
        connectConfig.passphrase = config.passphrase;
      }
    }

    return connectConfig;
  }

  private connectClient(client: Client, connectConfig: ConnectConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const onReady = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve();
      };

      const onError = (error: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      const onClose = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(new Error('SSH connection closed before ready.'));
      };

      const cleanup = (): void => {
        client.off('ready', onReady);
        client.off('error', onError);
        client.off('close', onClose);
      };

      client.once('ready', onReady);
      client.once('error', onError);
      client.on('close', onClose);
      client.connect(connectConfig);
    });
  }

  private forwardThroughJump(
    jumpClient: Client,
    targetHost: string,
    targetPort: number
  ): Promise<ConnectConfig['sock']> {
    return new Promise((resolve, reject) => {
      jumpClient.forwardOut('127.0.0.1', 0, targetHost, targetPort, (error, stream) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stream);
      });
    });
  }

  private createLocalServer(config: ForwardRuntimeConfig, targetClient: Client): Promise<net.Server> {
    const server = net.createServer((socket) => {
      targetClient.forwardOut(
        socket.localAddress ?? '127.0.0.1',
        socket.localPort ?? 0,
        config.remoteHost,
        config.remotePort,
        (forwardError, stream) => {
          if (forwardError) {
            socket.destroy(forwardError);
            return;
          }

          socket.pipe(stream).pipe(socket);

          stream.on('error', () => {
            socket.destroy();
          });

          socket.on('error', () => {
            stream.destroy();
          });
        }
      );
    });

    return new Promise((resolve, reject) => {
      const onListening = (): void => {
        cleanup();
        resolve(server);
      };

      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      const cleanup = (): void => {
        server.off('listening', onListening);
        server.off('error', onError);
      };

      server.once('listening', onListening);
      server.once('error', onError);
      server.listen(config.localPort, config.localHost);
    });
  }

  private bindRuntimeHandlers(
    id: string,
    targetClient: Client,
    jumpClient: Client | undefined,
    server: net.Server
  ): void {
    const handleRuntimeError = (prefix: string, error: Error): void => {
      if (!this.running.has(id)) {
        return;
      }
      this.updateStatus({
        id,
        status: 'error',
        error: `${prefix}: ${error.message}`,
      });
      this.cleanup(id, { keepStatus: true });
    };

    server.on('error', (error) => {
      handleRuntimeError('Local listener error', error as Error);
    });

    targetClient.on('error', (error) => {
      handleRuntimeError('SSH error', error);
    });

    targetClient.on('close', () => {
      if (!this.running.has(id)) {
        return;
      }
      const current = this.statuses.get(id);
      this.cleanup(id, { keepStatus: true });
      if (current?.status !== 'error') {
        this.updateStatus({ id, status: 'stopped' });
      }
    });

    if (jumpClient) {
      jumpClient.on('error', (error) => {
        handleRuntimeError('Jump SSH error', error);
      });

      jumpClient.on('close', () => {
        if (!this.running.has(id)) {
          return;
        }
        const current = this.statuses.get(id);
        if (current?.status !== 'error') {
          this.updateStatus({
            id,
            status: 'error',
            error: 'Jump SSH connection closed unexpectedly.',
          });
        }
        this.cleanup(id, { keepStatus: true });
      });
    }
  }

  private cleanup(id: string, options?: { keepStatus?: boolean }): void {
    const running = this.running.get(id);
    if (!running) {
      return;
    }

    this.running.delete(id);

    try {
      running.server.close();
    } catch {
      // no-op
    }

    try {
      running.targetClient.end();
    } catch {
      // no-op
    }

    try {
      running.jumpClient?.end();
    } catch {
      // no-op
    }

    if (!options?.keepStatus) {
      this.updateStatus({ id, status: 'stopped' });
    }
  }

  private updateStatus(change: TunnelStatusChange): void {
    this.statuses.set(change.id, change);
    this.emit('status-changed', change);
  }

  private safeEndClient(client: Client | undefined): void {
    if (!client) {
      return;
    }
    try {
      client.end();
    } catch {
      // no-op
    }
  }

  private safeCloseServer(server: net.Server | undefined): void {
    if (!server) {
      return;
    }
    try {
      server.close();
    } catch {
      // no-op
    }
  }
}
