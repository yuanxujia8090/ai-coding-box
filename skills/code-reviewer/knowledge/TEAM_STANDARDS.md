# 团队代码规范

> 基于项目 README 整理的实际约定，是 Claude 判断"团队认为对的写法"的核心依据。
> 本文优先级高于通用规则——这个项目里"对的写法"以此为准。

---

## 一、命名规范

### 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase.tsx | `UserCard.tsx`, `ActivityList.tsx` |
| 样式文件 | kebab-case.module.scss | `user-card.module.scss` |
| Hook 文件 | use + PascalCase.ts | `useUserData.ts`, `useOrderList.ts` |
| 工具函数 | camelCase.ts | `formatDate.ts`, `moneyUtils.ts` |
| 常量文件 | camelCase 或 UPPER_SNAKE_CASE | `orderStatus.ts`, `ROUTE_CONFIG.ts` |

### 变量/函数命名

```typescript
// ✅ API 请求函数：requestXxx 前缀，按操作类型区分
requestGetUserList()       // 查询
requestCreateOrder()       // 创建
requestUpdateActivity()    // 更新
requestDeleteCoupon()      // 删除

// ✅ 类型定义：PascalCase + 语义后缀
interface UserDTO {}          // 数据传输对象
interface CreateOrderReq {}   // 请求体
interface GetListResponse {}  // 响应体

// ✅ 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;

// ✅ 枚举：PascalCase（成员全大写）
enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
}

// ✅ Mobx Store：raw 前缀存原始接口数据，getter 处理派生数据
class UserStore {
  rawUserList: UserDTO[] = [];           // raw 前缀 = 接口原始数据
  get activeUsers() {                    // getter = 计算派生数据
    return this.rawUserList.filter(u => u.status === 'ACTIVE');
  }
}

// ✅ 布尔变量：is/has/can 前缀
isLoading, hasPermission, canSubmit

// ✅ 事件处理：handle 前缀
handleSubmit, handleClick, handleSearch
```

---

## 二、目录结构规范

```
packages/
  container/                   # 各端应用入口（只放页面、路由、端特有逻辑）
    pc/                        # PC 端应用
    app/                       # H5/移动端应用
    activity/                  # 活动页应用
  share/                       # 跨端共享代码（所有业务逻辑放这里）
    api/                       # ⚠️ 自动生成，禁止手动修改（apig/swagger生成）
    infrastructure/            # 基础设施（axios 封装、埋点 SDK、日志等）
    module/                    # 业务模块
      vm/                      # ViewModel 层（Mobx Store，业务逻辑）
      [module-name]/           # 按业务模块划分的组件/Hook
share-root/                    # 跨包共享的根级配置（eslint、tsconfig 等）
```

**调用方向（严格单向）**：

```
pages/views/（UI组件）
    ↓  useStore() / 自定义Hook
share/module/vm/（Mobx Store，业务逻辑）
    ↓  import API 函数
share/api/（⚠️ 自动生成层，禁止反向依赖）
```

❌ **禁止**：UI 组件跳过 vm/store 直接 import share/api/ 中的函数。

---

## 三、组件设计规范

### 文件内容顺序（必须按此顺序）

```tsx
// 1. import 语句（外部库 → 内部模块 → 样式）
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import styles from './user-card.module.scss';

// 2. interface / type 定义（Props 类型等）
interface UserCardProps {
  userId: string;
  onFollow?: () => void;
}

// 3. 组件实现
const UserCard: React.FC<UserCardProps> = observer(({ userId, onFollow }) => {
  // ...
});

// 4. export（具名或 default）
export default UserCard;
```

### 组件规则

```typescript
// ✅ 需要响应 Mobx 数据的组件：必须用 observer() 包裹
const UserList = observer(() => {
  const { userStore } = useStore();
  return <div>{userStore.activeUsers.map(...)}</div>;
});

// ❌ 忘记 observer：store 数据变化时组件不会重新渲染
const UserList = () => {
  const { userStore } = useStore();
  return <div>{userStore.activeUsers.map(...)}</div>; // 不会响应 store 变化！
};
```

**组件大小限制**：单个组件文件不超过 **300 行**，超过必须拆分为子组件或 Hook。

**Props 层数限制**：同一数据向下传递不超过 **3 层**，超过应改用 Mobx Store 或 React Context。

---

## 四、API 请求规范

### 核心规则

```typescript
// ✅ share/api/ 文件由 apig 工具自动生成，只能调用，不能修改
// 文件头通常包含 "// This file is auto-generated" 标注
import { requestGetUserList } from 'share/api/userApi';

// ✅ 在 Store（vm层）中调用 API，组件通过 useStore() 访问数据
class UserStore {
  rawUserList: UserDTO[] = [];

  async fetchUserList(params: GetUserListReq) {
    const res = await requestGetUserList(params);
    runInAction(() => {
      this.rawUserList = res.data.list;
    });
  }
}

// ❌ 禁止在 UI 组件中直接调用 API 函数
function UserPage() {
  useEffect(() => {
    requestGetUserList({ page: 1 }); // ❌ 组件层直接调 API，绕过 Store
  }, []);
}

// ❌ 禁止使用原生 fetch 或直接引入 axios
import axios from 'axios';            // ❌ 使用 @nibfe/we-utils 中的封装
fetch('/api/users');                   // ❌ 使用团队封装的请求方法
```

### 网络库

使用 `@nibfe/we-utils` 中封装的 axios 实例，不直接引入 axios 或 fetch。超时、鉴权、错误码处理均在基础拦截器中统一处理。

---

## 五、状态管理规范（Mobx）

**唯一状态方案**：Mobx 6.x。禁止引入 Redux、Zustand 等其他状态库。

```typescript
// ✅ Store 标准写法
import { makeAutoObservable, runInAction } from 'mobx';

class OrderStore {
  // 原始数据（raw 前缀）
  rawOrderList: OrderDTO[] = [];
  isLoading = false;
  error: Error | null = null;

  constructor() {
    makeAutoObservable(this);   // ✅ 必须在 constructor 中调用
  }

  // 派生数据用 getter（自动成为 computed）
  get pendingOrders() {
    return this.rawOrderList.filter(o => o.status === OrderStatus.PENDING);
  }

  // ✅ 异步操作：状态变更必须在 runInAction 内
  async fetchOrderList(params: GetOrderListReq) {
    this.isLoading = true;        // ✅ 同步赋值可以直接在 action 中做
    try {
      const res = await requestGetOrderList(params);
      runInAction(() => {          // ✅ await 后的状态变更必须在 runInAction 中
        this.rawOrderList = res.data.list;
        this.isLoading = false;
      });
    } catch (e) {
      runInAction(() => {
        this.error = e as Error;
        this.isLoading = false;
      });
    }
  }
}

// ❌ 错误：await 后直接赋值，Mobx strict mode 下报错
async fetchOrderList() {
  const res = await requestGetOrderList();
  this.rawOrderList = res.data.list;  // ❌ 必须放入 runInAction
}

// ✅ 通过 useStore() hook 获取 Store 实例
function OrderPage() {
  const { orderStore } = useStore();
  // ...
}

// ❌ 禁止在组件内直接 new Store（破坏单例）
function OrderPage() {
  const store = new OrderStore(); // ❌
}

// ❌ 禁止在 Store 外部直接修改 observable 属性
const { orderStore } = useStore();
orderStore.rawOrderList = [];    // ❌ 必须通过 Store 的 action 方法修改
```

---

## 六、样式规范

```scss
// ✅ 使用 CSS Modules，文件命名 kebab-case.module.scss
// user-card.module.scss
.container { ... }
.header { ... }
.title { ... }

// 在组件中引入
import styles from './user-card.module.scss';
<div className={styles.container}>

// ❌ 禁止内联 style（纯静态值）
<div style={{ color: 'red', fontSize: 14 }}>  // ❌

// ✅ 动态值允许内联（需要 JS 计算的才内联）
<div style={{ width: `${progress}%` }}>       // ✅ 动态宽度

// ❌ 禁止全局 CSS 类名（容易污染）
import './user-card.css';   // ❌ 使用 .module.scss
```

---

## 七、注释规范

```typescript
// ✅ 公共函数/Hook 必须有 JSDoc 注释
/**
 * 获取用户订单列表
 * @param userId 用户 ID
 * @param pageSize 每页数量，默认 20
 * @returns 订单列表，按创建时间倒序
 */
async function fetchUserOrders(userId: string, pageSize = 20): Promise<OrderDTO[]> { }

// ✅ 复杂业务逻辑注释"为什么"而不是"做什么"
// 活动结束后 24h 内仍可退款，超出后状态自动变为不可退
const canRefund = order.status === 'PAID' &&
  Date.now() - order.paidAt < 24 * 60 * 60 * 1000;

// ❌ 禁止注释掉的代码提交（需要用 git 找回）
// const oldLogic = calculateDiscount(amount);
```

---

## 八、测试规范

```
核心业务逻辑（金额计算、权限判断、状态流转）：建议覆盖
工具函数（utils/、constants/）：建议覆盖
纯展示组件：可选
自动生成代码（share/api/）：不需要测试

测试文件位置：同目录下 __tests__/ 或 *.test.ts
```

---

## 九、Git 提交规范

```
feat:     新功能
fix:      bug 修复
refactor: 重构（不影响功能，无新 bug）
perf:     性能优化
test:     测试相关
chore:    构建/工程/依赖更新
docs:     文档更新

示例：
  feat(activity): 新增活动创建页面
  fix(order): 修复退款金额计算精度问题
  refactor(user): 将用户信息 Store 拆分为独立模块
```

---

## 十、团队禁止事项（⚠️ 必须遵守）

以下 6 条是项目级强制禁令，违反任何一条视为 P0 问题：

| # | 禁止行为 | 正确做法 |
|---|---------|---------|
| ① | 手动修改 `share/api/` 中的自动生成文件 | 修改接口定义/生成器配置，重新执行生成命令 |
| ② | 引入 Redux 或其他状态库 | 使用 Mobx（已统一，不允许混用） |
| ③ | 将 React 升级到 18.x | 有 breaking change，升级需团队整体讨论决策 |
| ④ | 对金额字段直接做浮点运算 | 使用 `money-utils.ts`（`formatMoney`/`humanizeFrac`/`parseAmount`） |
| ⑤ | 在 Store 外部直接修改 observable 属性 | 通过 Store 的 action 方法或 `runInAction` 修改 |
| ⑥ | 在 `useEffect` 外直接写顶层 `await` | 封装成 `async function` 再在 `useEffect` 中调用 |

---

## 十一、团队 CR 专项规则（积分制）

> 以下规则来自团队 CR 积分体系，是与通用规范叠加的额外约束。

### 🔴 P0 专项（-10分/次，必须修改）

**① 禁止手动修改自动生成文件**

```javascript
// ❌ 禁止手动修改 api 2.0 / swagger 等工具自动生成的文件中的变量、枚举等
// 手动修改后，下次重新生成会覆盖，且审查人无法感知改动原因
// 例如：手动修改了 api2.0 生成的 UserStatus 枚举值
```

应对方案：若自动生成代码有误，修改接口定义或生成器配置，重新生成。

**② pnpm/yarn lock 文件大范围变更**

```
❌ lock 文件中内容大范围变动（超过 10 行实质变化）
    原因：node 或 pnpm/yarn 版本未锁定，导致 lock 文件版本不一致，引入未知依赖版本

✅ 检查方法：
    - lock 文件变动是否只限于新增的直接依赖？
    - 是否因 node/pnpm 版本变化导致全量重算？后者应拒绝合并，先对齐版本
```

---

### 🟡 P1 专项（-5分/次，强烈建议）

**③ 禁止滥用可选链（过度判空）**

```javascript
// ❌ 滥用：对一定存在的对象使用可选链，掩盖真实的类型问题
const name = this.currentUser?.name;     // 如果 currentUser 永远存在，? 是多余的
const id = response.data?.user?.id;      // 如果 API 规范保证 data 和 user 存在，? 掩盖了异常

// ✅ 对真正可能为空的值判空，对确定存在的值直接访问
const name = this.currentUser.name;       // 清晰表达：这里一定有值
const id = response.data.user?.id;        // 只有 id 字段不确定时才用 ?
```

**CR 检查点**：可选链 `?.` 的使用是否有充分理由？若某路径在类型系统中已确定非空，使用 `?.` 反而是 bug 隐患（应报错的地方被静默了）。

**④ 禁止空洞的异常重抛**

```javascript
// ❌ catch 后直接 throw，没有任何附加处理，不如不 catch
try {
  await saveOrder(data);
} catch (e) {
  throw e; // 完全没有意义，丢失了 catch 的机会
}

// ❌ 吞掉异常，调用方无从感知错误
try {
  await saveOrder(data);
} catch (e) {
  // 空 catch，错误消失了
}

// ✅ catch 要么处理（记录日志/兜底/转换错误类型），要么不写
try {
  await saveOrder(data);
} catch (e) {
  logger.error('保存订单失败', { orderId: data.id, error: e });
  throw new OrderSaveError('保存失败，请重试', { cause: e }); // 包装为业务异常
}
```

---

### 流程规则（-15分/次）

| 违规类型 | 说明 |
|---------|------|
| 自测不充分 | 提交 CR 后发现明显 bug，需重新提交 |
| 未解决 P0 问题强行合并 | 评审人标注 P0 未修改就合并 |
| 绕过 CR 合并主分支 | 未经评审直接合并 |
| 评审意见超 48 小时不回复 | — |
