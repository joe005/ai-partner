#!/usr/bin/env node
/**
 * 灵基智能体初始化脚本
 *
 * 用法：
 *   node init-agent.js <agent-name> [options]
 *
 * 选项：
 *   --display-name "显示名称"
 *   --domain 财务|人力资源|销售|供应链|行政|法务|IT|通用
 *   --description "功能描述"
 *   --avatar <本地图片路径>
 *   --path <项目根目录>          默认为当前工作目录
 */

const fs = require('fs');
const path = require('path');

// ── 预置头像列表 ──
const DEFAULT_AVATARS = Array.from({ length: 12 }, (_, i) => `avatar-${String(i + 1).padStart(2, '0')}.png`);

// ── 有效领域列表 ──
const VALID_DOMAINS = ['财务', '人力资源', '销售', '供应链', '行政', '法务', 'IT', '通用'];

// ── 参数解析 ──
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { agentName: null, displayName: '', domain: '通用', description: '', avatar: '', projectPath: process.cwd() };

  if (args.length === 0 || args[0].startsWith('--')) {
    return null; // 缺少 agent-name
  }
  result.agentName = args[0];

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--display-name':
        result.displayName = args[++i] || '';
        break;
      case '--domain':
        result.domain = args[++i] || '通用';
        break;
      case '--description':
        result.description = args[++i] || '';
        break;
      case '--avatar':
        result.avatar = args[++i] || '';
        break;
      case '--path':
        result.projectPath = args[++i] || process.cwd();
        break;
    }
  }

  // displayName 默认取 agentName 的 Title Case
  if (!result.displayName) {
    result.displayName = result.agentName
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return result;
}

// ── 复制文件 ──
function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

// ── 随机获取默认头像路径（技能包内置） ──
function getRandomAvatarPath() {
  const avatarFile = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  return path.resolve(__dirname, '..', 'avatars', avatarFile);
}

// ── 生成角色设定 ──
function generateRole(displayName, domain, description) {
  const domainText = domain === '通用' ? '' : `${domain}领域`;
  return [
    `# 角色定位`,
    `你是一位专业的${domainText}助手「${displayName}」，${description}。`,
    ``,
    `# 工作职责`,
    `- [TODO: 填写具体职责]`,
    ``,
    `# 工作原则`,
    `- 严格遵守公司相关制度和规范`,
    `- 保护数据隐私和信息安全`,
    `- 遇到不确定的情况主动提示用户咨询相关部门`,
  ].join('\n');
}

// ── 主流程 ──
function main() {
  const opts = parseArgs(process.argv);

  if (!opts) {
    console.error('用法: node init-agent.js <agent-name> [--display-name "名称"] [--domain 领域] [--description "描述"] [--avatar <图片路径>] [--path <项目根目录>]');
    console.error('\n领域可选值: ' + VALID_DOMAINS.join(' | '));
    process.exit(1);
  }

  // 验证 agent-name 格式
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(opts.agentName) && !/^[a-z0-9]$/.test(opts.agentName)) {
    console.error(`错误: agent-name "${opts.agentName}" 格式无效（仅限小写字母、数字和连字符）`);
    process.exit(1);
  }

  // 验证领域
  if (!VALID_DOMAINS.includes(opts.domain)) {
    console.warn(`警告: 未知领域 "${opts.domain}"，将使用"通用"`);
    opts.domain = '通用';
  }

  const agentDir = path.resolve(opts.projectPath, 'ai-partners', opts.agentName);

  // 防止重复创建
  if (fs.existsSync(agentDir)) {
    console.error(`错误: 智能体目录已存在: ${agentDir}`);
    process.exit(1);
  }

  // 创建目录结构
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(path.join(agentDir, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(agentDir, 'knowledge'), { recursive: true });
  console.log(`✅ 创建智能体目录: ${agentDir}`);

  // 处理头像
  let avatarFilename = '';
  if (opts.avatar) {
    // 用户提供了自定义头像
    const avatarSrc = path.resolve(opts.avatar);
    if (!fs.existsSync(avatarSrc)) {
      console.error(`错误: 头像文件不存在: ${avatarSrc}`);
      process.exit(1);
    }
    avatarFilename = 'avatar.png';
    copyFile(avatarSrc, path.join(agentDir, avatarFilename));
    console.log(`✅ 复制自定义头像: ${avatarFilename}`);
  } else {
    // 使用随机默认头像
    const defaultAvatar = getRandomAvatarPath();
    if (fs.existsSync(defaultAvatar)) {
      avatarFilename = `avatar.png`;
      copyFile(defaultAvatar, path.join(agentDir, avatarFilename));
      console.log(`✅ 分配默认头像: ${path.basename(defaultAvatar)}`);
    } else {
      console.warn(`警告: 默认头像不存在，跳过头像设置`);
    }
  }

  // 生成角色设定
  const descriptionText = opts.description || `[TODO: 填写${opts.displayName}的功能描述]`;
  const roleText = generateRole(opts.displayName, opts.domain, descriptionText);

  // 生成 assistant.json
  const now = new Date().toISOString();
  const agentJson = {
    type: 'assistant',
    id: opts.agentName,
    name: opts.agentName,
    displayName: opts.displayName,
    avatar: avatarFilename,
    description: descriptionText,
    domain: opts.domain,
    visibility: 'public',
    role: roleText,
    skills: [],
    knowledge: [],
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
  };

  const agentJsonPath = path.join(agentDir, 'assistant.json');
  fs.writeFileSync(agentJsonPath, JSON.stringify(agentJson, null, 2) + '\n', 'utf-8');
  console.log('✅ 生成 assistant.json');

  // 生成 agent.md
  const agentMdContent = `---\ndescription: ${agentJson.description}\n---\n\n${agentJson.role}\n`;
  const agentMdPath = path.join(agentDir, 'agent.md');
  fs.writeFileSync(agentMdPath, agentMdContent, 'utf-8');
  console.log('✅ 生成 agent.md');

  // 完成
  console.log(`\n✅ 智能体 "${opts.displayName}" 初始化成功！`);
  console.log(`   位置: ${agentDir}`);
  console.log('\n后续步骤:');
  console.log('  1. 编辑 assistant.json 完善角色设定 (role) 和功能描述 (description)');
  console.log('  2. 使用 add-skill.js 添加技能');
  console.log('  3. 将知识库文档放入 knowledge/ 目录');
}

main();
