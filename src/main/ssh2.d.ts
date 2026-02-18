declare module 'ssh2' {
  import { EventEmitter } from 'node:events';
  import { Duplex } from 'node:stream';

  export interface ConnectConfig {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: string | Buffer;
    passphrase?: string;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
    readyTimeout?: number;
  }

  export class Client extends EventEmitter {
    connect(config: ConnectConfig): this;
    end(): void;
    forwardOut(
      srcIP: string,
      srcPort: number,
      dstIP: string,
      dstPort: number,
      callback: (error: Error | undefined, stream: Duplex) => void
    ): void;
    once(event: 'ready', listener: () => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: () => void): this;
  }
}
