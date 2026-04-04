# TypeScript CR 关键规则

> 只包含需要语义理解的规则，ESLint 静态检查覆盖的格式问题不在此列。

## 📋 本文规则速查索引

| 章节 | 规则 | 级别 | 快速识别特征 |
|------|------|------|------------|
| §一 | any 滥用 | P0 | 核心逻辑中 `: any` 或 `as any` |
| §二 | 类型断言无 guard | P0 | `as User` 之前无 `instanceof`/`in`/属性检查 |
| §二 | `?.!` 链 | P0 | `obj?.prop!` 链式使用可选链后再 `!` |
| §三 | async 函数未标注 Promise 返回类型 | P1 | `async function fn()` 无 `: Promise<T>` |
| §四 | enum 未显式初始化 | P1 | `enum Status { A, B }` 无数字赋值 |
| §四 | enum 混用数字/字符串 | P1 | 同一 enum 内既有 `= 1` 又有 `= 'x'` |
| §五 | interface 内用逗号而非分号 | P2 | `{ name: string, age: number }` |
| §五 | 覆盖父类方法缺 override | P1 | 子类方法与父类同名但无 `override` 关键字 |
| §六 | import type 缺失 | P1 | `import { SomeType }` 而非 `import type { SomeType }` |

---

## 一、any 类型使用规则（🔴 P0 级别）

### 1.1 核心逻辑禁止使用 any

```typescript
// ❌ 用 any 逃避类型检查，掩盖真实问题
function processOrder(data: any) {
  return data.price * data.quantity; // 运行时可能爆炸
}

// ✅ 定义具体接口
interface OrderData {
  price: number;
  quantity: number;
}
function processOrder(data: OrderData) {
  return data.price * data.quantity;
}
```

**合理使用 any 的场景**（需注释说明）：
- 第三方库无类型声明时的临时处理
- 类型体操中间步骤
- 迁移 JS → TS 的过渡代码（需标注 `// TODO: 补充类型`）

### 1.2 禁止访问 any 类型的成员

```typescript
// ❌ 从 any 上取属性，类型安全完全丧失
declare const response: any;
const userId = response.data.user.id; // 链式访问 any 极度危险

// ✅ 先断言或收窄类型
interface ApiResponse { data: { user: { id: string } } }
const typed = response as ApiResponse;
const userId = typed.data.user.id;
```

### 1.3 函数参数和返回值禁止涉及 any

```typescript
// ❌
function foo1() { return 1 as any; }
function foo2(data: any) { return data.value; }

// ✅ 导出函数必须显式标注参数类型和返回值类型
export function processData(data: UserData): ProcessedResult {
  return transform(data);
}
```

---

## 二、类型断言规则（🔴 P0 级别）

### 2.1 禁止无依据的类型断言

```typescript
// ❌ 直接断言，未验证数据结构，运行时可能崩溃
const user = apiResponse.data as User;
user.email.toLowerCase(); // 如果 email 实际是 undefined，报错

// ✅ 用类型守卫先验证
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'email' in data;
}
if (isUser(apiResponse.data)) {
  apiResponse.data.email.toLowerCase(); // 安全
}

// ✅ 或者用可选链 + 空值合并兜底
const email = (apiResponse.data as User)?.email ?? '';
```

### 2.2 禁止不必要的类型断言

```typescript
// ❌ 类型已知，多余断言
const foo = 3;
const bar = foo as number; // foo 已经是 number

// ❌ 连续非空断言
const val = obj!!!.prop;

// ✅ 只在必要时断言，且断言要有类型守卫支撑
```

### 2.3 禁止在可选链后使用非空断言

```typescript
// ❌ 语义矛盾：? 表示可能为空，! 表示一定不为空
foo?.bar!;
foo?.bar()!;

// ✅
foo?.bar ?? defaultValue;
```

---

## 三、异步类型规则（🟡 P1 级别）

### 3.1 返回 Promise 的函数必须标注返回类型

```typescript
// ❌ 未标注，调用方无法知道 resolve 类型
const fetchUser = () => Promise.resolve({ id: 1, name: 'Alice' });

// ✅ 明确标注
const fetchUser = (): Promise<User> => Promise.resolve({ id: 1, name: 'Alice' });

async function loadData(): Promise<DataResult> {
  const response = await api.get('/data');
  return response.data;
}
```

---

## 四、枚举规则（🟡 P1 级别）

### 4.1 枚举成员必须显式初始化，禁止混用数字和字符串

```typescript
// ❌ 隐式递增，改动顺序会导致值变化
enum Status {
  Open = 1,
  Close, // 隐式 = 2，脆弱
}

// ❌ 数字字符串混用
enum Mixed {
  A = 0,
  B = 'B', // 混用！
}

// ✅ 全部显式，全字符串（推荐）或全数字
enum Status {
  Open = 'Open',
  Close = 'Close',
  Pending = 'Pending',
}
```

### 4.2 枚举成员不能重复值

```typescript
// ❌ 两个成员值相同，逻辑错误
enum Direction {
  Up = 0,
  Down = 0, // 重复！
}

// ✅
enum Direction {
  Up = 0,
  Down = 1,
}
```

---

## 五、接口/类型规则（🟡 P1 级别）

### 5.1 类型导入必须用 import type

```typescript
// ❌ 运行时 import，但实际只用于类型
import { User } from './types';
const x: User = {};

// ✅ 编译时擦除，不影响 bundle
import type { User } from './types';
const x: User = {};
```

### 5.2 接口成员结尾用分号，不用逗号

```typescript
// ❌
interface Foo {
  name: string,
  age: number,
}

// ✅
interface Foo {
  name: string;
  age: number;
}
```

### 5.3 重写父类方法必须显式 override

```typescript
// ❌ 静默重写，重构时容易漏掉
class Child extends Base {
  setup() {} // 没有 override，不清楚是重写还是新增
}

// ✅
class Child extends Base {
  override setup() {}
}
```

---

## 六、模块规则（🟡 P1 级别）

### 6.1 导出时显式区分值和类型

```typescript
// ❌ 混合导出，不清楚哪些是类型
export { Button, ButtonProps };

// ✅ 类型单独 export type
export { Button };
export type { ButtonProps };
```

---

## 七、高频 CR 问题速查

| 问题 | 严重程度 | 快速识别 |
|------|---------|---------|
| 核心逻辑使用 any | P0 | `: any` / `as any` |
| 类型断言无守卫 | P0 | `as SomeType` 前无 isXxx 验证 |
| 可选链后非空断言 | P1 | `?.xxx!` |
| 枚举值未显式初始化 | P1 | 枚举成员无 `=` 赋值 |
| 返回 Promise 未标注类型 | P1 | `async function foo()` 无返回类型 |
| import 类型未用 import type | P1 | 只用于类型却用普通 import |
| 类属性未初始化 | P1 | 类属性声明后构造函数未赋值 |
