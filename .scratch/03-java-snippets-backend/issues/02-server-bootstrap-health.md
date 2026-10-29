# 02 — 建立服务骨架与健康检查

**构建内容：** 开发者可用 Compose 在本机启动 Spring Boot 服务和 PostgreSQL，并通过 HTTP 确认服务健康。

**阻塞关系：** 01 — 准备 Java 容器环境。

**Status:** done

- [x] `server/` 包含 Java 21、Spring Boot 3.5 与 Maven Wrapper 工程。
- [x] Compose 启动服务和 PostgreSQL，端口仅绑定本机；数据库使用持久卷。
- [x] 健康检查通过，启动与停止命令可复现。

**验收记录（2026-10-29）：** `./mvnw -DskipTests package` 成功；`docker compose up --build -d` 启动 `server-app-1` 与健康的 `server-db-1`。`docker compose ps` 显示端口仅绑定 `127.0.0.1:8080` 和 `127.0.0.1:5433`；`GET /actuator/health` 返回 HTTP 200 `{"status":"UP"}`。数据库使用 `server_postgres_data` 命名卷。停止与重启将在 05 中复验。
