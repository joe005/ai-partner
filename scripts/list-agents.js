#!/usr/bin/env node
/**
 * 列出 AI 搭档清单
 *
 * 用法：
 *   node list-agents.js [options]
 *
 * 选项：
 *   --path <项目根目录>       默认为当前工作目录
 *   --remote <URL>            从远程获取搭档清单
 *   --format table|json       输出格式，默认 table
 *   --domain <领域>           按领域过滤
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 参数解析 ──
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { projectPath: process.cwd(), remote: '', format: 'table', domain: '' };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
        result.projectPath = args[++i] || process.cwd();
        break;
      case '--remote':
        result.remote = args[++i] || '';
        break;
      case '--format':
        result.format = args[++i] || 'table';
        break;
      case '--domain':
        result.domain = args[++i] || '';
        break;
    }
  }

  return result;
}

// ── 扫描本地搭档目录 ──
function scanLocalAgents(aiPartnersDir) {
  const agents = [];

  if (!fs.existsSync(aiPartnersDir)) {
    return agents;
  }

  const entries = fs.readdirSync(aiPartnersDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const agentJsonPath = path.join(aiPartnersDir, entry.name, 'assistant.json');
    if (!fs.existsSync(agentJsonPath)) continue;

    try {
      const agentJson = JSON.parse(fs.readFileSync(agentJsonPath, 'utf-8'));
      agents.push({
        name: agentJson.name || entry.name,
        displayName: agentJson.displayName || entry.name,
        domain: agentJson.domain || '通用',
        description: agentJson.description || '',
        visibility: agentJson.visibility || 'private',
        version: agentJson.version || '1.0.0',
        skills: (agentJson.skills || []).length,
        knowledge: (agentJson.knowledge || []).length,
        createdAt: agentJson.createdAt || '',
        updatedAt: agentJson.updatedAt || '',
      });
    } catch (e) {
      console.warn(`警告: 无法解析 ${agentJsonPath}: ${e.message}`);
    }
  }

  return agents;
}

// ── 从远程 URL 获取清单 ──
function fetchRemoteAgents(url) {
  try {
    console.log(`⏳ 正在获取远程清单: ${url}`);
    const result = execSync(`curl -fsSL "${url}"`, { encoding: 'utf-8' });
    const data = JSON.parse(result);
    return Array.isArray(data.agents) ? data.agents : (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error(`错误: 无法获取远程清单: ${e.message}`);
    process.exit(1);
  }
}

// ── 格式化输出：表格 ──
function printTable(agents) {
  if (agents.length === 0) {
    console.log('(空) 未找到任何搭档');
    return;
  }

  // 表头
  const header = ['名称', '显示名称', '领域', '可见性', '版本', '技能数', '知识库', '描述'];
  const rows = agents.map(a => [
    a.name,
    a.displayName,
    a.domain,
    a.visibility === 'public' ? '全员可见' : '仅自己',
    a.version || '-',
    String(a.skills || 0),
    String(a.knowledge || 0),
    (a.description || '').substring(0, 30) + ((a.description || '').length > 30 ? '...' : ''),
  ]);

  // 计算列宽
  const colWidths = header.map((h, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, getDisplayWidth(row[i])), 0);
    return Math.max(getDisplayWidth(h), maxData);
  });

  const separator = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
  const formatRow = (row) => row.map((cell, i) => ` ${padEnd(cell, colWidths[i])} `).join('│');

  console.log(separator);
  console.log(formatRow(header));
  console.log(separator);
  rows.forEach(row => console.log(formatRow(row)));
  console.log(separator);
  console.log(`\n共 ${agents.length} 个搭档`);
}

// ── 辅助函数：计算字符显示宽度（中文占2） ──
function getDisplayWidth(str) {
  let width = 0;
  for (const ch of str) {
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

  let agents;

  if (opts.remote) {
    // 远程模式
    agents = fetchRemoteAgents(opts.remote);
  } else {
    // 本地模式
    const aiPartnersDir = path.resolve(opts.projectPath, 'ai-partners');
    agents = scanLocalAgents(aiPartnersDir);
  }

  // 按领域过滤
  if (opts.domain) {
    agents = agents.filter(a => a.domain === opts.domain);
  }

  // 输出
  if (opts.format === 'json') {
    console.log(JSON.stringify(agents, null, 2));
  } else {
    printTable(agents);
  }
}

main();
