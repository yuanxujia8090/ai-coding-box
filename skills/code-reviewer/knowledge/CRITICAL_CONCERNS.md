# 五大核心关注点详解

## 为什么是这5个？

这是我们团队过去2年的线上事故分析总结：

| 关注点 | 历史事故次数 | 影响用户数 | 资损金额 | 排查时长 |
|--------|------------|-----------|---------|---------|
| 工程配置修改 | 8次 | 5000+ | 0 | 平均4小时 |
| 存量逻辑修改 | 12次 | 20000+ | 0 | 平均6小时 |
| 金额计算 | 3次 | 500+ | ¥50万 | 平均8小时 |
| 依赖升级 | 5次 | 10000+ | 0 | 平均3小时 |
| 异常处理 | 15次 | 8000+ | 0 | 平均5小时 |

**总计：43次线上事故，其中5次导致资损。**

这就是为什么我们把这5个作为P0必查项的原因！

---

## 1. 工程配置修改详解

### 为什么高风险？

**一个配置影响所有人：**
- webpack配置错误 → 所有人构建失败
- 环境变量遗漏 → 所有环境受影响
- CI/CD配置错误 → 无法部署

### 历史事故案例

#### 案例1：webpack publicPath配置错误（2024-03）

**背景：**
开发A在本地调试时修改了webpack.config.js的publicPath，从`/`改为`/app/`。

**代码变更：**
```javascript
// webpack.config.js
module.exports = {
  output: {
-   publicPath: '/',
+   publicPath: '/app/',
  }
}
```

**结果：**
- 提交后，其他5个开发者pull代码
- 本地开发环境全部报404（静态资源找不到）
- 耗时3小时排查（以为是自己环境问题）
- 最终发现是配置变更导致

**教训：**
1. 配置变更必须在PR中明确说明原因
2. 必须通知团队所有成员
3. 必须更新README.md

**预防措施：**
```bash
# scripts/check-config-changes.sh
# 自动检测配置文件变更并警告

CONFIG_FILES="webpack.config.js tsconfig.json .env package.json"

for file in $CONFIG_FILES; do
  if git diff --name-only origin/main | grep -q "$file"; then
    echo "⚠️  检测到配置文件变更: $file"
    echo "   请确保："
    echo "   1. 在PR描述中说明变更原因"
    echo "   2. 通知团队所有成员"
    echo "   3. 更新相关文档"
  fi
done
```

#### 案例2：环境变量缺失（2024-05）

[详细案例...]

---

## 2. 存量逻辑修改详解

### 为什么高风险？

**蝴蝶效应：**
- 一个判断条件变更，可能影响10个功能
- 一个状态流转变更，可能破坏整个业务流程

### 历史事故案例

#### 案例1：权限判断条件修改（2024-01）

**背景：**
需要增加"超级管理员"角色，开发B修改了权限判断逻辑。

**代码变更：**
```javascript
// 原代码 - 只有admin可以删除用户
function canDeleteUser(user) {
- return user.role === 'admin';
+ return user.role === 'admin' || user.role === 'super_admin';
}
```

**看起来没问题？但实际上：**

这个函数在项目中被15个地方调用：
1. 用户管理页面 - 显示删除按钮
2. 用户API - 删除用户接口
3. 批量操作 - 批量删除用户
4. 审计日志 - 记录删除操作
5. 数据导出 - 导出可删除用户列表
6. ... （还有10个地方）

**结果：**
- 只测试了用户管理页面
- 其他14个地方没有测试
- 上线后，数据导出功能出bug（没有处理super_admin角色）
- 审计日志记录错误
- 影响500+企业用户

**教训：**
1. 修改存量逻辑前，必须全局搜索所有调用处
2. 必须有完整的单元测试和集成测试
3. 必须考虑数据兼容性

**预防措施：**
```javascript
// ✅ 更好的做法：显式处理，而不是隐式修改
const ADMIN_ROLES = ['admin', 'super_admin'];

function canDeleteUser(user) {
  return ADMIN_ROLES.includes(user.role);
}

// 并补充完整的测试
describe('canDeleteUser', () => {
  it('should return true for admin', () => {
    expect(canDeleteUser({ role: 'admin' })).toBe(true);
  });
  
  it('should return true for super_admin', () => {
    expect(canDeleteUser({ role: 'super_admin' })).toBe(true);
  });
  
  it('should return false for regular user', () => {
    expect(canDeleteUser({ role: 'user' })).toBe(false);
  });
  
  it('should return false for undefined role', () => {
    expect(canDeleteUser({ role: undefined })).toBe(false);
  });
});
```

[更多案例...]

---

## 3. 金额计算详解

### 为什么高风险？

**资损 = 真金白银的损失！**

### 历史事故案例

#### 案例1：浮点数精度导致多退款（2023-12）

**背景：**
实现退款功能，使用浮点数计算退款金额。

**代码：**
```javascript
function calculateRefund(orderAmount, refundRate) {
  return orderAmount * refundRate; // ❌ 浮点数计算
}

// 实际使用
const refund = calculateRefund(299.9, 0.5); // 应该退149.95
console.log(refund); // 输出 149.95000000000002
```

**结果：**
- 系统四舍五入后退款150元（多退0.05元）
- 当天退款1000单
- 累计多退款50元

看起来不多？但是：
- 这个bug存在了3个月才发现
- 累计多退款 = 50元 × 90天 = 4500元
- 而且无法追回（已退到用户账户）

**教训：**
1. 金额计算必须使用整数（分为单位）
2. 必须有严格的单元测试，包含边界值
3. 必须与财务确认四舍五入规则

**正确做法：**
```javascript
// ✅ 使用整数计算（分为单位）
function calculateRefund(orderAmountCents, refundRate) {
  // 先计算，再取整
  return Math.floor(orderAmountCents * refundRate);
}

// 实际使用
const orderAmount = 29990; // 299.90元 = 29990分
const refund = calculateRefund(orderAmount, 0.5); // 14995分 = 149.95元

// 测试
describe('calculateRefund', () => {
  it('should handle standard case', () => {
    expect(calculateRefund(29990, 0.5)).toBe(14995);
  });
  
  it('should handle rounding down', () => {
    expect(calculateRefund(100, 0.33)).toBe(33); // 而不是33.33
  });
  
  it('should handle zero', () => {
    expect(calculateRefund(0, 0.5)).toBe(0);
  });
  
  it('should handle large numbers', () => {
    expect(calculateRefund(999999999, 0.5)).toBe(499999999);
  });
});
```

[更多案例...]
