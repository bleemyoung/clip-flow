# 03 — 创建 Snippet API

**构建内容：** API 调用方可提交标题和内容，在 PostgreSQL 中保存 Snippet，并得到可再次查询的 ID 与时间。

**阻塞关系：** 02 — 建立服务骨架与健康检查。

**Status:** done

- [x] Flyway 创建 Snippet 表；`POST /api/snippets` 返回 `201` 和完整 Snippet。
- [x] 标题去除首尾空白后保存，内容保留排版；空白输入返回统一 `400` 且不入库。
- [x] 真实 PostgreSQL 集成测试覆盖创建、校验与持久化。

**验收记录（2026-10-29）：** Testcontainers PostgreSQL 集成测试通过。手工 POST 标题 `  HTTP acceptance  `、多行内容返回 201、UUID `90494ff0-1baf-4874-8a2e-44d27cd166b0`、去空白标题、原样内容及 UTC 时间；空白标题返回 400 `INVALID_REQUEST`。数据库行数仍为 1，证明无效请求未入库。
