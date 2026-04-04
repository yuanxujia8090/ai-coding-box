# 前端安全模式

> 前端 CR 安全审查重点：XSS > CSRF > 敏感信息泄露。SQL 注入是后端问题，前端不纳入常规检查。
> 每个问题都给出**运行时后果**，便于判断严重程度。

---

## 一、XSS（跨站脚本攻击）🔴 P0

### 1.1 dangerouslySetInnerHTML 直接插入用户数据

```jsx
// ❌ 攻击者输入 <script>document.cookie 发到攻击者服务器</script>
// 运行时后果：用户 Cookie / Token 被盗取，账号被接管
function Comment({ content }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
  //                                            ^^^^^^^ 直接插入用户数据！
}

// ✅ 方案1：纯文本展示（最安全）
function Comment({ content }) {
  return <div>{content}</div>; // React 自动转义
}

// ✅ 方案2：必须渲染 HTML 时，先用 DOMPurify 净化
import DOMPurify from 'dompurify';
function Comment({ content }) {
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'], // 只允许安全标签
    ALLOWED_ATTR: [],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**CR 检查点**：所有 `dangerouslySetInnerHTML` 的 `__html` 值是否来自用户输入或接口数据？如果是，必须经过 `DOMPurify.sanitize`。

---

### 1.2 innerHTML / outerHTML 直接写入

```javascript
// ❌ 等价于 dangerouslySetInnerHTML，但在原生 DOM 操作中更隐蔽
// 运行时后果：同上，XSS 执行任意脚本
element.innerHTML = userInput;          // ❌
element.outerHTML = `<div>${data}</div>`; // ❌
document.write(userInput);              // ❌ 更危险，直接写文档流

// ✅ 使用安全的 DOM API
element.textContent = userInput;   // 纯文本，安全
element.setAttribute('data-x', userInput); // 属性赋值，安全
element.appendChild(document.createTextNode(userInput)); // 创建文本节点，安全
```

---

### 1.3 href / src 属性注入

```jsx
// ❌ javascript: 伪协议执行脚本
// 运行时后果：用户点击链接时执行攻击者代码
function UserLink({ url }) {
  return <a href={url}>点击</a>; // url = "javascript:alert(document.cookie)"
}

// ✅ 验证 URL 协议
function UserLink({ url }) {
  const isSafe = url.startsWith('http://') || url.startsWith('https://');
  if (!isSafe) return <span>无效链接</span>;
  return <a href={url} rel="noopener noreferrer">点击</a>;
}

// ❌ img src 也可以注入
<img src={userProvidedUrl} />  // onerror 事件可触发脚本

// ✅ 白名单域名校验
function Avatar({ src }) {
  const ALLOWED_DOMAINS = ['cdn.yoursite.com', 'img.yoursite.com'];
  try {
    const { hostname } = new URL(src);
    if (!ALLOWED_DOMAINS.includes(hostname)) return <img src="/default-avatar.png" />;
  } catch {
    return <img src="/default-avatar.png" />;
  }
  return <img src={src} alt="avatar" />;
}
```

---

### 1.4 eval / new Function / setTimeout(string) 执行字符串

```javascript
// ❌ 直接执行字符串 → 任意代码执行
// 运行时后果：完全的代码执行权限，最严重的 XSS
eval(userInput);
new Function('x', userInput)();
setTimeout(userInput, 0);   // 字符串形式的 setTimeout 等同于 eval
setInterval(userInput, 100); // 同上

// ✅ 用具体函数替代字符串执行
setTimeout(() => doSomething(), 0);  // 函数形式，安全
```

**CR 检查点**：`eval`/`new Function`/`setTimeout(string)` 是否存在？如存在，是否有充分理由？这是 P0 中的 P0。

---

## 二、敏感信息泄露 🔴 P0

### 2.1 硬编码密钥 / Token

```javascript
// ❌ 以下都是 P0，任何人看到源码（包括编译后的 bundle）都能拿到
const API_KEY = 'sk-1234567890abcdef';         // OpenAI Key
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9...'; // JWT
const OSS_SECRET = 'AKID1234567890ABCDEF';       // 云存储密钥
const DB_PASSWORD = 'password123';              // 数据库密码

// ✅ 方案1：通过后端接口获取，不在前端存放
const { apiKey } = await getSecretFromServer();

// ✅ 方案2：构建期注入环境变量（只限非敏感的公共配置）
const BASE_URL = process.env.REACT_APP_API_URL; // 公共 URL，可以
// 注意：process.env 在构建后会被内联到 bundle，仍然公开
// 真正的密钥永远不放到前端
```

**运行时后果**：bundle 被任何人下载并查看，密钥立即泄露，接口被滥用/数据泄露。

---

### 2.2 敏感数据存储在 localStorage

```javascript
// ❌ localStorage 可被同域所有 JS（含 XSS 注入的脚本）读取
localStorage.setItem('token', userToken);         // ❌ 身份凭证
localStorage.setItem('idCard', '330104****1234'); // ❌ 身份证号
localStorage.setItem('creditCard', '4111****');  // ❌ 银行卡

// ✅ Token：用 HttpOnly Cookie（后端设置，JS 无法读取）
// ✅ 敏感状态：存 sessionStorage（关闭 Tab 自动清除）+ 短有效期
// ✅ 非必要：不在前端存储 PII（个人身份信息）
```

---

## 三、CSRF（跨站请求伪造）🟡 P1

### 3.1 前端 CSRF 防护要点

CSRF 主要是后端防御，前端配合：

```javascript
// ✅ axios 请求自动携带 CSRF Token（常见配置）
import axios from 'axios';

// 从 Cookie 读取 CSRF Token（后端种入）
function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrfToken='))
    ?.split('=')[1];
}

// 在请求头中携带
axios.defaults.headers.common['X-CSRF-Token'] = getCsrfToken();

// ❌ 危险的第三方 POST 表单（被利用为 CSRF 攻击载体）
<form action="https://your-api.com/transfer" method="POST">
  <input type="hidden" name="amount" value="10000" />
  <input type="submit" />
</form>
// 攻击者可以把这个表单放在任意页面，诱导用户点击
```

**CR 检查点**：是否有不带 CSRF Token 的状态变更请求（POST/PUT/DELETE）？表单 action 是否指向自己域名？

---

## 四、快速安全扫描表

| 模式 | 风险 | 级别 |
|------|------|------|
| `dangerouslySetInnerHTML={{ __html: 变量 }}` | XSS | P0 |
| `element.innerHTML = 变量` | XSS | P0 |
| `eval(...)` / `new Function(...)` | 任意代码执行 | P0 |
| `href={userInput}` 未验证协议 | XSS | P0 |
| 硬编码 `key`/`token`/`secret`/`password` 字面量 | 密钥泄露 | P0 |
| 敏感信息存 `localStorage` | 数据泄露 | P1 |
| `setTimeout(string, n)` | XSS | P0 |
| POST 请求未携带 CSRF Token | CSRF | P1 |

> 自动化检测（`scripts/index.js`）已覆盖：硬编码密钥、innerHTML、eval。
> 以上表格帮助 AI 审查**自动检测遗漏的语义问题**（如动态构造的危险字符串）。
