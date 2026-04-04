# 团队线上事故案例库

> 每个案例都有真实的线上 COE 记录。CR 时发现相似模式，直接引用对应事故作为佐证。

---

## 案例1：幻影依赖导致页面白屏

**COE**：[#186065](https://coe.mws.sankuai.com/detail/186065) — 2022年3月，MTA后台营销叠加设置功能故障，持续约48小时，影响15000+用户

**代码问题**：
```javascript
import _ from 'lodash'; // ❌ package.json 未显式声明，依赖 some-ui-lib 间接引入
export function formatPrice(price) {
  return _.round(price, 2);
}
```

**触发**：`some-ui-lib` 升级 3.0 后移除了对 lodash 的间接依赖，lodash 不再被安装，20+ 页面白屏。

**修复**：显式在 `package.json` 中声明所有直接使用的包。

**CR 检查点**：代码中 import 的每个包，是否都在 `package.json` `dependencies` 或 `devDependencies` 中**显式声明**？

---

## 案例2：Promise 永远 pending 导致页面卡死

**COE**：[#199127](https://coe.mws.sankuai.com/detail/199127) — 2022年6月，医美预付退款页面部分用户无法打开，持续约8天

**代码问题**：
```javascript
function getLocation() {
  return new Promise((resolve, reject) => {
    KNB.getLocation({
      success(location) {
        if (location.lat) {  // ❌ lat=0 时为 falsy，什么都不做，Promise 永远 pending
          resolve(location);
        }
      }
      // ❌ 没有 fail 回调
    });
  });
}
```

**修复**：
```javascript
function getLocation() {
  return new Promise((resolve, reject) => {
    KNB.getLocation({
      success(location) {
        if (location.lat !== undefined && location.lng !== undefined) {
          resolve(location);
        } else {
          reject(new Error('Invalid location'));
        }
      },
      fail: reject
    });
  });
}
```

**CR 检查点**：Promise 构造函数中，所有条件分支是否都有 resolve 或 reject？success/fail 两个回调是否都处理了？

---

## 案例3：switch-case 缺少 break 导致逻辑穿透

**COE**：[#260045](https://coe.mws.sankuai.com/detail/260045)

**代码问题**：
```javascript
switch (moduleType) {
  case 'address':
    config = getAddressConfig();
    // ❌ 缺少 break，穿透到下一个 case
  case 'payment':
    config = getPaymentConfig(); // 上门地址模块也会执行到这里，配置被覆盖
    break;
}
```

**CR 检查点**：switch 的每个非空 case 是否都有 break 或 return？

---

## 案例4：async 函数忘记 await 导致权限校验失效

**COE**：[#182530](https://coe.mws.sankuai.com/detail/182530) — 约7-10个项目无法正常部署，持续约22小时

**代码问题**：
```javascript
async function myController(ctx) {
  const list = ['123'];
  // ❌ check() 返回 Promise，未 await 直接做 && 判断
  // Promise 对象是 truthy，永远返回 true，权限校验形同虚设
  return ctx.service.groupMessage.check() && list.length > 0;
}
```

**修复**：
```javascript
async function myController(ctx) {
  const list = ['123'];
  const checkResult = await ctx.service.groupMessage.check();
  return checkResult && list.length > 0;
}
```

**CR 检查点**：返回 Promise 的函数调用，是否有 await？禁止直接拿 Promise 对象做条件判断（永远为 truthy）。

---

## 案例5：JSON.parse 未保护导致渲染阻断

**COE**：[#199603](https://coe.mws.sankuai.com/detail/199603) — 2022年6月，IM PC端商品气泡消息不显示，持续约7天

**代码问题**：
```javascript
// ❌ 后端缺少 content 字段时，JSON.parse 报错，后续渲染全部阻断
const data = JSON.parse(message.content);
renderMessage(data);
```

**修复**：
```javascript
let data = null;
try {
  data = JSON.parse(message.content);
} catch (e) {
  console.error('消息解析失败:', e, message);
  data = { type: 'unknown' }; // 兜底，不阻断渲染
}
renderMessage(data);
```

**CR 检查点**：所有 `JSON.parse` 是否有 try-catch？catch 里是否有兜底处理而不是空块？

---

## 案例6：浮点数精度导致退款资损

**COE**：[#240949](https://coe.mws.sankuai.com/detail/240949) — 2023年4月，代金券面值计算错误（16.9元→16.89元），资损¥5万+

**代码问题**：
```javascript
const voucherAmount = 16.9;
const discountedAmount = voucherAmount * 0.9; // ❌ = 15.209999999999999
// 四舍五入后产生错误金额
```

**修复**：
```javascript
// ✅ 整数运算（分为单位）
const voucherAmountCents = 1690;
const discountedCents = Math.floor(voucherAmountCents * 90 / 100); // 1521分
const display = discountedCents / 100; // 15.21元

// ✅ 或用 decimal.js
import Decimal from 'decimal.js';
new Decimal(16.9).mul(0.9).toFixed(2); // "15.21"
```

**CR 检查点**：涉及金额/积分/折扣的计算，是否使用整数（分）或 decimal.js？

---

## 案例7：Vue/React 组件默认值箭头函数写法错误

**COE**：无（规范问题，CR 中频繁出现）

**代码问题**：
```javascript
// ❌ Vue props 默认值
default: () => {}  // 这是函数体，返回 undefined！

// ❌ React 参数默认值
function MyComp({ config = () => {} }) {
  config.theme; // TypeError: Cannot read property 'theme' of undefined
}
```

**修复**：
```javascript
// ✅ Vue：圆括号包裹对象字面量
default: () => ({})

// ✅ React：直接用对象字面量
function MyComp({ config = {} }) {}
```

**CR 检查点**：箭头函数返回对象字面量时，必须用圆括号包裹 `() => ({})`。

---

## 事故统计

| 类型 | COE | 次数 | 典型影响用户数 | 资损 |
|------|-----|------|-------------|------|
| 幻影依赖 | #186065 | 3次 | 15000+ | — |
| Promise pending | #199127 | 5次 | 8000+ | — |
| 忘记 await | #182530 | 4次 | 多项目部署失败 | — |
| JSON.parse 未保护 | #199603 | 2次 | 2000+ | — |
| switch 缺 break | #260045 | 2次 | 3000+ | — |
| 浮点数计算 | #240949 | 1次 | 500+ | ¥5万 |
