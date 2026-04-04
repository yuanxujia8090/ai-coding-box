# JavaScript CR 关键规则

> 只包含需要语义理解的规则，ESLint / Prettier 静态检查覆盖的格式问题不在此列。

## 📋 本文规则速查索引（先扫此表，按需读详细章节）

| 章节 | 规则 | 级别 | 快速识别特征 |
|------|------|------|------------|
| §一.1 | Promise 分支不完整 | P0 | `new Promise` 内有 `if` 无 `else` resolve/reject |
| §一.2 | Promise 对象做条件判断 | P0 | 异步调用后直接 `&&`/`if`/`return`，无 `await` |
| §一.3 | async 无实质 await | P1 | `async function` 体内无 `await` |
| §二.1 | 数字0/空串 falsy 陷阱 | P0 | `if (count)` 当 count 可能为 0 时 |
| §二.2 | isNaN 替代 Number.isNaN | P1 | 全局 `isNaN()` 调用 |
| §三.1 | 修改函数入参 | P1 | 函数内 `param.xxx = ...` 或 `Object.assign(param, ...)` |
| §三.2 | 箭头函数返回对象未加括号 | P1 | `() => { key: val }` 而非 `() => ({ key: val })` |
| §四 | switch 缺 break | P0 | case 末尾无 break/return（见速查卡 G7） |
| §五 | JSON.parse 无 try-catch | P0 | 裸调 `JSON.parse(...)` |
| §六 | 金额浮点运算 | P0 | 含 price/amount 字段直接做乘除（见速查卡 G6） |
| §七 | 变量遮蔽 | P1 | catch/回调中变量名与外层同名 |
| §八 | 魔法数字 | P1 | 条件中 `=== 1`/`=== 3` 等无语义数字 |
| §八.五 | Promise.all 漏括号 | P1 | `Promise.all([fn, fn()])` 混用引用和调用 |

---

## 一、Promise / 异步陷阱（🔴 P0 级别）

### 1.1 Promise 构造函数：所有分支必须 resolve 或 reject

```javascript
// ❌ lat=0 时为 falsy，进入 if 失败，Promise 永远 pending → 页面卡死
// 参考团队案例：COE #199127，医美退款页面卡死8天
function getLocation() {
  return new Promise((resolve, reject) => {
    KNB.getLocation({
      success(location) {
        if (location.lat) {  // ❌ 0 是有效经度，但 falsy！
          resolve(location);
        }
        // ❌ else 分支：Promise 悬空，永不 resolve/reject
      }
      // ❌ 没有 fail 回调：错误情况也永远 pending
    });
  });
}

// ✅ 所有分支都有出口
function getLocation() {
  return new Promise((resolve, reject) => {
    KNB.getLocation({
      success(location) {
        if (location.lat !== undefined && location.lng !== undefined) {
          resolve(location);
        } else {
          reject(new Error('Invalid location data'));
        }
      },
      fail: reject, // ❌ 不能省略
    });
  });
}
```

**CR 检查点**：Promise 构造函数中，`resolve`/`reject` 是否覆盖了 **所有条件分支**（含 else）？`success`/`fail` 两个回调是否都处理了？

---

### 1.2 禁止将 Promise 对象直接用于条件判断

```javascript
// ❌ Promise 对象是 truthy，永远返回 true，权限校验失效
// 参考团队案例：COE #182530，多项目部署失败22小时
async function myController(ctx) {
  return ctx.service.groupMessage.check() && list.length > 0;
  //     ^^^^ 忘记 await，这里是 Promise 对象，不是 boolean！
}

// ✅ 必须 await
async function myController(ctx) {
  const checkResult = await ctx.service.groupMessage.check();
  return checkResult && list.length > 0;
}
```

**CR 检查点**：返回 Promise 的函数调用，是否都有 `await`？禁止直接将 Promise 对象用于 `&&`、`||`、`if` 条件判断。

---

### 1.3 async 函数里必须有实质性的 await

```javascript
// ❌ 不必要的 async，既浪费资源又误导调用方
async function formatName(name) {
  return name.trim().toUpperCase(); // 纯同步，为何 async？
}

// ❌ 忘记 await，async 形同虚设
async function loadAndProcess() {
  const data = fetchData(); // 返回 Promise，忘记 await
  return process(data);     // data 是 Promise，不是数据！
}

// ✅ 有真正的异步操作才用 async
async function loadAndProcess() {
  const data = await fetchData();
  return process(data);
}
```

**CR 检查点**：`async` 函数体内是否有至少一个有意义的 `await`？如果没有，去掉 `async`。

---

## 二、真值判断陷阱（🔴 P0 级别）

### 2.1 数字 0 / 空字符串的 falsy 陷阱

```javascript
// ❌ 0 是有效业务值，但 if (count) 把它当成 "没有数据"
function renderCount(count) {
  if (count) {
    showCount(count);
  } else {
    showEmpty(); // count = 0 时错误地显示空态！
  }
}

// ✅ 明确判断 undefined/null，而不是 falsy
function renderCount(count) {
  if (count != null) {  // count = 0 时也会正常显示
    showCount(count);
  } else {
    showEmpty();
  }
}

// ❌ 字符串 "0" 是 truthy，但 Number("0") 是 falsy，混用类型导致难以预测的判断
const value = "0";
if (value) { /* 进入此分支 */ }
if (Number(value)) { /* 不进入此分支 */ }
```

**CR 检查点**：条件判断中，当变量可能为数字 `0`、空字符串 `""`、或 `false` 时，是否明确用 `=== 0`、`=== ""`、`!== null`，而非依赖 falsy 隐式转换？

---

### 2.2 使用 Number.isNaN 而非全局 isNaN

```javascript
// ❌ 全局 isNaN 会先做类型转换，行为隐蔽
isNaN('1.2');    // false → '1.2' 被转成数字，不是 NaN！
isNaN('hello'); // true

// ✅ Number.isNaN 不做类型转换，语义精确
Number.isNaN('hello'); // false → 字符串不是 NaN，是字符串
Number.isNaN(NaN);     // true ← 唯一正确的 NaN
Number.isNaN(Number('hello')); // true ← 先转换再判断
```

**CR 检查点**：所有 `isNaN()`/`isFinite()` 调用，替换为 `Number.isNaN()`/`Number.isFinite()`。

---

## 三、函数副作用（🟡 P1 级别）

### 3.1 禁止直接修改函数入参对象

```javascript
// ❌ 修改了调用方传入的对象，产生隐蔽副作用
function processUser(user) {
  user.role = 'admin'; // 调用方的对象也被改了！
  user.updatedAt = Date.now();
  return user;
}

// ❌ Object.assign 第一个参数是 target，会修改 original
const merged = Object.assign(original, newData); // original 被改了！

// ✅ 使用展开运算符创建新对象
function processUser(user) {
  return { ...user, role: 'admin', updatedAt: Date.now() };
}

// ✅ 第一个参数用空对象
const merged = Object.assign({}, original, newData);
const merged2 = { ...original, ...newData };
```

**CR 检查点**：函数内是否直接给入参对象的属性赋值？`Object.assign` 的第一个参数是否为原始引用？

---

### 3.2 箭头函数返回对象字面量必须用圆括号包裹

```javascript
// ❌ 花括号被解析为函数体，而非对象字面量，返回 undefined
const getConfig = () => { timeout: 5000 };   // 函数体，不是对象！
const items = list.map(item => { id: item.id }); // 同上

// ❌ React 组件 props 默认值的同款错误
function MyComp({ config = () => {} }) {
  config.theme; // TypeError: config 是函数不是对象
}

// ✅ 圆括号包裹对象字面量
const getConfig = () => ({ timeout: 5000 });
const items = list.map(item => ({ id: item.id }));

// ✅ React props 默认值直接用对象
function MyComp({ config = {} }) {
  config.theme; // 安全
}
```

**CR 检查点**：箭头函数隐式返回对象时（无 `return` 关键字），是否有 `({...})` 圆括号包裹？

---

## 四、Switch 穿透（🔴 P0 级别）

### 4.1 每个非空 case 必须有 break 或 return

```javascript
// ❌ 缺少 break，逻辑穿透导致配置被覆盖
// 参考团队案例：COE #260045
switch (moduleType) {
  case 'address':
    config = getAddressConfig();
    // ❌ 没有 break，执行到 payment case！
  case 'payment':
    config = getPaymentConfig(); // 上门地址也执行了这里
    break;
}

// ✅ 每个非空 case 都有明确出口
switch (moduleType) {
  case 'address':
    config = getAddressConfig();
    break; // ← 必须有
  case 'payment':
    config = getPaymentConfig();
    break;
  default:
    config = getDefaultConfig();
}
```

**CR 检查点**：`switch` 语句中，每个含执行逻辑的 `case` 是否都有 `break`、`return` 或 `throw`？意图穿透时需加注释 `// falls through`。

---

## 五、JSON 解析防护（🔴 P0 级别）

### 5.1 JSON.parse 必须有 try-catch 保护

```javascript
// ❌ 后端数据格式异常时，JSON.parse 抛出异常，后续渲染全部阻断
// 参考团队案例：COE #199603，商品气泡消息不显示7天
const data = JSON.parse(message.content);
renderMessage(data);

// ✅ 用 try-catch 保护，且 catch 块不能为空
let data = null;
try {
  data = JSON.parse(message.content);
} catch (e) {
  console.error('消息内容解析失败:', e, message); // ← 必须记录日志
  data = { type: 'unknown' }; // ← 兜底数据，不阻断渲染
}
renderMessage(data);
```

**CR 检查点**：所有 `JSON.parse()` 调用是否有 `try-catch`？`catch` 块是否有日志记录和兜底处理（不能是空块）？

---

## 六、金额计算精度（🔴 P0 级别）

### 6.1 涉及金额/积分/折扣禁止直接使用浮点数运算

```javascript
// ❌ 浮点数精度导致金额计算错误
// 参考团队案例：COE #240949，资损¥5万
const amount = 16.9;
const discounted = amount * 0.9; // = 15.209999999999999，四舍五入后出错！

// ✅ 方案1：以分为单位进行整数运算
const amountCents = 1690;
const discountedCents = Math.floor(amountCents * 90 / 100); // = 1521
const display = discountedCents / 100; // = 15.21

// ✅ 方案2：使用 decimal.js 精确计算
import Decimal from 'decimal.js';
const result = new Decimal(16.9).mul(0.9).toFixed(2); // "15.21"
```

**CR 检查点**：涉及金额、积分、折扣的四则运算，是否使用整数（分）或 `decimal.js`？禁止直接对浮点数做乘除运算后四舍五入。

---

## 七、变量遮蔽（🟡 P1 级别）

### 7.1 禁止在嵌套作用域中声明与外层同名的变量

```javascript
// ❌ 内层 error 遮蔽了外层 error，导致外层 catch 使用了错误的变量
let error = null;
try {
  await fetchData();
} catch (error) {     // ← 遮蔽了外层 error！
  logError(error);    // 这里 error 是新的
}
setError(error);      // 这里 error 是外层的 null，不是刚才的错误！

// ✅ 用不同的变量名
let capturedError = null;
try {
  await fetchData();
} catch (fetchError) {
  logError(fetchError);
  capturedError = fetchError;
}
setError(capturedError);
```

**CR 检查点**：`catch (e)` 中的 `e`、循环变量、回调参数，是否与外层作用域变量同名？特别关注 `catch` 参数遮蔽外层变量的场景。

---

## 八、魔法数字（🟡 P1 级别）

### 8.1 业务逻辑中的魔法数字必须定义为常量

```javascript
// ❌ 魔法数字，无法理解含义，也无法全局修改
if (status === 3) {
  showRefundButton();
}
setTimeout(retry, 5000);

// ✅ 有意义的常量名
const ORDER_STATUS = {
  PENDING: 1,
  PAID: 2,
  REFUNDING: 3,
  COMPLETED: 4,
};
const RETRY_DELAY_MS = 5000;

if (status === ORDER_STATUS.REFUNDING) {
  showRefundButton();
}
setTimeout(retry, RETRY_DELAY_MS);
```

**CR 检查点**：条件判断、数组索引、延时时间、比例系数等硬编码数字，是否定义为具名常量？特别关注业务状态码。

---

## 八点五、Promise.all 漏掉括号（🟡 P1）

```javascript
// ❌ 漏掉括号 → 传入的是函数引用，不是 Promise 对象，永远不会执行
await Promise.all([
  fetchUser,    // ← 函数，不是 Promise！
  fetchOrders() // ← 这个才对
]);

// ✅ 所有元素都是调用结果
await Promise.all([
  fetchUser(),
  fetchOrders()
]);

// ✅ 需要超时保护的场景
const TIMEOUT_MS = 5000;
await Promise.all([
  Promise.race([fetchUser(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))]),
  fetchOrders()
]);
```

**CR 检查点**：`Promise.all([...])` 数组内的每一项是否都有 `()`？特别检查从对象方法引用时（`service.fetch` vs `service.fetch()`）。

---

## 九、高频 CR 问题速查

| 问题 | 严重程度 | 快速识别 |
|------|---------|---------|
| Promise 分支不完整 | P0 | `new Promise` 内有 `if` 但无 `else` 的 resolve/reject |
| Promise 对象做条件判断 | P0 | `await` 缺失，直接 `&&`/`if` 判断异步调用结果 |
| async 无 await | P1 | `async function` 体内无 `await` |
| 数字0/空串的 falsy 陷阱 | P0 | `if (count)` 而非 `if (count != null)` |
| 修改函数入参 | P1 | `param.xxx = ...` 或 `Object.assign(param, ...)` |
| 箭头函数返回对象未加括号 | P1 | `() => { key: val }` 而非 `() => ({ key: val })` |
| switch 缺 break | P0 | case 末尾无 break/return |
| JSON.parse 无 try-catch | P0 | 裸调 `JSON.parse(...)` |
| 浮点数计算金额 | P0 | 金额直接 `* 0.x` 运算 |
| isNaN 替代 Number.isNaN | P1 | 全局 `isNaN()` 调用 |
| 变量遮蔽 | P1 | catch/回调中变量名与外层同名 |
| 魔法数字 | P1 | `=== 1`/`=== 3` 等无命名数字 |
