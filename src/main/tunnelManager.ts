import { EventEmitter } from 'node:events';
import net from 'node:net';
import { Client } from 'ssh2';
import type { ConnectConfig } from 'ssh2';
import type { TunnelAuthType, TunnelStatusChange } from '../shared/types';

export interface ForwardRuntimeConfig {
  id: string;
  sshHost: string;
  sshPort: number;
  username: string;
  authType: TunnelAuthType;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

interface RunningTunnel {
  client: Client;
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

    const client = new Client();
    let server: net.Server | null = null;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let started = false;

      const cleanupPending = (): void => {
        if (server) {
          try {
            server.close();
          } catch {
            // no-op
          }
        }
        try {
          client.end();
        } catch {
          // no-op
        }
      };

      const rejectOnce = (error: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanupPending();
        reject(error);
      };

      const resolveOnce = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };

      client.once('ready', () => {
        server = net.createServer((socket) => {
          client.forwardOut(
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
            }
          );
        });

        server.on('error', (error) => {
          if (!started) {
            rejectOnce(error as Error);
            return;
          }
          this.updateStatus({
            id: config.id,
            status: 'error',
            error: `Local listener error: ${(error as Error).message}`,
          });
          this.cleanup(config.id);
        });

        server.listen(config.localPort, config.localHost, () => {
          if (!server) {
            rejectOnce(new Error('Tunnel server initialization failed.'));
            return;
          }

          started = true;
          this.running.set(config.id, { client, server });
          this.updateStatus({ id: config.id, status: 'running' });
          resolveOnce();
        });
      });

      client.once('error', (error) => {
        if (!started) {
          rejectOnce(error as Error);
          return;
        }

        this.updateStatus({
          id: config.id,
          status: 'error',
          error: `SSH error: ${(error as Error).message}`,
        });
        this.cleanup(config.id);
      });

      client.on('close', () => {
        const wasRunning = this.running.delete(config.id);
        if (wasRunning) {
          const current = this.statuses.get(config.id);
          if (current?.status !== 'error') {
            this.updateStatus({ id: config.id, status: 'stopped' });
          }
        }

        if (!started) {
          rejectOnce(new Error('SSH connection closed before tunnel started.'));
        }
      });

      client.connect(this.toConnectConfig(config));
    }).catch((error) => {
      this.cleanup(config.id, { keepStatus: true });
      this.updateStatus({
        id: config.id,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });
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

  private toConnectConfig(config: ForwardRuntimeConfig): ConnectConfig {
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
      running.client.end();
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
}
