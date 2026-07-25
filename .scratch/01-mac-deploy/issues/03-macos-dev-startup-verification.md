# 03 — 验证 macOS 开发态启动

**What to build:** 让开发者可以在 macOS 上以开发模式启动 Electron 应用，并看到渲染层 UI 正常加载。

**Blocked by:** 01 — 修复 macOS 本地依赖安装与 Electron 二进制准备。

**Status:** ready-for-agent

- [ ] 在 macOS 上启动开发命令并确认 renderer dev server 可用。
- [ ] 确认 Electron 桌面窗口能打开并加载应用界面。
- [ ] 验证关闭最后一个窗口后，macOS 应用生命周期行为符合预期。
- [ ] 验证重新激活应用时窗口或剪贴板状态同步行为符合预期。
- [ ] 记录开发态启动所需的环境前提和常见失败恢复方式。
