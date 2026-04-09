# ClipFlow

`ClipFlow` 是一个基于 `Electron + Vue3 + TypeScript + Vite` 的桌面效率工具，用于管理剪贴板历史、执行常见文本转换，并维护可复用的常用片段。

## 当前状态

- 当前定位：个人单机使用的桌面效率工具
- 当前阶段：已完成项目初始化与基础壳子，正在推进核心功能闭环
- 当前能力：可执行 `npm run dev`、`npm run build`，支持开发态 DevTools 调试
- 当前缺口：剪贴板监听、本地持久化、片段 CRUD、文本转换复制链路仍待补齐

## 技术栈

- `Electron`
- `Vue3`
- `TypeScript`
- `Vite`
- `electron-vite`

## 文档导航

### 项目说明

- [项目介绍](./项目介绍.md)
- [实施进度](./实施进度.md)
- [后续计划](./后续计划.md)

### 使用与沉淀

- [问题修复](./docs/问题修复.md)
- [项目使用](./docs/项目使用.md)
- [项目知识点](./docs/项目知识点.md)

## 快速启动

```bash
npm install
npm run dev
```

## 快速构建

```bash
npm run build
```

## 已知问题入口

- 运行期存在 Windows 本地缓存目录权限告警，当前不阻塞开发与构建
- 具体问题记录见：[问题修复](./docs/问题修复.md)
