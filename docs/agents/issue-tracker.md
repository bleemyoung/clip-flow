# Issue tracker：本地 Markdown

本仓库使用本地 Markdown 管理 spec 和实施 ticket，不要求 GitHub Issues。

## 约定

- 一个功能对应一个 spec：`specs/<NN>-<feature>/spec.md`
- 一个功能的实施 ticket 放在 `.scratch/<feature>/issues/`
- 每张 ticket 使用一个文件：`.scratch/<feature>/issues/<NN>-<slug>.md`，从 `01` 开始编号
- ticket 顶部使用 `Status:` 记录 triage 状态，具体词汇见 `triage-labels.md`
- 协作评论和过程补充写在文件末尾的 `## Comments` 下

## 工程技能使用方式

当工程技能要求“发布 spec”时，创建或更新 `specs/<NN>-<feature>/spec.md`。

当工程技能要求“创建、读取或更新 issue/ticket”时，使用对应 `.scratch/<feature>/issues/` 下的单个 Markdown 文件。

## Wayfinder 约定

`/wayfinder` 使用 `.scratch/<effort>/map.md` 记录决策地图，并在 `.scratch/<effort>/issues/` 中为每个决策创建一个 ticket。

- 决策 ticket 顶部包含 `Type:`、`Status:` 与 `Blocked by:`。
- 所有阻塞 ticket 处于 `resolved` 后，ticket 才可执行。
- 处理 ticket 前写入 `Status: claimed`；结论写入 `## Answer` 后更新为 `Status: resolved`。
