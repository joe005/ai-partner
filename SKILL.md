---
name: ai-partner-creator
description: 创建和编辑灵基智能体时务必调用此技能。本技能提供创建、编辑和管理灵基智能体的完整流程指导，包括初始化智能体、修改智能体配置、配置技能、添加知识库，以及查看智能体清单。适用于用户需要创建新的灵基智能体、编辑已有智能体（修改名称/角色设定/头像/技能/知识库）、管理智能体配置、或查看智能体列表时。
version: 1.0.0
updated: 2026-05-06
---
# 灵基智能体创建器

本技能提供创建和管理灵基智能体的完整流程。

## 关于灵基智能体

灵基智能体是面向企业场景的专业化智能助手。每个智能体具备：

1. **角色设定** — 完整的提示词文本，定义智能体的角色定位、工作职责和工作原则
2. **技能配置** — 可组合的技能模块（如发票识别、合规检查等），从本地或远程复制到智能体目录
3. **知识库** — 业务相关文档（如公司制度、操作规范等），为智能体提供专业知识支撑
4. **领域标签** — 财务 / 人力资源 / 销售 / 供应链 / 行政 / 法务 / IT / 通用

## 智能体目录结构

每个智能体存放在项目根目录的 `ai-partners/<agent-name>/` 下，结构扁平，所有配置集中在 `assistant.json` 中：

```
<project-root>/
└── ai-partners/
    └── <agent-name>/
        ├── assistant.json            # 智能体全部配置
        ├── agent.md                  # 角色设定
        ├── avatar.png                # 头像文件
        ├── skills/
        │   └── <skill-name>/         # 技能目录
        └── knowledge/
            └── (知识库文档)
```

`assistant.json` 包含所有配置信息：基础信息、角色设定、技能清单、知识库和版本号。详细字段规范参见 `references/assistant-json-schema.md`。

## 智能体创建流程

### 第 1 步：需求收集

在创建智能体之前，明确以下信息。需求收集阶段**必须使用 `ask_user_question` 工具**与用户进行结构化交互，避免纯文本来回问答；仅在用户已在首次消息中明确给出功能描述时才可跳过首问。

**使用 `ask_user_question` 的规范：**

- 每次调用最多包含 4 个问题，优先合并可并行询问的内容（例如「领域标签确认 + 头像偏好 + 是否添加知识库」）
- 每个选项必须包含 `label`（1-5 个词）与 `description`（说明该选项含义或影响）
- 推荐选项放在首位并在 label 末尾标注「(推荐)」
- 互斥选项使用单选；可同时启用的选项（如多个知识库类别、多个候选技能）使用 `multiSelect: true`
- 系统自动提供「Other」，无需手动添加；用户始终可自由补充
- 已由 AI 自动推断且置信度高的字段（如显示名称、标识符），不重复询问

**典型询问场景：**

1. 功能描述不清晰时，提供 2-4 个典型方向供用户确认
2. 领域标签自动匹配结果有歧义时，让用户在候选领域中选择
3. 匹配技能候选列表的确认（见下文「技能推荐」步骤，使用 `multiSelect: true`）

**基础信息（必须）：**

- 领域标签：AI 根据角色设定和功能描述自动匹配以下选项之一 — 财务 / 人力资源 / 销售 / 供应链 / 行政 / 法务 / IT / 通用
- 功能描述

> **名称自动生成：** AI 根据用户描述自动生成显示名称和英文标识符。生成规则：
>
> - 显示名称：简洁中文，不超过 12 个字
> - 标识符：小写英文 + 连字符，2–4 个单词，采用角色导向命名（用 `consultant/expert/manager/advisor/specialist` 等职称）
>
> **示例：**
>
> | 用户描述     | 显示名称     | 标识符                               |
> | ------------ | ------------ | ------------------------------------ |
> | 帮我处理报销 | 财务报销顾问 | `finance-reimbursement-consultant` |
> | 销售流程优化 | 销售流程专家 | `sales-consultant`                 |
> | 设计系统管理 | 设计系统专家 | `visual-design-expert`             |
> | 合同审查     | 合同审查顾问 | `legal-contract-advisor`           |
> | 运维监控     | 运维专家     | `operations-expert`                |

**角色设定（由 AI 自动生成）：**

- 角色定位 — 智能体扮演什么角色
- 工作职责 — 具体负责哪些任务
- 工作原则 — 遵循什么原则和约束

AI 根据用户的功能描述自动生成角色设定，统一写入 `assistant.json` 的 `role` 字段（单一文本字段）。用户可在创建完成后查看并手动修改。

**可选信息（用户未提供则跳过）：**

- 需要上传哪些知识库文档
- 头像图片（不提供则随机分配预置头像）

**技能推荐（AI 自动推断 + 用户确认）：**

AI 根据用户的功能描述自动推断该智能体可能需要的技能，扫描当前工作目录下 `.opencode/skills/dev/` 的**所有子目录**（每个子目录即一个技能），读取每个技能的 `SKILL.md` 中的 `name` 与 `description`，按用户需求自动匹配。

> 注意：技能列表完全来自该目录下的实际内容，**不硬编码任何技能名**。

1. **AI 自动扫描与匹配：**

   AI 直接执行以下步骤：

   1. 列出**当前工作目录**（即用户执行命令时所在的项目根目录）下 `.opencode/skills/dev/` 的所有子目录（每个子目录即一个技能）
   2. 读取每个子目录下的 `SKILL.md`，提取 YAML frontmatter 中的 `name` 与 `description`
   3. 按用户需求语义匹配 `name` / `description`，筛选候选技能
   4. 如该目录不存在或为空，直接跳过本步骤

   > 技能列表完全来自该目录下的实际内容。不要扫描 `~/.opencode/skills/dev/`（用户主目录），始终以**当前工作目录**为准。
   >
2. **向用户确认：** 将扫描到的技能通过 `ask_user_question` 工具（`multiSelect: true`）展示给用户，询问是否添加。列出的技能来自**当前工作目录**下 `.opencode/skills/dev/` 的实际子目录，**不是预定义的技能名**。每个候选技能作为一个选项，`label` 为技能名、`description` 为 SKILL.md 中的 `description`。示例（假设目录下有 若干 技能子目录）：

   > 根据用户描述，从**当前工作目录**下 `.opencode/skills/dev/` 匹配到以下技能，请选择要添加的：
   >
   > - `<skill-a>` — <SKILL.md 中的 description>
   > - `<skill-b>` — <SKILL.md 中的 description>
   >
3. **记录确认结果：** 用户确认要添加的技能路径列表，作为 `--skill` 参数在初始化时传入。

如**当前工作目录**下 `.opencode/skills/dev/` 目录为空、无可匹配技能，或用户不需要添加，直接跳过此步骤，无需询问。

### 第 2 步：初始化智能体

使用初始化脚本创建智能体目录和基础配置文件。

> **脚本路径说明：** 以下示例中 `scripts/` 指本技能包内的脚本目录。全局安装时实际路径为 `~/.qoder/skills/ai-partner-creator/scripts/`，项目安装时为 `.qoder/skills/ai-partner-creator/scripts/`。执行时请使用实际路径。

```bash
node scripts/init-agent.js <agent-name> [options]
```

> **参数由 AI 自动生成：** 根据第 1 步收集的信息，AI 自动生成标识符、显示名称、领域标签和功能描述，用户无需手动填写。

**参数说明：**

| 参数                      | 说明                                                          |
| ------------------------- | ------------------------------------------------------------- |
| `<agent-name>`          | 智能体标识符（必填，AI 自动生成），仅限小写字母、数字和连字符 |
| `--display-name "名称"` | 智能体显示名称（必填，AI 自动生成）                           |
| `--domain 领域`         | 领域标签（AI 自动匹配）                                       |
| `--description "描述"`  | 功能描述（AI 自动生成）                                       |
| `--avatar <图片路径>`   | 自定义头像文件路径（默认：随机分配内置头像）                  |
| `--skill <路径或URL>`   | 预配置技能，可多次使用，初始化时自动添加（可选）              |
| `--path <项目根目录>`   | 项目路径（默认：当前工作目录）                                |

**头像处理规则：**

- 提供 `--avatar`：将图片复制到智能体目录，统一命名为 `avatar.png`
- 未提供 `--avatar`：从内置 15 张预置头像中随机选择一张，复制为 `avatar.png`

**示例：**

```bash
# 用户说「帮我处理报销」，AI 自动生成全部参数
# AI 扫描**当前工作目录**下的 .opencode/skills/dev/（注意：不是 ~/.opencode/skills/dev/），将匹配到的技能交用户确认后加入 --skill 参数
node scripts/init-agent.js finance-reimbursement-consultant \
  --display-name "财务报销顾问" \
  --domain 财务 \
  --description "智能财务报销顾问，支持发票识别和费用合规检查" \
  --skill ./.opencode/skills/dev/<用户确认的技能名>
```

脚本执行后将：

1. 创建 `ai-partners/finance-reimbursement-consultant/` 目录及子目录
2. 生成 `assistant.json`（自动包含 `type: "assistant"` 和 `id` 字段，以及 TODO 占位符）
3. 生成 `agent.md`（从 `assistant.json` 的 `description` 和 `role` 字段自动生成）
4. 复制头像文件
5. 自动添加用户确认的 `--skill` 技能到 `skills/` 目录并更新 `assistant.json`

### 第 3 步：编辑智能体配置

初始化后，编辑 `assistant.json` 完善以下内容：

> **重要：** 编辑时**不要删除或修改** `type`、`id`、`name`、`createdAt` 等脚本自动生成的字段。

1. **`role` 字段** — 填写完整的角色设定提示词。这是智能体最核心的配置，决定了智能体的行为和能力边界。所有角色相关内容（定位、职责、原则）统一写在这一个文本字段中。
2. **`description` 字段** — 由 AI 自动生成，用户可在创建完成后手动修改。

**role 字段编写建议：**

```
# 角色定位
你是一位专业的财务报销顾问，作为企业财务报销流程的智能助手。

# 工作职责
- 协助员工填写报销单
- 识别和验证发票信息
- 检查费用是否符合公司报销政策
- 提供报销流程指导

# 工作原则
- 严格遵守公司财务制度
- 保护财务数据隐私
- 遇到不确定的情况主动提示用户咨询财务部门
```

### 第 4 步：配置技能

如果在初始化时已通过 `--skill` 添加技能，此步骤可跳过。如需补充更多技能，使用 `add-skill.js`：

> **本地技能目录：** **当前工作目录**下的 `.opencode/skills/dev/`（即用户执行命令时所在的项目根目录下的该子路径，非用户主目录），AI 直接扫描匹配。

```bash
node scripts/add-skill.js <agent-name> --source <来源> [--path <项目根目录>]
```

**本地技能：**

```bash
# 从本地技能目录添加（<skill-name> 为**当前工作目录**下 .opencode/skills/dev/ 的实际技能目录名）
node scripts/add-skill.js <agent-name> --source ./.opencode/skills/dev/<skill-name>
```

**自动匹配（初始化时）：**

```bash
# AI 扫描**当前工作目录**下的 .opencode/skills/dev/ 中的所有技能并按需求自动匹配。
# 经用户确认后，每一个被选中的技能都以 --skill 参数传入（可多次）
node scripts/init-agent.js <agent-name> \
  --display-name "..." --domain ... --description "..." \
  --skill ./.opencode/skills/dev/<skill-1> \
  --skill ./.opencode/skills/dev/<skill-2>
```

**远程技能（支持 .zip / .tar.gz）：**

```bash
# 从 GitHub Release 下载
node scripts/add-skill.js finance-reimbursement-consultant --source https://github.com/<owner>/<repo>/releases/download/v1.0/invoice-reader.zip

# 从 GitHub 仓库 archive 下载
node scripts/add-skill.js finance-reimbursement-consultant --source https://github.com/<owner>/invoice-reader/archive/refs/heads/main.zip
```

脚本执行后将：

1. 将技能完整复制到 `skills/<skill-name>/` 目录
2. 在 `assistant.json` 的 `skills` 数组中追加条目（含名称 `name`、来源 `source`、来源类型 `sourceType`、复制时间 `copiedAt`）

无论本地还是远程技能，都会完整复制到智能体目录下，保证智能体自包含、不依赖外部路径。

### 第 5 步：添加知识库

将知识库文档复制到智能体的 `knowledge/` 目录，并更新 `assistant.json` 的 `knowledge` 数组。

> 支持格式：`.md`、`.txt`，单文件最大 50MB。

1. 将文档文件复制到 `ai-partners/<agent-name>/knowledge/` 目录
2. 在 `assistant.json` 的 `knowledge` 数组中添加条目：

```json
{
  "filename": "公司报销管理制度.md",
  "addedAt": "2026-04-18T10:30:00.000Z"
}
```

### 第 6 步：验证与迭代

创建、编辑完成后，逐项验证智能体目录，任一项不通过必须修复后重验：

1. **JSON 可解析**：`assistant.json` 能被 `JSON.parse` 正确解析（语法合法、编码 UTF-8 无 BOM、换行符统一）
2. **必填字段齐全**：`name` / `role` / `avatar` / `version` / `createdAt` / `updatedAt` 均存在且非空；`name` 为 kebab-case 且与目录名严格一致
3. **引用资源真实存在**（配置声明的文件磁盘上必须有）：`avatar` 头像文件、`skills[].id` 对应的 `skills/<id>/SKILL.md`、`knowledge[]` 对应的 `knowledge/<file>` 均在磁盘上可读
4. **无孤儿资源**（磁盘上有的文件配置中必须有）：`skills/` 与 `knowledge/` 目录下不存在未在 `assistant.json` 中声明的子目录或文件
5. **派生产物同步**：`agent.md` 内容与 `assistant.json.role` 一致；本次变更已刷新 `updatedAt` 为当前时间
6. **智能体可见**：运行 `list-agents.js`，该智能体出现在清单中

根据实际使用效果迭代优化角色设定和技能配置。每次修改 `assistant.json` 后，`updatedAt` 字段应自动更新，同时 `agent.md` 应同步重新生成。

### 第 7 步：输出结果

所有步骤完成后，**必须**输出以下渲染指令，用于展示已创建的灵基智能体卡片。其中 `id` 为智能体的唯一识别标识（即 `assistant.json` 中的 `name` 字段值）：

:::render:ai-partner {
  "id": "${agent-name}",
  "title": "灵基智能体"
}:::

**示例：** 如果创建的智能体 name 为 `finance-reimbursement-consultant`，则输出：

:::render:ai-partner {
  "id": "finance-reimbursement-consultant",
  "title": "灵基智能体"
}:::

此渲染指令用于在界面中生成智能体的可视化卡片，是创建流程的最终交付物，不可省略。

**渲染指令唯一性与位置约束（强制）：**

- 整次回复中 `:::render:ai-partner` **只允许出现一次**，且必须位于整条回复的**最末尾**
- **禁止**在以下中间节点提前触发渲染：
  - `init-agent.js` 初始化完成时
  - 「智能体已初始化，现在编辑角色设定」等过渡提示之后
  - `add-skill.js` 单个技能添加完成时
  - `agent.md` 同步更新完成但总结尚未输出时
  - 任何「阶段性完成」节点
- 中间节点如需向用户汇报进度，**仅使用纯文字**描述（如「智能体骨架已生成」「技能已追加」），严禁调用 `:::render:ai-partner`
- 全流程结束标志 = `assistant.json` 已写入 + `agent.md` 已同步 + 领域/技能清单总结已输出，三者齐备后才可渲染卡片
- 若发现自己在中间节点想要渲染卡片，说明流程未真正结束，需先补齐剩余步骤再统一在末尾渲染

### 回复内容规范

创建与编辑流程的全部回复（进度提示、确认信息、最终总结）**禁止出现任何 emoji**。

## 存取规则

### 头像

- 用户提供本地图片路径 → `init-agent.js` 复制到智能体根目录（如 `avatar.png`）
- 未提供头像 → 从内置 `assets/avatars/` 15 张预置头像中随机选择并复制（如 `avatar.png`）
- `assistant.json` 中 `avatar` 字段记录文件名（非完整路径）
- 后续可直接替换文件并更新 `avatar` 字段

### 技能

- **自动添加：** `init-agent.js` 支持 `--skill` 参数（可多次使用），初始化时自动调用 `add-skill.js` 完成添加
- **手动添加：** `add-skill.js <agent-name> --source <路径或URL>` 递归复制/下载到 `skills/<name>/`
- **发现技能：** AI 直接读取**当前工作目录**下 `.opencode/skills/dev/` 中每个子目录的 `SKILL.md`，按 `name` / `description` 语义匹配（不扫描用户主目录 `~/.opencode/`）
- `assistant.json` 的 `skills` 数组追加条目，记录来源和复制时间
- 删除技能：手动删除 `skills/<name>/` 目录并从 `assistant.json` 的 `skills` 数组中移除

### 知识库

- 支持格式：`.md`、`.txt`，单文件最大 50MB
- 文档复制到 `knowledge/` 目录
- `assistant.json` 的 `knowledge` 数组追加条目
- 删除知识：手动删除文件并从数组中移除

### 角色设定文档

- `agent.md` 由 `init-agent.js` 自动生成，内容取自 `assistant.json` 的 `description` 和 `role` 字段
- 修改 `assistant.json` 的 `description` 或 `role` 后，需同步重新生成 `agent.md`

### 版本

- 每次修改 `assistant.json` 时更新 `updatedAt` 为当前时间
- `version` 字段记录当前语义化版本号，按需手动递增

## 清单管理

使用 `list-agents.js` 查看所有已创建的智能体：

```bash
# 列出当前项目的所有智能体
node scripts/list-agents.js

# JSON 格式输出
node scripts/list-agents.js --format json

# 按领域过滤
node scripts/list-agents.js --domain 财务

# 查看远程智能体清单
node scripts/list-agents.js --remote https://example.com/agents.json

# 指定项目路径
node scripts/list-agents.js --path /path/to/project
```

## 完整示例：创建「财务报销顾问」

以下演示端到端创建一个财务报销顾问：

```bash
# 1. AI 扫描本地技能目录：
#    读取**当前工作目录**下 .opencode/skills/dev/ 中每个子目录的 SKILL.md，按需求匹配候选技能
#    （注意：当前工作目录 = 用户执行命令时所在的项目根，不是 ~/.opencode）

# 2. 初始化智能体（带上用户确认后的技能，技能名来自实际目录下的子目录，不硬编码）
node scripts/init-agent.js finance-reimbursement-consultant \
  --display-name "财务报销顾问" \
  --domain 财务 \
  --description "智能财务报销顾问，支持发票识别、费用合规检查和报销流程指导" \
  --skill ./.opencode/skills/dev/<用户确认的技能名>

# 3. 查看智能体清单
node scripts/list-agents.js
```

初始化后编辑 `ai-partners/finance-reimbursement-consultant/assistant.json`，完善 `role` 字段：

```json
{
  "role": "# 角色定位\n你是一位专业的财务报销顾问，帮助员工高效完成报销。\n\n# 工作职责\n- 协助员工填写报销单，自动识别发票信息\n- 检查费用是否符合公司报销政策\n- 检测重复报销和异常金额\n- 提供报销进度查询和流程指导\n\n# 工作原则\n- 严格遵守公司《报销管理制度》\n- 保护所有财务数据隐私\n- 对不确定的费用标准主动提示咨询财务部门\n- 所有金额计算务必准确，不做近似处理"
}
```

将知识库文档复制到智能体目录：

```bash
cp /path/to/公司报销管理制度.md ai-partners/finance-reimbursement-consultant/knowledge/
```

并在 `assistant.json` 的 `knowledge` 数组中添加条目。

## 资源参考

- `references/assistant-json-schema.md` — assistant.json 完整字段规范
- `assets/avatars/` — 15 张预置头像（PNG 格式，avatar-01.png ~ avatar-15.png）
- `scripts/init-agent.js` — 初始化智能体
- `scripts/add-skill.js` — 添加技能（本地 / 远程）
- `scripts/list-agents.js` — 查看智能体清单
- `./.opencode/skills/dev/` — **当前工作目录**下的本地技能根目录（AI 自动扫描匹配，非用户主目录）

## 更新日志

| 版本 | 日期       | 类型  | 变更内容         |
| :---: | ---------- | ----- | ---------------- |
| 1.0.0 | 2026-05-06 | MINOR | 建立版本管理机制 |
