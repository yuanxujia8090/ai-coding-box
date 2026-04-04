#!/usr/bin/env node
/**
 * 代码审查自动化检测入口
 * 自动检测项目类型，运行对应的检查
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const CWD = process.cwd();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator(char = '━', length = 50) {
  console.log(char.repeat(length));
}

// 检测项目类型
function detectProjectType() {
  const packageJsonPath = join(CWD, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return { type: 'unknown', framework: null };
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // 检测框架
    if (deps.react || deps['react-dom']) {
      return { type: 'frontend', framework: 'react', deps };
    }
    if (deps.vue || deps['@vue/cli-service']) {
      return { type: 'frontend', framework: 'vue', deps };
    }
    if (deps.next) {
      return { type: 'frontend', framework: 'next', deps };
    }

    return { type: 'javascript', framework: null, deps };
  } catch (error) {
    log(`⚠️  读取 package.json 失败: ${error.message}`, 'yellow');
    return { type: 'unknown', framework: null };
  }
}

// 运行单个检查脚本
function runCheck(scriptName, description) {
  try {
    log(`\n🔍 ${description}...`, 'cyan');
    const scriptPath = join(import.meta.dirname, scriptName);

    if (!existsSync(scriptPath)) {
      log(`⚠️  脚本不存在: ${scriptName}`, 'yellow');
      return { success: true, skipped: true };
    }

    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: CWD
    });

    return { success: true, skipped: false };
  } catch (error) {
    return { success: false, skipped: false, error };
  }
}

// 主函数
async function main() {
  separator('━', 60);
  log('🤖 代码审查自动化检测', 'blue');
  separator('━', 60);

  // 检测项目类型
  const project = detectProjectType();
  log(`\n📦 项目类型: ${project.type}`, 'cyan');
  if (project.framework) {
    log(`🎨 框架: ${project.framework}`, 'cyan');
  }

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // 必须执行的检查
  const checks = [
    { script: 'check-security.js', name: '安全检查', required: true },
    { script: 'check-dependencies.js', name: '依赖检查', required: true },
  ];

  // 如果有 dist 目录，添加 bundle 分析
  if (existsSync(join(CWD, 'dist')) || existsSync(join(CWD, 'build'))) {
    checks.push({ script: 'analyze-bundle.js', name: 'Bundle 分析', required: false });
  }

  separator('─', 60);

  // 执行所有检查
  for (const check of checks) {
    results.total++;
    const result = runCheck(check.script, check.name);

    if (result.skipped) {
      results.skipped++;
      log(`⏭️  ${check.name}: 跳过`, 'yellow');
    } else if (result.success) {
      results.passed++;
      log(`✅ ${check.name}: 通过`, 'green');
    } else {
      results.failed++;
      log(`❌ ${check.name}: 失败`, 'red');
      if (!check.required) {
        log(`   (非必须检查，继续执行)`, 'yellow');
      }
    }
  }

  // 输出总结
  separator('━', 60);
  log('\n📊 检测结果汇总:', 'blue');
  log(`   总计: ${results.total}`, 'cyan');
  log(`   通过: ${results.passed}`, 'green');
  log(`   失败: ${results.failed}`, 'red');
  log(`   跳过: ${results.skipped}`, 'yellow');
  separator('━', 60);

  // 退出码
  if (results.failed > 0) {
    log('\n❌ 发现问题，请修复后再提交', 'red');
    process.exit(1);
  } else {
    log('\n✅ 所有检查通过！', 'green');
    process.exit(0);
  }
}

main().catch((error) => {
  log(`\n❌ 执行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
