# 异步编程最佳实践

## 目录
1. [永远pending的Promise](#永远pending的promise)
2. [async函数中忘记await](#async函数中忘记await)
3. [Promise错误处理](#promise错误处理)

---

## 1. 永远pending的Promise

### 问题描述

Promise如果既不resolve也不reject，会永远处于pending状态，导致：
- await一直等待，程序卡住
- Promise.all永远不会完成
- 内存泄漏（Promise对象无法释放）

### 团队真实案例

#### BadCase（2024-XX月线上事故）
```javascript
// 获取用户位置
function getLocation() {
  return new Promise(function (resolve, reject) {
    KNB.getLocation({
      success(location) {
        if (location.lat) {
          resolve(location);
        }
        // ❌ 如果 lat=0，什么都不做
        // Promise永远pending！
      }
    });
  });
}

// 使用
async function showMap() {
  const location = await getLocation(); // ❌ 如果lat=0，永远等待
  renderMap(location);
}
```

**结果：**
- 用户在赤道附近（lat=0, lng≠0）
- 地图页面永远loading
- 用户无法使用地图功能
- 影响用户：约200人/天

### 正确做法
```javascript
// ✅ 方案1: 完整的resolve/reject
function getLocation() {
  return new Promise(function (resolve, reject) {
    KNB.getLocation({
      success(location) {
        if (location.lat !== undefined && location.lng !== undefined) {
          resolve(location);
        } else {
          reject(new Error('Invalid location'));
        }
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

// ✅ 方案2: 添加超时保护
function getLocationWithTimeout(timeout = 5000) {
  return Promise.race([
    getLocation(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Location timeout')), timeout)
    )
  ]);
}

// 使用
async function showMap() {
  try {
    const location = await getLocationWithTimeout();
    renderMap(location);
  } catch (error) {
    console.error('Failed to get location:', error);
    // 兜底：使用默认位置
    renderMap({ lat: 39.9, lng: 116.4 }); // 北京
  }
}
```

### 检查清单

审查Promise代码时，必查：

- [ ] **所有分支都有resolve或reject？**
```javascript
  new Promise((resolve, reject) => {
    if (condition1) {
      resolve(value1);
    } else if (condition2) {
      resolve(value2);
    } else {
      // ❌ 缺少else分支的处理
      // ✅ 应该添加: reject(new Error('Unknown condition'))
    }
  });
```

- [ ] **success/fail回调都处理了？**
```javascript
  new Promise((resolve, reject) => {
    someAsyncAPI({
      success: resolve,
      fail: reject  // ✅ 不要忘记fail
    });
  });
```

- [ ] **是否需要超时保护？**
  - 网络请求：建议5-10秒
  - 用户交互：建议30秒
  - 长时间操作：明确告知用户

### 自动检测（ESLint规则）

创建自定义规则检测：
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-pending-promise': 'error'
  }
};

// 规则实现（简化版）
// 检测Promise构造函数中是否所有代码路径都有resolve/reject
```

---

## 2. async函数中忘记await

### 问题描述

async函数返回Promise，如果忘记await，会导致：
- 拿到Promise对象而非异步结果
- 条件判断永远为true（Promise是对象，truthy）
- 异步操作错误被忽略

### 团队真实案例

#### BadCase（2024-XX月线上事故）
```javascript
// 检查群消息权限
async function myController(ctx) {
  const list = ['123'];

  // ❌ check()返回Promise，不是boolean
  return ctx.service.groupMessage.check() && list.length > 0;
  
  // 实际返回：
  // Promise { <pending> } && true
  // = Promise对象（truthy）
  // 永远返回Promise对象，而不是boolean！
}

// 使用
if (await myController(ctx)) {
  sendMessage(); // ✅ 这里会正常工作，因为await了
}

// 但如果没有await
if (myController(ctx)) {
  sendMessage(); // ❌ 永远执行（Promise是truthy）
}
```

**结果：**
- 权限校验失败，但依然发送消息
- 未授权用户可以发送群消息
- 发现时已发送500+条违规消息

### 正确做法
```javascript
// ✅ 方案1: 正确使用await
async function myController(ctx) {
  const list = ['123'];
  
  // 先await获取结果
  const checkResult = await ctx.service.groupMessage.check();
  
  // 再用结果做判断
  return checkResult && list.length > 0;
}

// ✅ 方案2: 类型提示（TypeScript）
async function check(): Promise<boolean> {
  // ...
}

async function myController(ctx) {
  const list = ['123'];
  
  // TypeScript会提示：
  // Operator '&&' cannot be applied to types 'Promise<boolean>' and 'boolean'
  return ctx.service.groupMessage.check() && list.length > 0;
  //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 
  //     类型错误！
}
```

### 检查清单

审查async/await代码时，必查：

- [ ] **async函数调用是否有await？**
```javascript
  // ❌ 没有await
  const result = asyncFunction();
  
  // ✅ 有await
  const result = await asyncFunction();
```

- [ ] **Promise在条件判断中是否await了？**
```javascript
  // ❌ Promise对象做判断
  if (asyncCheck() && someCondition) { }
  
  // ✅ await后再判断
  const checkResult = await asyncCheck();
  if (checkResult && someCondition) { }
```

- [ ] **Promise.all/race中的Promise是否都正确？**
```javascript
  // ❌ 忘记调用（缺少括号）
  await Promise.all([
    fetchUser,     // 这是函数，不是Promise
    fetchOrders()  // 这才是Promise
  ]);
  
  // ✅ 正确
  await Promise.all([
    fetchUser(),
    fetchOrders()
  ]);
```

### 自动检测
```bash
# ESLint规则
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error",
    "require-await": "error"
  }
}
```
```bash
# 脚本检测（正则搜索）
grep -rn "return.*\\..*() &&" src/
# 查找 "return xxx() && yyy" 模式
# 手工review是否忘记await
```

---

## 3. Promise错误处理

### 最佳实践汇总
```javascript
// ✅ 完整的错误处理模式
async function robustAsyncOperation() {
  try {
    // 1. 超时保护
    const result = await Promise.race([
      actualOperation(),
      timeout(5000)
    ]);
    
    // 2. 结果验证
    if (!result || !result.data) {
      throw new Error('Invalid result');
    }
    
    return result.data;
    
  } catch (error) {
    // 3. 错误分类处理
    if (error.code === 'TIMEOUT') {
      console.error('Operation timeout');
      // 上报监控
      Sentry.captureException(error);
      // 返回兜底值
      return getDefaultValue();
    }
    
    if (error.code === 'NETWORK_ERROR') {
      console.error('Network error');
      // 提示用户检查网络
      showNetworkError();
      return null;
    }
    
    // 4. 未知错误
    console.error('Unknown error:', error);
    Sentry.captureException(error);
    throw error; // 或返回默认值
  }
}

// 超时工具函数
function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject({ code: 'TIMEOUT' }), ms)
  );
}
```

---

## 团队规范总结

### 强制规则

1. ✅ **所有Promise必须有reject分支**
2. ✅ **async函数调用必须await**
3. ✅ **长时间异步操作必须有超时**
4. ✅ **Promise错误必须处理（try-catch或.catch）**

### 推荐规则

1. 💡 使用TypeScript，利用类型检查
2. 💡 封装统一的异步工具函数
3. 💡 重要异步操作上报监控
4. 💡 提供用户友好的错误提示

### 工具支持

- ESLint: `@typescript-eslint/no-floating-promises`
- ESLint: `require-await`
- 自定义脚本: `scripts/check-async-patterns.sh`

---

## 真实事故案例库

详见：[examples/async-incidents.md](examples/async-incidents.md)
