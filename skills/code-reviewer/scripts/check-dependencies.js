#!/usr/bin/env node
/**
 * 依赖检查脚本
 * 只检查本次 diff 变更文件中的幻影依赖 + npm/pnpm 包漏洞
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const CWD = process.cwd();
const DIFF_FILE = `${CWD}/.code-review-diff.tmp`;

// 从 diff 文件中提取变更的 JS/TS 文件路径（复用 check-security.js 的逻辑）
function getChangedFilesFromDiff() {
  if (existsSync(DIFF_FILE)) {
    const diffContent = readFileSync(DIFF_FILE, 'utf-8');
    const files = new Set();
    const regex = /^diff --git a\/.+ b\/(.+)$/gm;
    let match;
    while ((match = regex.exec(diffContent)) !== null) files.add(match[1]);
    return [...files].filter(f =>
      /\.(js|jsx|ts|tsx)$/.test(f) &&
      !f.includes('node_modules') && !f.includes('/dist/') &&
      !f.includes('.test.') && !f.includes('.spec.')
    );
  }

  try {
    const output = execSync('git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only --cached', {
      cwd: CWD, encoding: 'utf-8', timeout: 5000,
    });
    return output.split('\n').filter(f => f && /\.(js|jsx|ts|tsx)$/.test(f) && !f.includes('node_modules'));
  } catch {
    return [];
  }
}

// 从指定文件列表中提取所有 import 的包名
function extractImportsFromFiles(files) {
  const imports = new Set();
  for (const file of files) {
    const fullPath = resolve(CWD, file);
    if (!existsSync(fullPath)) continue;
    try {
      const content = readFileSync(fullPath, 'utf-8');
      if (content.length > 500 * 1024) continue; // 跳过超大文件
      for (const regex of [
        /from\s+['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      ]) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const pkg = extractPackageName(match[1]);
          if (pkg) imports.add(pkg);
        }
      }
    } catch { /* 忽略读取失败 */ }
  }
  return [...imports];
}

function extractPackageName(importPath) {
  if (importPath.startsWith('.') || importPath.startsWith('/')) return null;
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return importPath.split('/')[0];
}

// 检查幻影依赖（只针对本次 diff 变更的文件）
async function checkPhantomDependencies(changedFiles) {
  console.log('🔍 检测幻影依赖（仅检查本次变更文件）...\n');

  const packageJsonPath = `${CWD}/package.json`;
  if (!existsSync(packageJsonPath)) {
    console.log('⚠️  未找到 package.json，跳过幻影依赖检测\n');
    return { passed: true };
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const declared = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ]);

  const imported = extractImportsFromFiles(changedFiles);
  console.log(`📦 变更文件中使用了 ${imported.length} 个外部包\n`);

  const phantoms = imported.filter(pkg => !declared.has(pkg));

  if (phantoms.length === 0) {
    console.log('✅ 未发现幻影依赖\n');
    return { passed: true };
  }

  console.log(`❌ 发现 ${phantoms.length} 个幻影依赖（使用了但未在 package.json 声明）:\n`);
  phantoms.forEach((pkg, idx) => {
    console.log(`  ${idx + 1}. 📦 ${pkg}`);
  });
  console.log('\n💡 修复：pnpm add <package-name>\n');
  return { passed: false, phantoms };
}

// 检查 npm/pnpm 漏洞
function checkVulnerabilities() {
  console.log('🔒 检测包漏洞...\n');

  // 自动检测包管理器
  const isPnpm = existsSync(`${CWD}/pnpm-lock.yaml`);
  const isYarn = existsSync(`${CWD}/yarn.lock`);
  const auditCmd = isPnpm ? 'pnpm audit --json' : isYarn ? 'yarn audit --json' : 'npm audit --json';

  try {
    const auditResult = execSync(auditCmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 30000, // 30秒超时，避免网络问题挂起
      cwd: CWD,
    });

    const audit = JSON.parse(auditResult);
    const vuln = audit.metadata?.vulnerabilities || audit.vulnerabilities || {};
    const critical = vuln.critical || 0;
    const high = vuln.high || 0;

    console.log(`  🔴 严重: ${critical}  🟠 高危: ${high}  🟡 中危: ${vuln.moderate || 0}  🟢 低危: ${vuln.low || 0}\n`);

    if (critical > 0 || high > 0) {
      console.log(`❌ 发现严重或高危漏洞，建议运行: ${isPnpm ? 'pnpm audit' : 'npm audit fix'}\n`);
      return { passed: false };
    }
    console.log('✅ 未发现严重或高危漏洞\n');
    return { passed: true };
  } catch {
    console.log('⚠️  漏洞扫描跳过（网络问题或包管理器不支持 audit）\n');
    return { passed: true };
  }
}

// 主函数
async function main() {
  console.log('📦 依赖检查\n' + '━'.repeat(50));

  const changedFiles = getChangedFilesFromDiff();
  if (changedFiles.length === 0) {
    console.log('⚠️  未找到变更文件，跳过幻影依赖检测\n');
  }

  const phantomResult = changedFiles.length > 0
    ? await checkPhantomDependencies(changedFiles)
    : { passed: true };

  console.log('━'.repeat(50));
  const vulnResult = checkVulnerabilities();
  console.log('━'.repeat(50));

  if (!phantomResult.passed || !vulnResult.passed) {
    console.log('\n❌ 依赖检查发现问题，请确认后再合并\n');
    process.exit(1);
  } else {
    console.log('\n✅ 依赖检查通过\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error(`❌ 执行失败: ${error.message}`);
  process.exit(1);
});
