# 03 — 编辑本地 Snippet

**构建内容：** 用户可以编辑已有 Snippet 的标题或内容；保存后更新后的片段立即显示在列表顶部，并在重启后保留修改。

**阻塞关系：** 01 — 加载并恢复本地 Snippet 列表。

**Status:** done

- [x] 用户可以从 Snippet 列表进入编辑，并复用创建表单完成保存。
- [x] 编辑遵守标题和内容的 trim 后非空校验；无效输入不会覆盖原有 Snippet。
- [x] 成功编辑刷新 `updatedAt`、更新本地数据并使该 Snippet 按排序规则显示在列表顶部。
- [x] 编辑后的数据在应用重启后可恢复。
- [x] 编辑、排序和非法输入保护有主进程服务自动化测试。

## 验证记录

- `npm test -- main/snippet-service.test.ts`
- `npm run build`
