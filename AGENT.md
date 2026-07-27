# Agent 协作规范

## 语言约定

- 与用户交流时，默认使用中文，除非用户明确要求使用其他语言。
- 写入项目内的 spec、PRD、需求说明、实施计划、验收标准、决策记录等面向本项目协作的文档时，默认使用中文表述。
- 即使外部 skill、模板或流程说明使用英文，只要用户没有明确要求英文输出，落到仓库文件中的 spec 类内容也应转写为中文。
- 保留必要的英文技术名词、命令、包名、API 名称、文件扩展名和专有名词，例如 `Electron`、`clipboard.readText()`、`npm run build`、`.dmg`。
- 如果用户明确要求中英双语、英文原文、或某个工具/平台要求英文格式，则按用户或平台要求执行，并在交付说明中点明原因。

## Spec 写入约定

- 新建或更新 spec 时，先明确它记录的是“目的与约束”“技术方案”“实施计划”还是“验收标准”，不要在技术选型不确定时强行写成最终方案。
- 技术选型尚未确定时，可以在 spec 中记录目标、边界、已知事实、待验证问题、候选方向和非本次范围。
- 对于范围判断，优先把当前 MVP 必需的兼容性验证放入当前 spec；明显超出当前目标的高级能力或分发能力应拆到后续 spec。
- 写入前如果已经有足够上下文，直接综合现有对话和代码库事实；不要为了形式感重复追问。
- 写入后读回关键文件，确认语言、范围和结构符合用户最新要求。

## Agent skills

### Issue tracker

Spec 存放在 `specs/`；实施 ticket 使用 `.scratch/<feature>/issues/` 下的本地 Markdown 文件。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用默认的本地 triage 标签词汇。详见 `docs/agents/triage-labels.md`。

### Domain docs

本仓库是单上下文项目；工程工作前应读取根 `CONTEXT.md` 和相关的 `docs/adr/` 决策记录。详见 `docs/agents/domain.md`。
