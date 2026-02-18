# Contributing Guide

Thanks for your interest in contributing to SSH Tunnel Manager.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
pnpm install
```

3. Start the app:

```bash
pnpm run start
```

## Branch and Commit

- Create feature branches from `main`.
- Use clear commit messages, for example:
  - `feat: add jump host validation`
  - `fix: prevent table width shift on status updates`

## Pull Request Checklist

- Keep PR scope focused.
- Ensure `pnpm run build` passes.
- Update docs when behavior or commands change.
- Include screenshots/GIFs for UI updates.
- Explain user impact in the PR description.

## Reporting Issues

When opening an issue, please include:

- OS and version
- App version
- Reproduction steps
- Expected behavior
- Actual behavior
- Logs or screenshots (if available)

## Security

Please do not disclose security issues publicly.
Use the process described in `SECURITY.md`.
