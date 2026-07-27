# 05 — 复制 Snippet 并反馈结果

**What to build:** 用户可以将 Snippet 内容复制到系统剪贴板，并立即获知复制成功或失败；复制不会被误当成编辑。

**Blocked by:** 01 — 加载并恢复本地 Snippet 列表。

**Status:** ready-for-agent

- [ ] 用户可以从任意 Snippet 触发复制，并将其内容写入系统剪贴板。
- [ ] 界面会提供短暂、明确的复制成功或失败反馈。
- [ ] 复制不会改变 Snippet 的 `updatedAt` 或列表排序。
- [ ] 复制失败时不会修改本地 Snippet 数据。
- [ ] 主进程服务的复制成功和失败行为有自动化测试，关键反馈交互可被验证。
