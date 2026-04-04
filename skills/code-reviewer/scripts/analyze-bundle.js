#!/usr/bin/env node
/**
 * Bundle 大小分析脚本
 * 分析打包结果，找出大的依赖
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// 递归获取目录下所有文件
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// 分析 webpack stats.json
function analyzeWebpackStats(statsPath) {
  console.log('📊 分析 Webpack Stats...\n');

  const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));

  // 分析模块大小
  const modules = stats.modules || [];
  const largeModules = modules
    .filter((m) => m.size > 100 * 1024) // > 100KB
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  if (largeModules.length > 0) {
    console.log('🔍 最大的 10 个模块:\n');
    largeModules.forEach((m, i) => {
      console.log(`${i + 1}. ${m.name}`);
      console.log(`   大小: ${formatSize(m.size)}\n`);
    });
  }

  // 计算总大小
  const assets = stats.assets || [];
  const jsAssets = assets.filter((a) => a.name.endsWith('.js'));
  const totalSize = jsAssets.reduce((sum, a) => sum + a.size, 0);

  console.log(`📦 总 Bundle 大小: ${formatSize(totalSize)}`);

  return { totalSize, largeModules };
}

// 分析构建目录
function analyzeBuildDir(buildDir) {
  console.log(`📂 分析构建目录: ${buildDir}\n`);

  const files = getAllFiles(buildDir);
  const jsFiles = files
    .filter((f) => f.endsWith('.js') && !f.includes('.map'))
    .map((f) => ({
      path: f.replace(buildDir + '/', ''),
      size: statSync(f).size,
    }))
    .sort((a, b) => b.size - a.size);

  if (jsFiles.length === 0) {
    console.log('⚠️  未找到 JS 文件\n');
    return { totalSize: 0, files: [] };
  }

  console.log('📦 JS 文件列表:\n');
  jsFiles.slice(0, 10).forEach((file, i) => {
    console.log(`${i + 1}. ${file.path}`);
    console.log(`   大小: ${formatSize(file.size)}\n`);
  });

  const totalSize = jsFiles.reduce((sum, f) => sum + f.size, 0);
  console.log(`📊 总大小: ${formatSize(totalSize)}`);

  return { totalSize, files: jsFiles };
}

// 主函数
async function main() {
  console.log('📦 Bundle 大小分析\n');
  console.log('━'.repeat(50));

  const cwd = process.cwd();

  // 优先查找 stats.json
  const statsPath = join(cwd, 'dist/stats.json');
  let result;

  if (existsSync(statsPath)) {
    result = analyzeWebpackStats(statsPath);
  } else {
    // 查找构建目录
    const buildDirs = ['dist', 'build', '.next/static'];
    let buildDir = null;

    for (const dir of buildDirs) {
      const path = join(cwd, dir);
      if (existsSync(path)) {
        buildDir = path;
        break;
      }
    }

    if (!buildDir) {
      console.log('⚠️  未找到构建目录 (dist/build/.next)');
      console.log('💡 提示:');
      console.log('   - 请先运行构建命令 (npm run build)');
      console.log('   - 或生成 webpack stats: webpack --profile --json > dist/stats.json\n');
      process.exit(0);
    }

    result = analyzeBuildDir(buildDir);
  }

  console.log('\n' + '━'.repeat(50));

  // 检查是否超过阈值
  const THRESHOLD = 500 * 1024; // 500KB
  const WARN_THRESHOLD = 300 * 1024; // 300KB

  if (result.totalSize > THRESHOLD) {
    console.log(`\n❌ Bundle 大小超过 ${formatSize(THRESHOLD)} 限制!`);
    console.log('\n💡 优化建议:');
    console.log('   1. 使用动态导入 (import()) 进行代码拆分');
    console.log('   2. 检查是否引入了不必要的大型库');
    console.log('   3. 使用 webpack-bundle-analyzer 分析依赖');
    console.log('   4. 启用 Tree Shaking');
    console.log('   5. 压缩和混淆代码\n');
    process.exit(1);
  } else if (result.totalSize > WARN_THRESHOLD) {
    console.log(`\n⚠️  Bundle 大小接近 ${formatSize(THRESHOLD)} 限制`);
    console.log('   建议关注并优化\n');
    process.exit(0);
  } else {
    console.log('\n✅ Bundle 大小合格\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(`❌ 执行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
