#!/usr/bin/env node
/**
 * 列出本地可用技能
 *
 * 用法：
 *   node list-skills.js [options]
 *
 * 选项：
 *   --path <技能目录>        本地技能根目录，默认 ./.opencode/skills/dev/
 *   --format table|json      输出格式，默认 table
 *   --keyword <关键词>       按关键词过滤（如 发票、报销）
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── 默认本地技能目录 ──
const DEFAULT_SKILLS_DIR = path.join(process.cwd(), '.opencode', 'skills', 'dev');

// ── 参数解析 ──
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { skillsDir: DEFAULT_SKILLS_DIR, format: 'table', keyword: '' };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
        result.skillsDir = args[++i] || DEFAULT_SKILLS_DIR;
        break;
      case '--format':
        result.format = args[++i] || 'table';
        break;
      case '--keyword':
        result.keyword = args[++i] || '';
        break;
    }
  }

  return result;
}

// ── 解析 SKILL.md 提取元信息 ──
function parseSkillMeta(skillDir) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const packageJsonPath = path.join(skillDir, 'package.json');

  let name = path.basename(skillDir);
  let description = '';

  // 优先从 SKILL.md 读取
  if (fs.existsSync(skillMdPath)) {
    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      // 匹配 YAML frontmatter 中的 name 和 description
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      if (nameMatch) name = nameMatch[1].trim();
      if (descMatch) description = descMatch[1].trim();

      // 如果没有 YAML frontmatter，尝试从第一行 # 标题提取
      if (!description) {
        const headerMatch = content.match(/^#\s+(.+)$/m);
        if (headerMatch) description = headerMatch[1].trim();
      }
    } catch {
      // 忽略读取失败
    }
  }

  // 备选：从 package.json 读取
  if (!description && fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      description = pkg.description || '';
    } catch {
      // 忽略读取失败
    }
  }

  return { name, description, path: skillDir };
}

// ── 扫描技能目录 ──
function scanSkills(skillsDir) {
  const skills = [];

  if (!fs.existsSync(skillsDir)) {
    return skills;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillPath = path.join(skillsDir, entry.name);
    const meta = parseSkillMeta(skillPath);

    // 至少要有 SKILL.md 才认为是有效技能
    if (!fs.existsSync(path.join(skillPath, 'SKILL.md'))) continue;

    skills.push(meta);
  }

  return skills;
}

// ── 按关键词过滤 ──
function filterByKeyword(skills, keyword) {
  if (!keyword) return skills;
  const k = keyword.toLowerCase();
  return skills.filter(s =>
    s.name.toLowerCase().includes(k) ||
    s.description.toLowerCase().includes(k)
  );
}

// ── 格式化输出：表格 ──
function printTable(skills) {
  if (skills.length === 0) {
    console.log('(空) 未找到任何技能');
    return;
  }

  const header = ['技能名称', '描述', '路径'];
  const rows = skills.map(s => [
    s.name,
    s.description.substring(0, 40) + (s.description.length > 40 ? '...' : ''),
    s.path,
  ]);

  const colWidths = header.map((h, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, getDisplayWidth(row[i])), 0);
    return Math.max(getDisplayWidth(h), maxData, [20, 42, 30][i]);
  });

  const separator = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
  const formatRow = (row) => row.map((cell, i) => ` ${padEnd(cell, colWidths[i])} `).join('│');

  console.log(separator);
  console.log(formatRow(header));
  console.log(separator);
  rows.forEach(row => console.log(formatRow(row)));
  console.log(separator);
  console.log(`\n共 ${skills.length} 个技能`);
}

function getDisplayWidth(str) {
  let width = 0;
  for (const ch of str || '') {
    width += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  return width;
}

function padEnd(str, targetWidth) {
  const currentWidth = getDisplayWidth(str);
  const padding = targetWidth - currentWidth;
  return padding > 0 ? str + ' '.repeat(padding) : str;
}

// ── 主流程 ──
function main() {
  const opts = parseArgs(process.argv);
  const skillsDir = path.resolve(opts.skillsDir);

  let skills = scanSkills(skillsDir);
  skills = filterByKeyword(skills, opts.keyword);

  if (opts.format === 'json') {
    console.log(JSON.stringify(skills, null, 2));
  } else {
    printTable(skills);
  }
}

main();
