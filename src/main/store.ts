import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ForwardRule, HostConfig, TunnelAuthType } from '../shared/types';

interface LegacyTunnelConfig {
  id: string;
  name: string;
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
  autoStart: boolean;
}

interface ForwardLookup {
  host: HostConfig;
  forward: ForwardRule;
}

export class TunnelStore {
  private hosts: HostConfig[] = [];

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      this.hosts = this.normalize(data);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        this.hosts = [];
        await this.persist();
        return;
      }
      throw error;
    }
  }

  listHosts(): HostConfig[] {
    return this.hosts.map((host) => this.cloneHost(host));
  }

  findHostById(id: string): HostConfig | undefined {
    const host = this.hosts.find((item) => item.id === id);
    if (!host) {
      return undefined;
    }
    return this.cloneHost(host);
  }

  findForwardById(forwardId: string): ForwardLookup | undefined {
    for (const host of this.hosts) {
      const forward = host.forwards.find((item) => item.id === forwardId);
      if (forward) {
        return {
          host: this.cloneHost(host),
          forward: { ...forward },
        };
      }
    }
    return undefined;
  }

  async upsertHost(host: HostConfig): Promise<void> {
    const index = this.hosts.findIndex((item) => item.id === host.id);
    if (index >= 0) {
      this.hosts[index] = host;
    } else {
      this.hosts.push(host);
    }
    await this.persist();
  }

  async replaceHosts(hosts: HostConfig[]): Promise<void> {
    this.hosts = hosts.map((host) => this.cloneHost(host));
    await this.persist();
  }

  async removeHost(id: string): Promise<void> {
    this.hosts = this.hosts.filter((item) => item.id !== id);
    await this.persist();
  }

  async removeForward(hostId: string, forwardId: string): Promise<void> {
    const index = this.hosts.findIndex((item) => item.id === hostId);
    if (index < 0) {
      return;
    }

    const host = this.hosts[index];
    const nextForwards = host.forwards.filter((item) => item.id !== forwardId);
    if (nextForwards.length === 0) {
      this.hosts = this.hosts.filter((item) => item.id !== hostId);
    } else {
      this.hosts[index] = {
        ...host,
        forwards: nextForwards,
      };
    }

    await this.persist();
  }

  private normalize(data: unknown): HostConfig[] {
    if (!Array.isArray(data)) {
      return [];
    }

    if (data.length === 0) {
      return [];
    }

    const first = data[0] as Record<string, unknown>;
    if (first && Array.isArray(first.forwards)) {
      return data as HostConfig[];
    }

    return this.fromLegacy(data as LegacyTunnelConfig[]);
  }

  private cloneHost(host: HostConfig): HostConfig {
    return {
      ...host,
      jumpHost: host.jumpHost ? { ...host.jumpHost } : undefined,
      forwards: host.forwards.map((forward) => ({ ...forward })),
    };
  }

  private fromLegacy(legacyTunnels: LegacyTunnelConfig[]): HostConfig[] {
    const byKey = new Map<string, HostConfig>();

    for (const tunnel of legacyTunnels) {
      const key = JSON.stringify({
        sshHost: tunnel.sshHost,
        sshPort: tunnel.sshPort,
        username: tunnel.username,
        authType: tunnel.authType,
        password: tunnel.password ?? '',
        privateKey: tunnel.privateKey ?? '',
        passphrase: tunnel.passphrase ?? '',
      });

      let host = byKey.get(key);
      if (!host) {
        host = {
          id: randomUUID(),
          name: tunnel.name || `${tunnel.username}@${tunnel.sshHost}`,
          sshHost: tunnel.sshHost,
          sshPort: tunnel.sshPort,
          username: tunnel.username,
          authType: tunnel.authType,
          password: tunnel.password,
          privateKey: tunnel.privateKey,
          passphrase: tunnel.passphrase,
          forwards: [],
        };
        byKey.set(key, host);
      }

      host.forwards.push({
        id: tunnel.id || randomUUID(),
        localHost: tunnel.localHost,
        localPort: tunnel.localPort,
        remoteHost: tunnel.remoteHost,
        remotePort: tunnel.remotePort,
        autoStart: Boolean(tunnel.autoStart),
      });
    }

    return [...byKey.values()];
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.hosts, null, 2), 'utf8');
  }
}
