# SSH Tunnel Manager

[![Release](https://img.shields.io/github/v/release/iyjian/ssh-tunnel-manager?sort=semver)](https://github.com/iyjian/ssh-tunnel-manager/releases)
[![License](https://img.shields.io/github/license/iyjian/ssh-tunnel-manager)](https://github.com/iyjian/ssh-tunnel-manager/blob/main/LICENSE)
[![Pages](https://img.shields.io/github/deployments/iyjian/ssh-tunnel-manager/github-pages?label=pages)](https://iyjian.github.io/ssh-tunnel-manager/)
[![Release Workflow](https://img.shields.io/github/actions/workflow/status/iyjian/ssh-tunnel-manager/release.yml?label=release)](https://github.com/iyjian/ssh-tunnel-manager/actions/workflows/release.yml)

Desktop SSH tunnel manager built with Electron and TypeScript.

- Group forwarding rules by SSH host
- Start/stop each rule independently
- Support password/private key auth
- Support optional jump host (bastion)

## Website

Project website (GitHub Pages):

- [https://iyjian.github.io/ssh-tunnel-manager/](https://iyjian.github.io/ssh-tunnel-manager/)

## Features

- Host-based tunnel grouping with clear table sections
- Multiple forwarding rules under one host
- Per-rule lifecycle controls: start, stop, delete
- Modal-based host editing/creation workflow
- Auth methods:
  - Password
  - Private key + optional passphrase
- Jump host support for target hosts in private networks
- Private key import from local files (default directory `~/.ssh`)
- Rule auto-start support (`autoStart`)

## Quick Start

```bash
pnpm install
pnpm run start
```

## Development

```bash
pnpm run build
pnpm run dev
```

## Package Builds

```bash
pnpm run package:mac
pnpm run package:win
pnpm run package:linux
```

Build artifacts are generated in `release/`.

## macOS Unsigned App Notice

This project currently ships unsigned macOS binaries (no Developer ID notarization).

If macOS blocks launch on first run, use one of these options:

1. In Finder, right-click the app and choose `Open`, then confirm.
2. Or remove quarantine in Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/SSH Tunnel Manager.app"
open -a "SSH Tunnel Manager"
```

## CI/CD

### Release pipeline

Workflow: `.github/workflows/release.yml`

- Triggered on push to `main` (or manual run)
- Automatically bumps patch version
- Tags release (`vX.Y.Z`)
- Builds macOS, Windows, and Linux artifacts
- Publishes GitHub Release

### GitHub Pages

Workflow: `.github/workflows/pages.yml`

- Deploys the `docs/` directory to GitHub Pages on push to `main`

## Contributing

Contributions are welcome.

- Read [CONTRIBUTING.md](./CONTRIBUTING.md)
- Follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Review [SECURITY.md](./SECURITY.md) for vulnerability reporting

## Roadmap

- Secret storage integration (Keychain/Credential Manager)
- Multi-hop jump chain support
- Rule templates and sharing
- Better diagnostics and connection test tools

## Project Structure

```text
src/
  main/
    main.ts          # Electron main process + IPC handlers
    preload.ts       # Secure renderer API bridge
    store.ts         # Tunnel configuration persistence
    tunnelManager.ts # SSH tunnel runtime management
  renderer/
    index.html
    styles.css
    renderer.ts      # UI behavior and rendering logic
  shared/
    types.ts         # Shared types between main and renderer
```

## Security Notes

SSH credentials are currently stored in local configuration (`userData/tunnels.json`).
If you need stronger protection, integrate OS-native secret storage.

## License

MIT
