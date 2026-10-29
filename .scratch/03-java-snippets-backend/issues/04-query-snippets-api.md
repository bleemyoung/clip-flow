# 04 — 列表与关键词查询 API

**构建内容：** API 调用方可查询所有 Snippet，或按标题与内容关键词筛选，结果按最近更新显示。

**阻塞关系：** 03 — 创建 Snippet API。

**Status:** done

- [x] `GET /api/snippets` 返回数组，空库和无匹配时返回空数组。
- [x] 可选 `keyword` 对标题或内容进行不区分大小写的搜索。
- [x] 结果按 `updatedAt` 倒序且同时间排序稳定；真实数据库测试覆盖关键查询场景。

**验收记录（2026-10-29）：** Testcontainers PostgreSQL 测试覆盖空库、标题/内容搜索、无匹配和排序。手工 `GET /api/snippets?keyword=SECOND` 命中两条标题或内容含 `second` 的记录；`keyword=no-match` 返回 `[]`；无关键词列表按新记录在前返回。Java 容器重启和完整 Compose 停启后查询结果保持不变。
