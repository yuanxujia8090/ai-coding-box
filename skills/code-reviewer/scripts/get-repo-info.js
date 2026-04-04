#!/usr/bin/env node

/**
 * 获取当前仓库信息，用于生成代码链接
 *
 * 使用方式：
 *   node get-repo-info.js
 *
 * 输出格式：
 *   {
 *     "codeBaseUrl": "https://dev.sankuai.com/code/repo-detail/nibfe/msfex-partner",
 *     "branch": "refs/heads/master",
 *     "org": "nibfe",
 *     "repo": "msfex-partner"
 *   }
 */

import { execSync } from 'child_process';

export function getRepoInfo() {
  try {
    // 1. 获取远程仓库 URL
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();

    // 2. 获取当前分支
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

    // 3. 解析仓库信息
    // 支持格式:
    //   - git@git.sankuai.com:nibfe/msfex-partner.git
    //   - https://git.sankuai.com/nibfe/msfex-partner.git
    //   - git@github.com:owner/repo.git

    let org, repo;

    // SSH 格式: git@domain:org/repo.git
    const sshMatch = remoteUrl.match(/git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/);
    if (sshMatch) {
      org = sshMatch[1];
      repo = sshMatch[2];
    }

    // HTTPS 格式: https://domain/org/repo.git
    const httpsMatch = remoteUrl.match(/https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      org = httpsMatch[1];
      repo = httpsMatch[2];
    }

    if (!org || !repo) {
      throw new Error(`无法解析仓库 URL: ${remoteUrl}`);
    }

    // 4. 生成代码平台 URL
    const codeBaseUrl = `https://dev.sankuai.com/code/repo-detail/${org}/${repo}`;
    const branch = `refs/heads/${currentBranch}`;

    return {
      codeBaseUrl,
      branch,
      org,
      repo,
      currentBranch,
      remoteUrl
    };
  } catch (error) {
    console.error('获取仓库信息失败:', error.message);

    // 返回默认值（不带链接）
    return {
      codeBaseUrl: '',
      branch: 'refs/heads/master',
      org: '',
      repo: '',
      currentBranch: 'master',
      remoteUrl: '',
      error: error.message
    };
  }
}

// 如果直接运行此脚本，输出 JSON
if (import.meta.url === `file://${process.argv[1]}`) {
  const info = getRepoInfo();
  console.log(JSON.stringify(info, null, 2));
}
