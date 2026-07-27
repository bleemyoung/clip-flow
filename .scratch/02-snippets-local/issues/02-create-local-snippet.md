# 02 — 创建本地 Snippet

**What to build:** 用户可以在 Snippets 页面填写标题和内容，创建一个本地 Snippet；保存后它立即出现在列表顶部，并在应用重启后继续存在。

**Blocked by:** 01 — 加载并恢复本地 Snippet 列表。

**Status:** ready-for-agent

- [ ] 用户可以打开创建表单、输入标题和内容并保存新的 Snippet。
- [ ] 标题和内容在 trim 后均不能为空；无效输入不会创建或持久化 Snippet。
- [ ] 成功创建会写入本地数据，生成完整的片段字段，并以最新 `updatedAt` 显示在列表顶部。
- [ ] 创建后的 Snippet 在应用重启后可恢复。
- [ ] 创建与校验行为有主进程服务自动化测试，关键创建交互可被验证。

