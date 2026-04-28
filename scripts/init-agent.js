#!/usr/bin/env node
/**
 * AI 搭档初始化脚本
 *
 * 用法：
 *   node init-agent.js <agent-name> [options]
 *
 * 选项：
 *   --display-name "显示名称"
 *   --domain 财务|人力资源|销售|供应链|行政|法务|IT|通用
 *   --description "功能描述"
 *   --avatar <本地图片路径>
 *   --skill <技能路径或URL>      可多次使用，初始化时自动添加技能
 *   --path <项目根目录>          默认为当前工作目录
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 有效领域列表 ──
const VALID_DOMAINS = ['财务', '人力资源', '销售', '供应链', '行政', '法务', 'IT', '通用'];

// ── 头像文件名匹配规则 ──
const AVATAR_FILENAME_PATTERN = /^avatar-\d{2}\.png$/;

// ── 参数解析 ──
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { agentName: null, displayName: '', domain: '通用', description: '', avatar: '', projectPath: process.cwd(), skills: [] };

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
      case '--skill':
        result.skills.push(args[++i] || '');
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

// ── 解析路径（相对路径基于 baseDir，绝对路径直接规范化） ──
function resolvePath(baseDir, inputPath) {
  if (!inputPath) return '';
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }
  return path.resolve(baseDir, inputPath);
}

// ── 复制文件 ──
function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

// ── 扫描并获取可用的内置头像 ──
function getRandomAvatarPath() {
  const avatarsDir = path.resolve(__dirname, '..', 'assets', 'avatars');

  // 验证目录存在
  if (!fs.existsSync(avatarsDir)) {
    throw new Error(`内置头像目录不存在: ${avatarsDir}`);
  }

  // 读取目录内容（失败时抛出可读的异常）
  let files;
  try {
    files = fs.readdirSync(avatarsDir);
  } catch (err) {
    throw new Error(`无法读取头像目录: ${err.message}`);
  }

  // 严格过滤：只接受 avatar-NN.png 格式，且必须是真实文件
  const validAvatars = files
    .filter(filename => AVATAR_FILENAME_PATTERN.test(filename))
    .map(filename => path.join(avatarsDir, filename))
    .filter(filePath => {
      try {
        return fs.statSync(filePath).isFile();
      } catch {
        return false; // 忽略无法访问的文件
      }
    });

  if (validAvatars.length === 0) {
    throw new Error('未找到合法的内置头像文件（预期格式: avatar-NN.png）');
  }

  return validAvatars[Math.floor(Math.random() * validAvatars.length)];
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
    console.error('用法: node init-agent.js <agent-name> [--display-name "名称"] [--domain 领域] [--description "描述"] [--avatar <图片路径>] [--skill <技能路径或URL>] [--path <项目根目录>]');
    console.error('\n领域可选值: ' + VALID_DOMAINS.join(' | '));
    console.error('\n可多次使用 --skill 添加多个技能');
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

  const projectPath = path.resolve(opts.projectPath);
  const agentDir = path.resolve(projectPath, 'ai-partners', opts.agentName);

  // 防止重复创建
  if (fs.existsSync(agentDir)) {
    console.error(`错误: 搭档目录已存在: ${agentDir}`);
    process.exit(1);
  }

  // 创建目录结构
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(path.resolve(agentDir, 'skills'), { recursive: true });
  fs.mkdirSync(path.resolve(agentDir, 'knowledge'), { recursive: true });
  console.log(`✅ 创建搭档目录: ${agentDir}`);

  // 处理头像
  let avatarFilename = '';
  if (opts.avatar) {
    // 用户提供了自定义头像（相对路径基于 projectPath 解析）
    const avatarSrc = resolvePath(projectPath, opts.avatar);
    if (!avatarSrc) {
      console.error('错误: 头像路径无效');
      process.exit(1);
    }
    if (!fs.existsSync(avatarSrc)) {
      console.error(`错误: 头像文件不存在: ${avatarSrc}`);
      process.exit(1);
    }
    avatarFilename = 'avatar.png';
    copyFile(avatarSrc, path.resolve(agentDir, avatarFilename));
    console.log(`✅ 复制自定义头像: ${path.basename(avatarSrc)} -> ${avatarFilename}`);
  } else {
    // 使用随机默认头像
    try {
      const defaultAvatar = getRandomAvatarPath();
      avatarFilename = 'avatar.png';
      copyFile(defaultAvatar, path.resolve(agentDir, avatarFilename));
      console.log(`✅ 分配默认头像: ${path.basename(defaultAvatar)}`);
    } catch (err) {
      console.warn(`⚠️ 默认头像分配失败: ${err.message}`);
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

  const agentJsonPath = path.resolve(agentDir, 'assistant.json');
  fs.writeFileSync(agentJsonPath, JSON.stringify(agentJson, null, 2) + '\n', 'utf-8');
  console.log('✅ 生成 assistant.json');

  // 生成 agent.md
  const agentMdContent = `---\ndescription: ${agentJson.description}\n---\n\n${agentJson.role}\n`;
  const agentMdPath = path.resolve(agentDir, 'agent.md');
  fs.writeFileSync(agentMdPath, agentMdContent, 'utf-8');
  console.log('✅ 生成 agent.md');

  // 自动添加用户确认的技能
  if (opts.skills && opts.skills.length > 0) {
    console.log('\n⏳ 正在添加技能...');
    const addSkillScript = path.resolve(__dirname, 'add-skill.js');
    for (const skillSource of opts.skills) {
      if (!skillSource) continue;
      try {
        execSync(
          `node "${addSkillScript}" "${opts.agentName}" --source "${skillSource}" --path "${projectPath}"`,
          { stdio: 'inherit' }
        );
      } catch {
        console.warn(`⚠️ 技能添加失败，已跳过: ${skillSource}`);
      }
    }
  }

  // 完成
  console.log(`\n✅ 搭档 "${opts.displayName}" 初始化成功！`);
  console.log(`   位置: ${agentDir}`);
  console.log('\n后续步骤:');
  console.log('  1. 编辑 assistant.json 完善角色设定 (role) 和功能描述 (description)');
  console.log('  2. 将知识库文档放入 knowledge/ 目录');
}

main();
