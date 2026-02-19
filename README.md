# SSH Tunnel Manager

[![Release](https://img.shields.io/github/v/release/iyjian/ssh-tunnel-manager?sort=semver)](https://github.com/iyjian/ssh-tunnel-manager/releases)
[![License](https://img.shields.io/github/license/iyjian/ssh-tunnel-manager)](https://github.com/iyjian/ssh-tunnel-manager/blob/main/LICENSE)
[![Pages](https://img.shields.io/github/deployments/iyjian/ssh-tunnel-manager/github-pages?label=pages)](https://iyjian.github.io/ssh-tunnel-manager/)
[![Release Workflow](https://img.shields.io/github/actions/workflow/status/iyjian/ssh-tunnel-manager/release.yml?label=release)](https://github.com/iyjian/ssh-tunnel-manager/actions/workflows/release.yml)

A minimal desktop app for managing SSH local port forwarding with grouped hosts, per-rule controls, and migration-friendly config import/export.

Website: [https://iyjian.github.io/ssh-tunnel-manager/](https://iyjian.github.io/ssh-tunnel-manager/)

## Why SSH Tunnel Manager

- Manage many tunnel rules without remembering long `ssh -L ...` commands
- Group rules by SSH host and control each rule independently
- Use password or private key auth (with optional jump host / bastion)
- Share or migrate setup between machines with JSON import/export

## Features

- Host-based grouping with clean, consistent rule table layout
- Multiple forwarding rules under one host profile
- Start and stop per rule
- Auto-start rules
- Connection error diagnostics with user-friendly messages
- Retry countdown for failed rules
- Auth methods:
  - Private key (default)
  - Password
- Private key import from local file
- Jump host support
- Config import/export from the app UI

## Download

Get prebuilt binaries from [Releases](https://github.com/iyjian/ssh-tunnel-manager/releases):

- macOS: `.dmg`
- Windows: `.exe` (NSIS)
- Linux (amd64): `.AppImage`

## macOS Notice (Unsigned App)

Current macOS artifacts are unsigned. If launch is blocked on first run:

1. Right click the app in Finder and choose `Open`
2. Or run:

```bash
xattr -dr com.apple.quarantine "/Applications/SSH Tunnel Manager.app"
open -a "SSH Tunnel Manager"
```

## Config Import/Export

Use `Import Config` and `Export Config` in the Overview quick actions.

- Export saves all hosts and rules as JSON
- Import supports:
  - host array (`[...]`)
  - wrapped object (`{ "hosts": [...] }`)
- Import replaces local config and reapplies `autoStart` rules

## Developer Quick Start

```bash
pnpm install
pnpm run start
```

## Build Commands

```bash
pnpm run build
pnpm run package:mac
pnpm run package:win
pnpm run package:linux
```

Artifacts are generated in `release/`.

## CI/CD

- Release workflow: `.github/workflows/release.yml`
  - bumps patch version
  - creates tag and release
  - builds macOS / Windows / Linux artifacts
- Pages workflow: `.github/workflows/pages.yml`
  - deploys `docs/` to GitHub Pages

## Security Note

SSH credentials are stored in local config (`userData/tunnels.json`).

For stronger protection, integrate OS secret storage (Keychain / Credential Manager / libsecret) in a future release.

## Promotion Kit

- Release template: `.github/RELEASE_TEMPLATE.md`
- Launch copy (EN + ZH): `marketing/LAUNCH_COPY.md`

## Contributing

Contributions are welcome.

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## License

MIT
