# 金额计算完全指南

## 核心原则

### 原则1：永远使用整数

**为什么？**
- 浮点数在计算机中无法精确表示
- 0.1 + 0.2 = 0.30000000000000004

**怎么做？**
```javascript
// ❌ 错误：使用浮点数
const price = 19.99;
const discount = 0.8;
const final = price * discount; // 15.992

// ✅ 正确：使用整数（分为单位）
const priceCents = 1999; // 19.99元 = 1999分
const discountRate = 80; // 80%
const finalCents = Math.floor(priceCents * discountRate / 100); // 1599分
const finalYuan = finalCents / 100; // 15.99元
```

### 原则2：明确四舍五入规则

**常见规则：**
1. **向下取整（Floor）**：对用户有利
2. **向上取整（Ceil）**：对商家有利  
3. **四舍五入（Round）**：中间值
4. **银行家舍入**：四舍六入五成双

**必须与产品、财务确认使用哪种！**
```javascript
// 不同的舍入规则
const value = 1.5;

Math.floor(value);   // 1 - 向下取整
Math.ceil(value);    // 2 - 向上取整
Math.round(value);   // 2 - 四舍五入

// 银行家舍入（更公平）
function bankersRound(num) {
  const rounded = Math.round(num);
  const diff = Math.abs(num - Math.floor(num));
  
  if (diff === 0.5) {
    // 如果恰好是0.5，看整数部分
    return Math.floor(num) % 2 === 0 
      ? Math.floor(num)  // 偶数，向下
      : Math.ceil(num);   // 奇数，向上
  }
  
  return rounded;
}

bankersRound(0.5);  // 0 （0是偶数，向下）
bankersRound(1.5);  // 2 （1是奇数，向上）
bankersRound(2.5);  // 2 （2是偶数，向下）
```

### 原则3：边界值必须测试

**必测场景：**
- 零值：price = 0
- 负数：price = -100（是否允许负数？）
- 大数：price = 999999999（是否溢出？）
- 小数：price = 0.01（精度是否保留？）
```javascript
describe('calculateDiscount', () => {
  it('should handle zero price', () => {
    expect(calculateDiscount(0, 0.8)).toBe(0);
  });
  
  it('should reject negative price', () => {
    expect(() => calculateDiscount(-100, 0.8)).toThrow();
  });
  
  it('should handle large numbers', () => {
    expect(calculateDiscount(99999999, 0.5)).toBe(49999999);
  });
  
  it('should handle discount rate 0', () => {
    expect(calculateDiscount(100, 0)).toBe(0);
  });
  
  it('should handle discount rate 1', () => {
    expect(calculateDiscount(100, 1)).toBe(100);
  });
  
  it('should reject discount rate > 1', () => {
    expect(() => calculateDiscount(100, 1.5)).toThrow();
  });
});
```

## 真实案例库

### 案例1：双11活动算错优惠金额（2023年）

[详细案例...]

### 案例2：积分兑换时精度丢失（2024年）

[详细案例...]

[更多案例和详细说明...]
