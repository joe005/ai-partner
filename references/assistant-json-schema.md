# assistant.json 字段规范

本文档详细描述灵基智能体配置文件 `assistant.json` 的完整字段规范。

## assistant.json

所有智能体配置集中存放在单一 `assistant.json` 文件中。

### 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 智能体唯一标识符，仅限小写字母、数字和连字符，需与目录名一致 |
| `displayName` | string | 是 | 智能体显示名称，支持中文 |
| `avatar` | string | 是 | 头像文件名（如 `avatar.png`），相对于智能体目录；初始化时由脚本自动分配（用户传入或从内置头像随机选择） |
| `description` | string | 是 | 智能体功能的简要描述 |
| `domain` | string | 是 | 领域标签，见下方枚举值 |
| `visibility` | string | 是 | 可见范围，见下方枚举值，默认 `public` |
| `role` | string | 是 | 角色设定的完整提示词文本，包括角色定位、工作职责、工作原则等，统一写在一个字段中 |
| `skills` | array | 是 | 已配置的技能列表，初始为空数组 `[]` |
| `knowledge` | array | 是 | 知识库文档列表，初始为空数组 `[]` |
| `version` | string | 是 | 当前版本号，语义化版本格式（如 `1.0.0`） |
| `createdAt` | string | 是 | 创建时间，ISO 8601 格式 |
| `updatedAt` | string | 是 | 最后更新时间，ISO 8601 格式 |

### domain 枚举值

| 值 | 说明 |
|----|------|
| `财务` | 财务相关场景（报销、发票、预算等） |
| `人力资源` | HR 相关场景（招聘、考勤、薪资等） |
| `销售` | 销售相关场景（客户管理、报价、订单等） |
| `供应链` | 供应链相关场景（采购、库存、物流等） |
| `行政` | 行政相关场景（办公管理、资产、会议等） |
| `法务` | 法务相关场景（合同审查、合规、知识产权等） |
| `IT` | IT 相关场景（开发、运维、安全等） |
| `通用` | 不属于特定领域的通用智能体（兜底默认值） |

### visibility 枚举值

| 值 | 说明 |
|----|------|
| `public` | 全员可见（默认值） |
| `private` | 仅自己可见 |

### skills 数组条目格式

```json
{
  "name": "invoice-reader",
  "source": "/path/to/local/skill 或 https://example.com/skill.zip",
  "sourceType": "local 或 remote",
  "copiedAt": "2026-04-18T10:00:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 技能名称，与 `skills/` 下的子目录名一致 |
| `source` | string | 技能来源（本地路径或远程 URL） |
| `sourceType` | string | 来源类型：`local`（本地复制）或 `remote`（远程下载） |
| `copiedAt` | string | 复制/下载时间，ISO 8601 格式 |

### knowledge 数组条目格式

```json
{
  "filename": "报销管理制度.md",
  "addedAt": "2026-04-18T10:00:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `filename` | string | 知识库文档文件名，与 `knowledge/` 下的文件名一致 |
| `addedAt` | string | 添加时间，ISO 8601 格式 |

### 完整示例

```json
{
  "name": "finance-reimbursement-consultant",
  "displayName": "财务报销顾问",
  "avatar": "avatar.png",
  "description": "智能财务报销顾问，支持发票识别、费用合规检查和报销流程指导",
  "domain": "财务",
  "visibility": "public",
  "role": "# 角色定位\n你是一位专业的财务报销顾问，帮助员工高效完成报销。\n\n# 工作职责\n- 协助员工填写报销单\n- 识别和验证发票信息\n- 检查费用是否符合公司报销政策\n- 提供报销流程指导\n\n# 工作原则\n- 严格遵守公司财务制度\n- 保护财务数据隐私\n- 遇到不确定的情况主动提示用户咨询财务部门",
  "skills": [
    {
      "name": "invoice-reader",
      "source": "/path/to/invoice-reader",
      "sourceType": "local",
      "copiedAt": "2026-04-18T10:00:00.000Z"
    }
  ],
  "knowledge": [
    {
      "filename": "公司报销管理制度.md",
      "addedAt": "2026-04-18T10:30:00.000Z"
    }
  ],
  "version": "1.0.0",
  "createdAt": "2026-04-18T09:00:00.000Z",
  "updatedAt": "2026-04-18T10:30:00.000Z"
}
```
