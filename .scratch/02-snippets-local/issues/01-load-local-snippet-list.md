# 01 — 加载并恢复本地 Snippet 列表

**构建内容：** 用户打开 Snippets 页面时，应用从本地 Snippet 数据中加载列表，而不再显示 mock；数据会按片段更新时间倒序展示。不存在或损坏的本地数据不会阻止用户使用空列表。

**阻塞关系：** 无，可立即开始。

**Status:** done

- [x] 应用启动后，Snippets 页面通过受控桥接显示已持久化的 Snippet，且不再依赖 mock 数据。
- [x] Snippet 列表按 `updatedAt` 倒序显示，关键词搜索继续覆盖标题和内容。
- [x] 不存在、无效或损坏的本地数据会安全降级为空列表，不导致应用无法启动。
- [x] 主进程 Snippet 服务的加载、恢复、排序和损坏数据降级行为有自动化测试。

## 验证记录

- `npm test -- main/snippet-service.test.ts`
- `npm run build`
- `env -u ELECTRON_RUN_AS_NODE npm run dev`
