# 03 Java 后端与 Snippets API 立项需求（草案）

状态：已实施，macOS 本地验收通过。范围与证据见本需求及 `.scratch/03-java-snippets-backend/issues/` 的 00–05 任务记录；Windows 与 Electron 后端接入仍后置。

## 背景与现状

ClipFlow 已实现离线 Snippets 的加载、搜索、新增、编辑、删除、复制与本地持久化，相关代码和自动化测试已提交；桌面端手动验收结果记录在本地 tracker 的 00 任务中。立项时项目没有 Java 服务。本机已确认具备 JDK 21 和 Docker Desktop 内置 Compose；服务实施使用 Maven Wrapper，不要求全局 `mvn`。

此前已确定 Java 学习副线以 ClipFlow 的 Snippets 为真实业务场景：先掌握服务启动、HTTP 契约、PostgreSQL、迁移与集成测试，再讨论桌面端接入。离线 Snippets 数据是测试数据，后续不要求迁移。

## 立项目标

在当前仓库建立可本地运行、可测试、可复现的 Java 后端。第一条业务链路是创建 Snippet，并从 PostgreSQL 中查询回来；它应能独立通过 HTTP 调用验收。

本阶段的完成标志是：开发者按仓库说明启动服务和数据库，调用创建与查询接口得到持久化结果，重启服务后仍能查到数据，自动化集成测试通过。

## 用户与场景

1. 作为开发者，我希望在 macOS 上按项目说明启动 Java 服务和 PostgreSQL，以便复现后端环境。
2. 作为开发者，我希望能确认服务健康状态，以便区分服务启动问题与业务接口问题。
3. 作为 API 调用方，我希望提交标题和内容创建 Snippet，以便保存可复用文本。
4. 作为 API 调用方，我希望查询 Snippet 列表并按关键词搜索标题或内容，以便找回已保存的文本。
5. 作为 API 调用方，我希望无效输入得到明确错误，以便知道如何修正请求。
6. 作为开发者，我希望表结构由版本化迁移管理、接口有可阅读契约、关键行为有真实数据库测试，以便安全修改与跨设备复现。

## 本阶段需求

### 运行与数据

- Java 服务源码放在当前仓库的 `server/`，使用 Spring Boot，并通过 Docker Compose 与 PostgreSQL 在本地可重复启动；仓库提供明确的环境准备、启动、停止和故障排查说明。
- Java 服务使用 Maven 构建。可以采用 Maven Wrapper，使项目运行不依赖全局安装的 `mvn`。
- 数据库表结构由 Flyway 迁移创建和演进；应用重启不清空 Snippet 数据。
- 配置通过环境变量或开发配置提供；仓库不提交真实密钥与个人数据。
- 开发服务与数据库仅绑定本机地址；本阶段没有鉴权，不对局域网或公网开放端口。
- 服务提供健康检查，能清楚表明服务是否可用。

### Snippets API

- `POST /api/snippets`：接收 `title` 与 `content`，创建后返回 `id`、`title`、`content`、`createdAt`、`updatedAt`。
- `GET /api/snippets`：返回 Snippet 列表；可选 `keyword` 按标题或内容进行不区分大小写的搜索。无关键词时返回全部记录，无匹配时返回空列表。
- 标题和内容去除首尾空白后不能为空；无效请求返回可理解的 `4xx` 错误，且不写入数据库。允许重复标题与内容。
- 查询结果按 `updatedAt` 倒序排列；新建记录有稳定的 ID 和创建、更新时间。
- API 契约由 OpenAPI 生成，并在仓库中提供人可读的请求、响应和错误示例。

### 验证

- 自动化集成测试连接 PostgreSQL，覆盖创建、列表、关键词搜索、空结果、非法输入及重启或重新读取后的持久化结果。
- 构建和测试命令可由一名新开发者仅依据仓库说明执行成功。
- 手工验收使用 HTTP 客户端或 `curl` 完成，不以 Electron 界面作为本阶段的必需入口。

## 交付物与验收标准

- 当前仓库包含 Java 服务源码、Maven 构建配置、数据库启动配置、Flyway 迁移和运行说明。
- 在本机可启动服务及 PostgreSQL，并成功获取健康检查结果。
- 创建一个 Snippet 后，列表查询和关键词查询均可找回它；服务重启后结果仍在。
- 对空白标题或内容的创建请求返回明确错误，数据库中没有新增记录。
- OpenAPI 文档可访问；真实 PostgreSQL 集成测试全部通过。
- 记录实际验证的操作系统与命令；Windows 可复现性作为后续验证项，不把未经验证的跨平台承诺写成已完成。

## 边界

- 本阶段不替换 Electron 离线 Snippets 的数据来源，不移除现有本地功能。
- 暂不实现编辑、删除、分页、登录、用户归属、云端部署、本地数据迁移、离线同步或冲突处理。
- 暂不接入 RAG 或 Agent；它们属于后续独立需求。
- 桌面端接入后端前，需要另行确定模式切换与完整 CRUD 的处理，确保现有编辑和删除操作不会失效。

## 前置事项与风险

- 离线 Snippets 的桌面端手动验收与 Java 环境准备可以并行；在讨论桌面端切换数据源前，应先记录该验收结果。
- 确认本机可运行 Docker Compose；仅有 Docker CLI 不等于数据库容器可运行。
- Spring Boot、SpringDoc、PostgreSQL 与测试依赖的具体版本在实施时按兼容性选定并锁定，不在立项需求中提前固定。
- HTTP 时间格式与时区、错误响应结构在 API 契约编写时确定；不得依赖 Electron 本地时间字符串的隐式约定。

## 后续阶段入口

本阶段验收后，再决定是否扩展后端完整 CRUD 并让桌面端接入。届时应单独定义“本地离线数据”和“后端数据”的使用模式；现阶段仅确认本地测试数据无需迁移。

## 技术参考

- [Spring Boot 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)
- [Spring Boot 数据库迁移说明](https://docs.spring.io/spring-boot/how-to/data-initialization.html)
- [Spring Boot 测试说明](https://docs.spring.io/spring-boot/reference/testing/)
- [Docker Compose 安装说明](https://docs.docker.com/compose/install/)
