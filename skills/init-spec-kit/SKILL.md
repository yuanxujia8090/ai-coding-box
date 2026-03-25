---
name: spec-kit-init
description: Initialize a repository with GitHub's spec-kit toolkit for Spec-Driven Development. Use this skill whenever the user mentions spec-kit, speckit, specify CLI, spec-driven development, /speckit commands (like /speckit.constitution, /speckit.specify, /speckit.plan, /speckit.tasks, /speckit.implement), or says things like "initialize spec-kit", "set up spec-kit", "add spec-kit to this repo", "use spec-driven development", "规格驱动开发", "初始化spec-kit", "安装specify". Do NOT trigger for generic requests like "write a spec document", "create an API spec", or "initialize a project" unless spec-kit is explicitly mentioned.
---

# Spec-Kit 初始化

这个 skill 负责在当前仓库中初始化 [spec-kit](https://github.com/github/spec-kit)——GitHub 开源的规格驱动开发工具包。初始化完成后，项目中会生成一套 slash 命令（`.claude/commands/`）和文档模板（`.specify/`），让 AI 可以按照规范化流程协助开发。

## 什么是规格驱动开发？

规格驱动开发（Spec-Driven Development）颠覆了传统的"边想边写"模式：先把**要做什么**写清楚，再让 AI 根据规格说明生成实现，而不是直接 vibe coding。完整工作流如下：

1. `/speckit.constitution` — 制定项目原则和开发规范
2. `/speckit.specify` — 描述要构建的功能（关注"做什么"，而非"怎么做"）
3. `/speckit.clarify` *（可选）* — 针对模糊需求提问澄清，降低风险
4. `/speckit.plan` — 生成技术实现方案
5. `/speckit.checklist` *（可选）* — 检查需求完整性和一致性
6. `/speckit.tasks` — 将方案拆解为可执行的任务列表
7. `/speckit.analyze` *（可选）* — 跨文档一致性分析
8. `/speckit.implement` — 执行实现

## 前置条件

- 需要安装 **`uv`**（Python 包管理器），用 `which uv` 检查是否存在。
- 当前目录需要是一个 git 仓库（或者初始化时加 `--no-git` 跳过）。
- 需要能访问 `github.com` 来下载模板文件。

## 初始化步骤

### 第一步：检查 uv 是否可用

```bash
which uv && uv --version
```

如果没有安装 `uv`，先告知用户执行以下命令安装：

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 第二步：获取 spec-kit 最新版本号

通过 `web_fetch` 请求 `https://api.github.com/repos/github/spec-kit/releases/latest`，从返回结果中提取 `tag_name` 字段（例如 `v0.3.2`）。

### 第三步：安装 specify-cli

使用 `uv tool install` 安装，并锁定到上一步获取的版本号：

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@<VERSION>
```

将 `<VERSION>` 替换为实际版本号（如 `v0.3.2`）。

如果之前已安装，想升级到新版本，加上 `--force`：

```bash
uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@<VERSION>
```

### 第四步：在当前仓库中初始化

在项目根目录执行：

```bash
cd <WORKSPACE_ROOT>
specify init --here --ai claude --force --ignore-agent-tools
```

各参数说明：
- `--here` — 在当前目录初始化，而不是新建子目录
- `--ai claude` — 生成 Claude 专用的 slash 命令（即 `.claude/commands/speckit.*.md`）
- `--force` — 跳过"目录非空"的确认提示
- `--ignore-agent-tools` — 跳过对 `claude` CLI 二进制文件的检查（在 CatDesk 中运行时不需要）

### 第五步：验证生成的文件

初始化完成后，确认以下路径已存在：

```
.claude/
└── commands/
    ├── speckit.constitution.md
    ├── speckit.specify.md
    ├── speckit.clarify.md
    ├── speckit.plan.md
    ├── speckit.checklist.md
    ├── speckit.tasks.md
    ├── speckit.analyze.md
    ├── speckit.implement.md
    └── speckit.taskstoissues.md

.specify/
├── memory/
│   └── constitution.md      ← 通过 /speckit.constitution 填写内容
└── templates/
    ├── constitution-template.md
    ├── spec-template.md
    ├── plan-template.md
    ├── tasks-template.md
    ├── checklist-template.md
    └── agent-file-template.md
```

执行以下命令验证：

```bash
find . -path "*/node_modules" -prune -o -name "*.md" -print | grep -E "\.(claude|specify)" | sort
```

### 第六步：安全提醒

告知用户：如果使用了 Claude Code CLI，`.claude/` 目录下可能会存储凭证或 token，建议将其加入 `.gitignore`：

```bash
echo ".claude/" >> .gitignore
```

注意：`.claude/commands/` 下的 slash 命令文件只是 Markdown 模板，提交到 git 是安全的。

## 初始化完成后的下一步

告知用户推荐的后续操作：

1. 运行 `/speckit.constitution`，为项目制定开发原则（代码规范、测试标准、性能要求等）
2. 运行 `/speckit.specify`，描述要构建的功能或系统
3. 按顺序推进：`/speckit.plan` → `/speckit.tasks` → `/speckit.implement`

## 常见问题排查

| 问题现象 | 解决方法 |
|---------|----------|
| 安装后执行 `specify` 提示找不到命令 | 运行 `uv tool update-shell` 或重启终端；也可以用完整路径 `~/.local/bin/specify` |
| 报错 `claude not found` | 加上 `--ignore-agent-tools` 参数，这个检查是针对 Claude Code CLI 的，在 CatDesk 中不需要 |
| 提示"当前目录非空"需要确认 | 加上 `--force` 参数跳过确认 |
| 下载模板时网络报错 | 检查网络连接，需要能访问 GitHub |
| 找不到 `uv` 命令 | 先安装 uv：`curl -LsSf https://astral.sh/uv/install.sh \| sh` |

## 补充说明

- `--ai claude` 生成的是 Claude 专用命令。如果使用其他 AI 工具，可以换成对应参数，例如 `--ai copilot`、`--ai cursor-agent`、`--ai gemini`、`--ai windsurf` 等。
- spec-kit 安装时会锁定版本号，确保稳定性。每次安装前都应先查询最新 release，而不是直接用 `main` 分支。
- `.specify/memory/constitution.md` 初始只是一个占位模板，需要通过 `/speckit.constitution` 命令填写实际内容后才有意义。
