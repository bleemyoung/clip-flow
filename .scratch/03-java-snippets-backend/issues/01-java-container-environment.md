# 01 — 准备 Java 容器环境

**构建内容：** 使本机具备可验证的 Java、Docker 引擎与 Compose 运行条件；项目后续使用 Maven Wrapper。

**阻塞关系：** 无。

**Status:** done

- [x] 确认 JDK 21 可用。
- [x] 启动 Docker Desktop，确认 Docker 引擎和 Compose 可用。
- [x] 记录本机命令与结果，不要求全局安装 Maven。

**环境记录（2026-10-29，macOS 15.0 arm64）：** `./mvnw -v` 显示 Maven 3.10.0、Java 21.0.12；`/Applications/Docker.app/Contents/Resources/bin/docker info --format '{{.ServerVersion}}'` 显示 Docker Engine 29.6.2；同目录的 `docker compose version` 显示 v5.3.1。全局 `mvn` 和 Homebrew `docker compose` 均非必需，README 说明了 Docker Desktop 内置 CLI 的 PATH 配置。
