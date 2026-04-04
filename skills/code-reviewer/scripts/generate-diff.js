#!/usr/bin/env node

/**
 * 自动生成当前分支与 master 的 diff 文件
 *
 * 使用方式：
 *   node generate-diff.js [base-branch]
 *
 * 参数：
 *   base-branch: 对比的基础分支，默认为 master
 *
 * 输出：
 *   在当前目录生成 .code-review-diff.tmp 文件
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * 生成 diff 文件
 * @param {string} baseBranch - 基础分支名称
 * @param {string} outputPath - 输出文件路径
 * @returns {object} 结果信息
 */
export function generateDiff(baseBranch = 'master', outputPath = null) {
  try {
    // 1. 检查是否在 git 仓库中
    try {
      execSync('git rev-parse --git-dir', { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error) {
      throw new Error('当前目录不是 git 仓库');
    }

    // 2. 获取当前分支
    const currentBranch = execSync('git branch --show-current', {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();

    if (!currentBranch) {
      throw new Error('无法获取当前分支（可能处于 detached HEAD 状态）');
    }

    // 3. 检查基础分支是否存在
    const branches = execSync('git branch -a', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    const baseBranchExists = branches.includes(baseBranch) ||
                            branches.includes(`remotes/origin/${baseBranch}`);

    if (!baseBranchExists) {
      throw new Error(`基础分支 "${baseBranch}" 不存在`);
    }

    // 4. 检查是否有未提交的改动
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();

    if (status) {
      console.warn('⚠️  警告：当前有未提交的改动，这些改动不会包含在 diff 中');
      console.warn('   建议先提交或暂存改动：git add . && git commit -m "..."');
      console.warn('');
    }

    // 5. 确定对比的基础分支（优先使用 origin/xxx）
    let compareBase = baseBranch;
    if (branches.includes(`remotes/origin/${baseBranch}`)) {
      compareBase = `origin/${baseBranch}`;

      // 尝试更新远程分支
      try {
        console.log(`📡 正在更新远程分支 ${compareBase}...`);
        execSync(`git fetch origin ${baseBranch}`, { stdio: 'pipe' });
      } catch (error) {
        console.warn(`⚠️  无法更新远程分支，使用本地版本`);
      }
    }

    // 6. 生成 diff
    console.log(`📊 正在生成 diff: ${currentBranch} vs ${compareBase}...`);

    const diffContent = execSync(`git diff ${compareBase}...HEAD`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      stdio: 'pipe'
    });

    if (!diffContent.trim()) {
      throw new Error(`当前分支与 ${compareBase} 没有差异`);
    }

    // 7. 写入文件
    const defaultOutputPath = join(process.cwd(), '.code-review-diff.tmp');
    const finalOutputPath = outputPath || defaultOutputPath;

    writeFileSync(finalOutputPath, diffContent, 'utf-8');

    // 8. 统计信息
    const stats = {
      currentBranch,
      baseBranch: compareBase,
      outputPath: finalOutputPath,
      fileSize: Buffer.byteLength(diffContent, 'utf-8'),
      linesChanged: diffContent.split('\n').length,
      filesChanged: (diffContent.match(/^diff --git/gm) || []).length
    };

    // 9. 输出统计
    console.log('');
    console.log('✅ Diff 文件生成成功！');
    console.log('');
    console.log('📋 统计信息：');
    console.log(`   当前分支：${stats.currentBranch}`);
    console.log(`   对比分支：${stats.baseBranch}`);
    console.log(`   文件数量：${stats.filesChanged} 个`);
    console.log(`   改动行数：${stats.linesChanged} 行`);
    console.log(`   文件大小：${(stats.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   输出路径：${stats.outputPath}`);
    console.log('');

    return {
      success: true,
      ...stats
    };

  } catch (error) {
    console.error('❌ 生成 diff 失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 清理 diff 文件
 * @param {string} filePath - diff 文件路径
 */
export function cleanupDiff(filePath = null) {
  const defaultPath = join(process.cwd(), '.code-review-diff.tmp');
  const targetPath = filePath || defaultPath;

  try {
    if (existsSync(targetPath)) {
      unlinkSync(targetPath);
      console.log(`🗑️  已删除 diff 文件: ${targetPath}`);
      return { success: true };
    } else {
      console.log(`ℹ️  diff 文件不存在: ${targetPath}`);
      return { success: true, message: 'File not found' };
    }
  } catch (error) {
    console.error(`❌ 删除 diff 文件失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 命令行使用
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // 解析参数
  let baseBranch = 'master';
  let outputPath = null;
  let cleanup = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--cleanup' || arg === '-c') {
      cleanup = true;
    } else if (arg === '--output' || arg === '-o') {
      outputPath = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
使用方法: node generate-diff.js [选项] [基础分支]

选项:
  -o, --output <path>   指定输出文件路径（默认：.code-review-diff.tmp）
  -c, --cleanup         清理 diff 文件
  -h, --help            显示帮助信息

参数:
  基础分支              对比的基础分支（默认：master）

示例:
  node generate-diff.js                    # 与 master 对比
  node generate-diff.js develop            # 与 develop 对比
  node generate-diff.js -o my-diff.txt     # 指定输出文件
  node generate-diff.js -c                 # 清理 diff 文件
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      baseBranch = arg;
    }
  }

  if (cleanup) {
    cleanupDiff(outputPath);
  } else {
    const result = generateDiff(baseBranch, outputPath);
    process.exit(result.success ? 0 : 1);
  }
}
