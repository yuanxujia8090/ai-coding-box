审查完成后，按以下格式输出完整报告。

**⛔ 禁止**：输出聊天摘要 / bullet-point 总结 / "做得好的地方" / "需要帮你修复吗" 等对话式内容。
**✅ 必须**：严格按下面每个节的结构输出，每个问题必须有 位置 + 依据 + 运行时后果 + 代码片段。

---

### 📋 上下文分析

**探索的文件：**
- ✅ 已读取的完整文件及关键改动
- ✅ 已搜索的引用和调用关系
- ✅ 已检查的测试文件（如有）

**影响范围：**
- 新增/修改函数的调用方数量和位置
- 删除代码的残留引用（如有）
- 修改接口的下游影响范围

---

### 🤖 自动化检测结果

- 自动检测（index.js）：✅ 通过 / ❌ 发现问题[描述]（覆盖：硬编码密钥、XSS、eval、幻影依赖、npm 漏洞）

---

### 🚦 五项自检结论

| # | 检查项 | 结论 |
|---|--------|------|
| 1 | 工程配置改动 | `✅ 不涉及` / `⚠️ 有改动，已说明` |
| 2 | 存量逻辑修改 | `✅ 无修改` / `⚠️ 有修改，影响 N 处已评估` |
| 3 | 金额/积分计算 | `✅ 不涉及` / `⚠️ 涉及，精度已核实` |
| 4 | 依赖升级 | `✅ 不涉及` / `⚠️ 有升级，changelog 已查` |
| 5 | 异常处理 | `✅ 处理完整` / `❌ 发现问题[描述]` |

---

### 🔴 严重问题（P0 - 必须修复，阻塞合并）

**[P0-1] [问题类型]**
- **位置**：[src/components/UserList.tsx:45]({{CODE_BASE_URL}}/file/detail?path=src/components/UserList.tsx&branch={{BRANCH}}#L45)
- **依据**：速查卡 G4 / SECURITY_PATTERNS.md §一.1
- **问题**：`dangerouslySetInnerHTML={{ __html: content }}` 直接插入接口数据，未经净化
- **运行时后果**：若后端数据被注入恶意脚本，用户 Cookie/Token 将被窃取
- **代码**：
  ```javascript
  // ❌ 当前
  <div dangerouslySetInnerHTML={{ __html: content }} />
  ```
- **修复方案**：
  ```javascript
  // ✅ 修复
  import DOMPurify from 'dompurify';
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
  ```

---

### 🟡 建议优化（P1 - 强烈建议）

**[P1-1] [优化类型]**
- **位置**：[src/hooks/useUserList.ts:23]({{CODE_BASE_URL}}/file/detail?path=src/hooks/useUserList.ts&branch={{BRANCH}}#L23)
- **依据**：REACT_BEST_PRACTICES.md §一.1
- **问题**：useEffect 依赖数组缺少 userId，userId 变化时不会重新请求
- **建议**：
  ```javascript
  useEffect(() => { fetchData(userId); }, [userId]);
  ```
- **预期收益**：修复数据不同步的 bug

---

### 💡 改进建议（P2 - 可选）

**[P2-1] [建议类型]**
- **位置**：[src/components/Button.tsx]({{CODE_BASE_URL}}/file/detail?path=src/components/Button.tsx&branch={{BRANCH}})
- **依据**：REACT_BEST_PRACTICES.md §三.1（或标注 `(待确认)` 表示需要确认）
- **建议**：用 `React.memo` 包裹纯展示组件，减少不必要的重渲染

---

### 📊 整体评估

| 维度 | 评分 | 主要发现 |
|------|------|---------|
| 安全性 | ⭐⭐⭐⭐☆ | （有无 XSS/密钥/注入风险） |
| 性能 | ⭐⭐⭐⭐☆ | （有无 N+1/无用重渲染/整包引入） |
| 鲁棒性 | ⭐⭐⭐⭐☆ | （边界处理/loading-error 状态/异常处理） |
| 代码复用 | ⭐⭐⭐⭐☆ | （有无重复逻辑/可参数化硬编码） |
| 架构合规 | ⭐⭐⭐⭐☆ | （职责是否清晰/有无跨层依赖） |
| 可维护性 | ⭐⭐⭐⭐☆ | （魔法数字/配置耦合/扩展点设计） |

**合并结论**：[P0 问题数量] 个 P0 阻塞项 / [合并建议一句话]

---

### 🔁 Skill 反馈（仅在有信号时填写）

> 此区块帮助 Skill 持续进化，无内容可删除此节。

- **误报**：（本次 AI 报了但开发者确认没问题的项，简述原因）
- **漏报**：（本次审查中提到的历史坑/真实 bug，AI 未能识别）
- **新模式**：（代码中发现的值得加入知识库的新问题模式）
