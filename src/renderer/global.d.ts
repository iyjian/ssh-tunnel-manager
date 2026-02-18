import type { TunnelApi } from '../shared/types';

declare global {
  interface Window {
    tunnelApi: TunnelApi;
  }
}

export {};
