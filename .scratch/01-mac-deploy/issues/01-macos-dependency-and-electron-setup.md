# 01 — 修复 macOS 本地依赖安装与 Electron 二进制准备

**构建内容：** 让开发者可以在 macOS 上完成项目依赖安装，并解决 Electron 二进制下载或安装不完整导致开发态无法启动的问题。

**阻塞关系：** 无，可以立即开始。

**状态：** done

- [x] 在 macOS 上确认推荐的 Node 和 npm 版本范围，并记录当前项目可用版本。
- [x] 完成依赖安装，确保项目本地依赖和命令行 bin 可用。
- [x] 解决 Electron 二进制缺失或安装不完整导致的启动错误。
- [x] 如果默认下载源不稳定，提供可复现的镜像配置或恢复命令。
- [x] 记录从失败状态恢复到可启动准备状态的步骤。

## 验证记录

- macOS 本地环境版本：Node `v22.22.3`，npm `10.9.8`。
- 已执行 `npm run setup:electron`，Electron 安装脚本成功结束。
- 已执行 `node node_modules/electron/cli.js --version`，返回 `v22.16.0`。
- 已确认 `node_modules/electron/dist/Electron.app` 存在。
- 已执行 `npm run build`，TypeScript 检查和 Electron/Vite 构建成功。
