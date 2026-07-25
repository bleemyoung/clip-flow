# 02 — 验证 macOS 构建链路

**What to build:** 让项目在 macOS 上可以稳定通过 TypeScript 检查和 Electron/Vite 构建，证明当前源码与构建配置不依赖 Windows-only 能力。

**Blocked by:** 01 — 修复 macOS 本地依赖安装与 Electron 二进制准备。

**Status:** ready-for-agent

- [ ] 在 macOS 上运行构建命令并确认成功。
- [ ] 确认主进程、preload 和渲染层构建产物都能生成。
- [ ] 如果遇到从 Windows 环境迁移导致的可执行权限问题，修复并记录处理方式。
- [ ] 区分环境问题和源码问题，避免把本地依赖状态误判为代码不兼容。
- [ ] 将构建验证结果补充到项目文档或本 spec 的实施记录中。
