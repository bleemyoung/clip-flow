# 05 — 契约、文档与整体验收

**构建内容：** 新开发者可照说明从零启动服务、查看 OpenAPI，并用 HTTP 完成创建、查询和重启恢复验收。

**阻塞关系：** 03 — 创建 Snippet API；04 — 列表与关键词查询 API。

**Status:** done

- [x] OpenAPI 可访问，文档包含请求、响应和错误示例。
- [x] 从零启动、测试、停止命令可复现；记录实际验证的系统与结果。
- [x] 用 HTTP 验证健康检查、创建、查询、空白输入和重启后的持久化结果。

**验收记录（2026-10-29，macOS 15.0 arm64）：** `./mvnw package` 的 Testcontainers PostgreSQL 集成测试 5/5 通过；`./mvnw -DskipTests package` 与 `docker compose up --build -d` 成功。HTTP 健康检查 200/UP、POST 201、GET 200、空白标题 POST 400 且数据库无额外记录。`/v3/api-docs` 返回 OpenAPI 3.1，包含 `/api/snippets` 的 201 与 400 响应、错误 schema 和示例；`/swagger-ui.html` 跳转后页面 200。`docker compose restart app` 及 `docker compose down` 后 `docker compose up -d` 均可查询到原 UUID 和内容。启动、停止、请求与错误示例见 `server/README.md`。未在 Windows 验证。
