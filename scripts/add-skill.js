#!/usr/bin/env node
/**
 * 向灵基智能体添加技能
 *
 * 用法：
 *   node add-skill.js <agent-name> --source <本地路径或远程URL> [--path <项目根目录>]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 参数解析 ──
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { agentName: null, source: '', projectPath: process.cwd() };

  if (args.length === 0 || args[0].startsWith('--')) return null;
  result.agentName = args[0];

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        result.source = args[++i] || '';
        break;
      case '--path':
        result.projectPath = args[++i] || process.cwd();
        break;
    }
  }

  return result;
}

// ── 判断是否为远程 URL ──
function isRemoteUrl(source) {
  return /^https?:\/\//i.test(source);
}

// ── 递归复制目录 ──
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── 从远程 URL 下载并解压技能 ──
function downloadAndExtract(url, destDir, skillName) {
  const tmpDir = path.join(require('os').tmpdir(), `skill-download-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const tmpFile = path.join(tmpDir, 'skill-package');

    // 下载
    console.log(`⏳ 正在下载: ${url}`);
    try {
      execSync(`curl -fsSL -o "${tmpFile}" "${url}"`, { stdio: 'pipe' });
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString().trim() : '';
      if (stderr.includes('404') || stderr.includes('Not Found')) {
        throw new Error(`下载失败: 远程地址返回 404，请检查 URL 是否正确\n  URL: ${url}`);
      } else if (stderr.includes('Could not resolve host')) {
        throw new Error(`下载失败: 无法解析主机名，请检查网络连接或 URL\n  URL: ${url}`);
      } else {
        throw new Error(`下载失败: ${stderr || '未知错误'}\n  URL: ${url}`);
      }
    }

    // 验证下载文件存在且非空
    if (!fs.existsSync(tmpFile) || fs.statSync(tmpFile).size === 0) {
      throw new Error(`下载失败: 文件为空或未成功下载\n  URL: ${url}`);
    }

    // 检测文件类型并解压
    fs.mkdirSync(destDir, { recursive: true });

    if (url.endsWith('.zip')) {
      execSync(`unzip -q "${tmpFile}" -d "${destDir}"`, { stdio: 'pipe' });
    } else if (url.endsWith('.tar.gz') || url.endsWith('.tgz')) {
      execSync(`tar -xzf "${tmpFile}" -C "${destDir}"`, { stdio: 'pipe' });
    } else {
      // 尝试作为 zip 解压
      try {
        execSync(`unzip -q "${tmpFile}" -d "${destDir}"`, { stdio: 'pipe' });
      } catch {
        try {
          execSync(`tar -xzf "${tmpFile}" -C "${destDir}"`, { stdio: 'pipe' });
        } catch {
          throw new Error('无法识别的压缩格式，仅支持 .zip 和 .tar.gz/.tgz');
        }
      }
    }

    console.log(`✅ 下载并解压完成: ${skillName}`);
  } finally {
    // 清理临时文件
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── 从路径或 URL 推断技能名称 ──
function inferSkillName(source) {
  if (isRemoteUrl(source)) {
    const urlPath = new URL(source).pathname;

    // GitHub archive URL: /user/repo/archive/refs/heads/branch.zip
    const ghArchiveMatch = urlPath.match(/^\/([^/]+)\/([^/]+)\/archive\//);
    if (ghArchiveMatch) {
      return ghArchiveMatch[2]; // 返回仓库名
    }

    // GitHub release URL: /user/repo/releases/download/tag/file.zip
    const ghReleaseMatch = urlPath.match(/^\/([^/]+)\/([^/]+)\/releases\/download\//);
    if (ghReleaseMatch) {
      const basename = path.basename(urlPath).replace(/\.(zip|tar\.gz|tgz)$/i, '');
      return basename || ghReleaseMatch[2];
    }

    // 通用：取最后一段去掉扩展名
    const basename = path.basename(urlPath).replace(/\.(zip|tar\.gz|tgz)$/i, '');
    return basename || 'unknown-skill';
  }
  // 本地路径：取目录名
  return path.basename(path.resolve(source));
}

// ── 主流程 ──
function main() {
  const opts = parseArgs(process.argv);

  if (!opts || !opts.source) {
    console.error('用法: node add-skill.js <agent-name> --source <本地路径或远程URL> [--path <项目根目录>]');
    process.exit(1);
  }

  const agentDir = path.resolve(opts.projectPath, 'ai-partners', opts.agentName);
  const agentJsonPath = path.join(agentDir, 'assistant.json');

  // 验证智能体存在
  if (!fs.existsSync(agentJsonPath)) {
    console.error(`错误: 智能体不存在: ${agentDir}`);
    console.error('请先使用 init-agent.js 创建智能体');
    process.exit(1);
  }

  // 读取 assistant.json
  const agentJson = JSON.parse(fs.readFileSync(agentJsonPath, 'utf-8'));

  // 推断技能名称
  const skillName = inferSkillName(opts.source);
  const skillDestDir = path.join(agentDir, 'skills', skillName);

  // 防止重复添加（如果 JSON 有记录但目录已删除，自动清理旧记录）
  const existingSkillIndex = (agentJson.skills || []).findIndex(s => s.name === skillName);
  if (existingSkillIndex !== -1) {
    if (fs.existsSync(skillDestDir)) {
      console.error(`错误: 技能 "${skillName}" 已存在，如需更新请先手动删除 skills/${skillName}/ 目录`);
      process.exit(1);
    }
    // 目录已不存在，清理孤立记录
    console.log(`⚠️ 技能 "${skillName}" 的目录已丢失，清理旧记录后重新添加`);
    agentJson.skills.splice(existingSkillIndex, 1);
  }

  if (fs.existsSync(skillDestDir)) {
    console.error(`错误: 技能目录已存在: ${skillDestDir}`);
    process.exit(1);
  }

  // 复制或下载技能
  const sourceType = isRemoteUrl(opts.source) ? 'remote' : 'local';

  if (sourceType === 'local') {
    const sourcePath = path.resolve(opts.source);
    if (!fs.existsSync(sourcePath)) {
      console.error(`错误: 源技能路径不存在: ${sourcePath}`);
      process.exit(1);
    }

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirRecursive(sourcePath, skillDestDir);
    } else {
      // 单文件技能
      fs.mkdirSync(skillDestDir, { recursive: true });
      fs.copyFileSync(sourcePath, path.join(skillDestDir, path.basename(sourcePath)));
    }
    console.log(`✅ 复制本地技能: ${sourcePath} → skills/${skillName}/`);
  } else {
    downloadAndExtract(opts.source, skillDestDir, skillName);
  }

  // 更新 assistant.json
  if (!Array.isArray(agentJson.skills)) {
    agentJson.skills = [];
  }

  agentJson.skills.push({
    name: skillName,
    source: opts.source,
    sourceType: sourceType,
    copiedAt: new Date().toISOString(),
  });

  agentJson.updatedAt = new Date().toISOString();
  fs.writeFileSync(agentJsonPath, JSON.stringify(agentJson, null, 2) + '\n', 'utf-8');
  console.log('✅ 更新 assistant.json skills 数组');

  // 同步重写 agent.md
  const agentMdPath = path.join(path.dirname(agentJsonPath), 'agent.md');
  const agentMdContent = `---\ndescription: ${agentJson.description}\n---\n\n${agentJson.role}\n`;
  fs.writeFileSync(agentMdPath, agentMdContent, 'utf-8');
  console.log('✅ 同步更新 agent.md');

  console.log(`\n✅ 技能 "${skillName}" 添加成功！`);
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
}
