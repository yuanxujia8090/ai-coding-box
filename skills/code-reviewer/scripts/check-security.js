#!/usr/bin/env node
/**
 * 安全检查脚本
 * 只扫描本次 diff 变更的文件，不扫描整个项目
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const CWD = process.cwd();
const DIFF_FILE = join(CWD, '.code-review-diff.tmp');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};
const c = (msg, color) => `${colors[color] || ''}${msg}${colors.reset}`;

// 危险模式定义
const SECURITY_PATTERNS = {
  hardcoded_key: {
    pattern: /(api[_-]?key|apikey|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"`][\w\-]{20,}['"`]/i,
    severity: 'critical',
    message: '硬编码的 API 密钥或访问令牌',
    suggestion: '使用环境变量: process.env.API_KEY',
  },
  hardcoded_password: {
    pattern: /password\s*[:=]\s*['"`][^'"`]{6,}['"`]/i,
    severity: 'critical',
    message: '硬编码的密码',
    suggestion: '使用环境变量或密钥管理服务',
  },
  dangerous_innerhtml: {
    pattern: /\.innerHTML\s*=\s*(?!['"`])/,
    severity: 'high',
    message: '动态设置 innerHTML 可能导致 XSS',
    suggestion: '使用 textContent 或框架提供的安全方法',
  },
  dangerously_set_html: {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\{?\s*__html:/,
    severity: 'high',
    message: '使用 dangerouslySetInnerHTML 可能导致 XSS',
    suggestion: '确保内容已经过 DOMPurify 等工具清理',
  },
  eval_usage: {
    pattern: /\beval\s*\(/,
    severity: 'critical',
    message: '使用 eval() 存在代码注入风险',
    suggestion: '避免使用 eval，考虑使用 JSON.parse 或其他安全替代方案',
  },
  function_constructor: {
    pattern: /new\s+Function\s*\(/,
    severity: 'high',
    message: '使用 Function 构造函数存在代码注入风险',
    suggestion: '避免动态生成函数',
  },
  console_log_sensitive: {
    pattern: /console\.log\(.*?(password|token|secret|key|credential)/i,
    severity: 'medium',
    message: 'console.log 可能泄露敏感信息',
    suggestion: '移除或使用专门的日志系统',
  },
};

/**
 * 从 diff 文件中提取变更的文件路径
 * 只处理 .js/.jsx/.ts/.tsx 文件，跳过 node_modules / 测试文件 / 自动生成文件
 */
function getChangedFilesFromDiff() {
  // 优先从 .code-review-diff.tmp 读取
  if (existsSync(DIFF_FILE)) {
    const diffContent = readFileSync(DIFF_FILE, 'utf-8');
    const files = new Set();
    const fileHeaderRegex = /^diff --git a\/.+ b\/(.+)$/gm;
    let match;
    while ((match = fileHeaderRegex.exec(diffContent)) !== null) {
      files.add(match[1]);
    }
    return filterRelevantFiles([...files]);
  }

  // fallback：从 git 获取变更文件
  try {
    const output = execSync('git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only --cached', {
      cwd: CWD,
      encoding: 'utf-8',
      timeout: 5000,
    });
    const files = output.split('\n').filter(Boolean);
    return filterRelevantFiles(files);
  } catch {
    return [];
  }
}

function filterRelevantFiles(files) {
  return files.filter(f =>
    /\.(js|jsx|ts|tsx)$/.test(f) &&
    !f.includes('node_modules') &&
    !f.includes('/dist/') &&
    !f.includes('/build/') &&
    !f.includes('.test.') &&
    !f.includes('.spec.') &&
    !f.includes('.stories.') &&
    !f.includes('__mocks__') &&
    // 跳过自动生成文件（G8 规则：只检测是否被手动修改，由 AI 判断，脚本不扫描内容）
    !f.includes('/api/') &&
    !f.endsWith('.generated.ts') &&
    !f.endsWith('.auto.ts')
  );
}

// 扫描单个文件
function scanFile(filepath) {
  const issues = [];
  const fullPath = resolve(CWD, filepath);

  if (!existsSync(fullPath)) return issues;

  try {
    const content = readFileSync(fullPath, 'utf-8');
    // 超大文件跳过（>500KB 通常是 auto-generated）
    if (content.length > 500 * 1024) {
      console.log(c(`⏭️  跳过大文件: ${filepath} (${Math.round(content.length / 1024)}KB)`, 'yellow'));
      return issues;
    }

    for (const [name, config] of Object.entries(SECURITY_PATTERNS)) {
      const regex = new RegExp(config.pattern, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNum - 1]?.trim() ?? '';
        issues.push({
          file: filepath,
          line: lineNum,
          type: name,
          severity: config.severity,
          message: config.message,
          suggestion: config.suggestion,
          code: line.length > 120 ? line.substring(0, 120) + '...' : line,
        });
      }
    }
  } catch (error) {
    console.error(c(`⚠️  扫描 ${filepath} 失败: ${error.message}`, 'yellow'));
  }

  return issues;
}

// 主函数
async function main() {
  console.log('🔒 运行安全扫描（仅扫描本次 diff 变更文件）...\n');

  const changedFiles = getChangedFilesFromDiff();

  if (changedFiles.length === 0) {
    console.log(c('⚠️  未找到 diff 文件或无变更的 JS/TS 文件，跳过安全扫描', 'yellow'));
    process.exit(0);
  }

  console.log(`📁 扫描 ${changedFiles.length} 个变更文件...\n`);

  const allIssues = [];
  for (const file of changedFiles) {
    const issues = scanFile(file);
    allIssues.push(...issues);
  }

  const grouped = {
    critical: allIssues.filter(i => i.severity === 'critical'),
    high: allIssues.filter(i => i.severity === 'high'),
    medium: allIssues.filter(i => i.severity === 'medium'),
  };

  if (allIssues.length === 0) {
    console.log(c('✅ 未发现安全问题\n', 'green'));
    process.exit(0);
  }

  console.log(c(`❌ 发现 ${allIssues.length} 个潜在安全问题:\n`, 'red'));

  for (const [level, emoji] of [['critical', '🔴'], ['high', '🟠'], ['medium', '🟡']]) {
    const group = grouped[level];
    if (!group.length) continue;
    console.log(`${emoji} ${level === 'critical' ? '严重' : level === 'high' ? '高危' : '中危'}问题 (${group.length}):`);
    group.slice(0, 10).forEach((issue, idx) => {
      console.log(`\n  ${idx + 1}. ${issue.file}:${issue.line}`);
      console.log(c(`     类型: ${issue.message}`, 'yellow'));
      console.log(`     代码: ${issue.code}`);
      console.log(`     建议: ${issue.suggestion}`);
    });
    if (group.length > 10) {
      console.log(c(`\n  ... 还有 ${group.length - 10} 个同类问题\n`, 'yellow'));
    }
    console.log();
  }

  if (grouped.critical.length > 0 || grouped.high.length > 0) {
    console.log(c('\n❌ 发现严重或高危安全问题，必须修复！\n', 'red'));
    process.exit(1);
  } else {
    console.log(c('\n⚠️  发现中危安全问题，建议修复\n', 'yellow'));
    process.exit(0);
  }
}

main().catch(error => {
  console.error(c(`❌ 执行失败: ${error.message}`, 'red'));
  process.exit(1);
});
