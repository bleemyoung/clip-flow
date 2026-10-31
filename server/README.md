# ClipFlow Snippets Java API

此目录是独立的本地开发服务，不改变 Electron 离线 Snippets 列表的数据源。除原有创建与查询外，04 增加了带请求标识的幂等创建及手动更新；没有登录鉴权，端口仅绑定 `127.0.0.1`，不得直接暴露到局域网或公网。

## 环境

- JDK 21（本机运行 Maven 测试时需要）
- Docker Desktop（含 Compose）或 Docker Engine + Compose 插件
- 不需要全局 Maven，使用 `./mvnw`（Windows 使用 `mvnw.cmd`）

macOS 若终端里的 `docker compose` 不可用，但 Docker Desktop 已安装，先启动 Docker Desktop 并等待引擎启动完成；本机上 Desktop 未运行时，终端可能连 Compose 插件也无法发现。随后执行：

```sh
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker compose version
docker info --format '{{.ServerVersion}}'
```

## 启动和停止

在 `server/` 目录执行。先用 Maven Wrapper 在本机打包，再由 Compose 启动应用和数据库：

```sh
./mvnw -DskipTests package
docker compose up --build -d
docker compose ps
curl -i http://127.0.0.1:8080/actuator/health
```

数据库映射到本机 `127.0.0.1:5433`，应用映射到 `127.0.0.1:8080`。Compose 使用仅供本地开发的固定数据库凭据，PostgreSQL 数据保存在命名卷里。普通停止不会删除数据：

```sh
docker compose down
```

仅当明确要清空测试数据时才执行 `docker compose down -v`。

## 接口

### 创建

```sh
curl -i -X POST http://127.0.0.1:8080/api/snippets \
  -H 'Content-Type: application/json' \
  -d '{"title":"  Greeting  ","content":"Hello\nWorld"}'
```

返回 `201 Created` 与单个 Snippet。`title` 去除首尾空白后保存；`content` 保留原始排版：

```json
{
  "id": "a87da75f-31a2-45cc-a486-b87032875b77",
  "title": "Greeting",
  "content": "Hello\nWorld",
  "createdAt": "2026-10-29T15:00:00Z",
  "updatedAt": "2026-10-29T15:00:00Z"
}
```

ID 为 UUID，时间为 UTC ISO 8601。允许重复标题与内容。不带 `Idempotency-Key` 时保持原 03 行为，每次 POST 都可能新建记录。

Electron 首次上云会先在本地保存 UUID 请求标识及提交快照，再发送：

```sh
curl -i -X POST http://127.0.0.1:8080/api/snippets \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 00d797ff-1a57-4e22-a2e2-4d30d8e87296' \
  -d '{"title":"Greeting","content":"Hello\nWorld"}'
```

用相同 key 和内容重试返回原 `201` 响应；同一 key 携带不同内容返回 `409 IDEMPOTENCY_CONFLICT`。不同 key 可以创建标题和正文相同的独立记录。Flyway V2 的 `snippet_upload_attempts` 表持久保存 key、内容和原创建响应；重启 Java 后仍有效。

### 手动更新

```sh
curl -i -X POST http://127.0.0.1:8080/api/snippets/<后端UUID>/update \
  -H 'Content-Type: application/json' \
  -d '{"title":"Greeting","content":"Updated text"}'
```

返回 `200` 和同一后端记录。目标不存在返回 `404 NOT_FOUND`；重复提交相同标题与正文不刷新业务 `updatedAt`。桌面端仅在用户点击“更新到云端”时调用此接口，本地编辑和保存不会自动上传。

### 列表与搜索

```sh
curl -i 'http://127.0.0.1:8080/api/snippets'
curl -i 'http://127.0.0.1:8080/api/snippets?keyword=hello'
```

返回 `200 OK` 与数组。关键词搜索标题或内容，忽略大小写；省略或传空白关键词返回全部，无匹配返回 `[]`。按 `updatedAt` 倒序，时间相同时按 ID 倒序稳定排序。

### 错误与契约

空白标题、空白内容、过长标题或畸形 JSON 返回统一的 `400` 错误。例如：

```sh
curl -i -X POST http://127.0.0.1:8080/api/snippets \
  -H 'Content-Type: application/json' \
  -d '{"title":"   ","content":"hello"}'
```

```json
{
  "code": "INVALID_REQUEST",
  "message": "Invalid snippet",
  "fields": {"title": "must not be blank"},
  "timestamp": "2026-10-29T15:00:00Z"
}
```

字段错误消息可能随校验器版本变化，调用方应以 `code` 和字段名判断。OpenAPI JSON 位于 `http://127.0.0.1:8080/v3/api-docs`，Swagger UI 位于 `http://127.0.0.1:8080/swagger-ui.html`。

## 测试与排障

真实 PostgreSQL 集成测试由 Testcontainers 自动启动临时容器：

```sh
./mvnw test
```

若健康检查失败，先查看 `docker compose ps` 和 `docker compose logs app db`；若测试提示找不到 Docker daemon，先启动 Docker Desktop 并确认 `docker info` 可用。若端口 8080 或 5433 已占用，停止占用进程或在 `compose.yaml` 中调整左侧的本机端口。
