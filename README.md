# SSH Tunnel Manager (Electron + TypeScript)

一个从零搭建的桌面 SSH 隧道管理器，支持按登录主机分组管理多条端口转发规则。

## 功能

- Electron GUI（TypeScript）
- 隧道配置持久化存储（`userData/tunnels.json`）
- 支持密码和私钥两种认证方式
- 同一主机下可一次配置多条端口转发规则
- 规则支持单独启动/停止/删除，主机支持分组编辑
- 支持规则级自动连接（`autoStart`）

## 技术栈

- Electron
- TypeScript
- [ssh2](https://www.npmjs.com/package/ssh2)

## 启动

```bash
pnpm install
pnpm run start
```

## 开发常用命令

```bash
pnpm run build
pnpm run dev
```

## 目录结构

```text
src/
  main/
    main.ts          # Electron 主进程
    preload.ts       # 安全 IPC 暴露
    store.ts         # 隧道配置存储
    tunnelManager.ts # SSH 隧道生命周期管理
  renderer/
    index.html
    styles.css
    renderer.ts      # UI 逻辑
  shared/
    types.ts         # 主/渲染共享类型
```

## 注意事项

- 这是本地开发版本，隧道敏感信息（如密码、私钥）会存储在本机 `userData/tunnels.json`。
- 若你希望加强安全性，可进一步接入系统钥匙串（macOS Keychain、Windows Credential Manager）。
- 目前默认监听方式为 `localHost:localPort -> sshHost -> remoteHost:remotePort`。
