export type TunnelAuthType = 'password' | 'privateKey';

export type TunnelStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ForwardRule {
  id: string;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  autoStart: boolean;
}

export interface ForwardRuleDraft {
  id?: string;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  autoStart: boolean;
}

export interface JumpHostConfig {
  sshHost: string;
  sshPort: number;
  username: string;
  authType: TunnelAuthType;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface HostConfig {
  id: string;
  name: string;
  sshHost: string;
  sshPort: number;
  username: string;
  authType: TunnelAuthType;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  jumpHost?: JumpHostConfig;
  forwards: ForwardRule[];
}

export interface HostDraft {
  id?: string;
  name: string;
  sshHost: string;
  sshPort: number;
  username: string;
  authType: TunnelAuthType;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  jumpHost?: JumpHostConfig;
  forwards: ForwardRuleDraft[];
}

export interface ForwardRuleView extends ForwardRule {
  status: TunnelStatus;
  error?: string;
}

export interface HostView extends Omit<HostConfig, 'forwards'> {
  forwards: ForwardRuleView[];
}

export interface TunnelStatusChange {
  id: string;
  status: TunnelStatus;
  error?: string;
}

export interface PrivateKeyImportResult {
  path: string;
  content: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  detail?: string;
  kind?: 'question' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface TunnelApi {
  listHosts: () => Promise<HostView[]>;
  saveHost: (host: HostDraft) => Promise<HostView>;
  deleteHost: (id: string) => Promise<void>;
  deleteForward: (hostId: string, forwardId: string) => Promise<void>;
  startForward: (id: string) => Promise<void>;
  stopForward: (id: string) => Promise<void>;
  importPrivateKey: () => Promise<PrivateKeyImportResult | null>;
  confirmAction: (options: ConfirmDialogOptions) => Promise<boolean>;
  onStatusChanged: (listener: (change: TunnelStatusChange) => void) => () => void;
}
