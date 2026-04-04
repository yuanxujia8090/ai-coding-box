# 软件设计质量 CR 规则

> 本文关注"设计层"问题，不是代码写法错误，而是结构/职责/扩展性的设计缺陷。
> **关键原则**：只报告在 diff 中能找到具体证据的问题，禁止输出"请考虑重构"这类无依据的泛泛建议。
> 本文规则通常为 P1/P2；仅在性能问题导致用户可见卡顿、或鲁棒性缺陷必然触发时升为 P0。

---

## 📋 本文规则速查索引

| 章节 | 规则 | 级别 | 可检测信号 |
|------|------|------|-----------|
| §一.1 | 循环内重复 API 调用（N+1 问题）| P0/P1 | 循环体内有 `await fetch`/`axios`/`request` 调用 |
| §一.2 | 高频渲染路径的昂贵计算 | P1 | render 函数/组件体内有 `filter`/`map`/`sort` 且无 `useMemo` |
| §一.3 | 整包引入可摇树库 | P1 | `import _ from 'lodash'` 而非 `import debounce from 'lodash/debounce'` |
| §二.1 | 缺少边界条件处理 | P1 | 访问数组/对象前无空判断；未处理空数组/空对象情况 |
| §二.2 | 网络请求无超时保护 | P1 | `fetch`/`axios` 调用无 `timeout` 配置且非框架统一处理 |
| §二.3 | 缺 loading/error 状态 | P1 | 有异步请求但组件无对应 `isLoading`/`error` 状态管理 |
| §三.1 | 重复逻辑（DRY 违反）| P1 | 相似代码块 >10 行出现 3 次以上，可抽象为函数/Hook |
| §三.2 | Props 硬编码（可参数化）| P1 | 组件内有与业务强绑定的硬编码字符串/数字，应通过 props 传入 |
| §三.3 | 深层 Props Drilling | P2 | 同一数据通过 3 层以上组件 props 向下传递 |
| §四.1 | God Component | P1 | 单个组件 >300 行且承担多个不相关职责 |
| §四.2 | 业务逻辑泄漏到 UI 层 | P1 | 组件内直接有复杂条件判断/数据变换，未封装到 hook/service |
| §四.3 | Switch 类型分发（应用策略模式）| P2 | `switch(type)` 有 4 个以上 case 且会持续新增 |
| §五.1 | 跨层依赖 | P1 | UI 组件直接调用 service/store 的底层方法，绕过约定的调用层 |
| §五.2 | 类型定义位置错误 | P2 | 业务类型定义散落在 component 文件内，而非 types/ 目录 |
| §六.1 | 魔法字符串（已在 JS 规范，此处补充业务场景）| P1 | 路由路径/事件名/状态值硬编码为字符串字面量 |
| §六.2 | 配置与逻辑耦合 | P1 | 枚举值/阈值/开关等配置项散落在业务逻辑中，无法独立修改 |
| §七.1 | await 后未用 runInAction | P0 | Store async 方法中 `await` 后有 `this.xxx =` 但无 `runInAction` |
| §七.2 | 使用 Mobx 数据缺少 observer | P1 | 组件有 `useStore()` 但函数定义没有 `observer(` 包裹 |
| §七.3 | Store 外直接修改 observable | P1 | 组件/Hook 中有 `someStore.xxx =` 赋值语句 |

---

## 一、性能陷阱（可在 diff 中检测）

### 1.1 循环内重复 API 调用（N+1 问题）

```typescript
// ❌ N+1：有 N 个 userId 就发 N 个请求，数据量大时页面直接卡死
async function renderUserList(userIds: string[]) {
  for (const id of userIds) {
    const user = await getUserById(id);  // ← 循环内 await
    renderUser(user);
  }
}

// ❌ 同样问题，forEach + async 更隐蔽
userIds.forEach(async (id) => {
  const user = await getUserById(id);   // ← forEach 不会 await，且并发量不受控
});

// ✅ 批量接口 or Promise.all 并发
async function renderUserList(userIds: string[]) {
  // 方案1：使用批量接口（首选）
  const users = await getUsersByIds(userIds);

  // 方案2：Promise.all 并发（无批量接口时），注意限制并发数
  const users = await Promise.all(userIds.map(id => getUserById(id)));
  users.forEach(renderUser);
}
```

**CR 检查点**：循环体（`for`/`forEach`/`map`）内是否有 `await` 调用 API？若有且无法改为批量，至少用 `Promise.all`，并评估并发量是否可控。

---

### 1.2 高频渲染路径的昂贵计算

```tsx
// ❌ 每次 render 都执行 filter+sort，列表很长时每次交互都卡
function ProductList({ products, category }) {
  const filtered = products
    .filter(p => p.category === category)  // ← render 内直接计算
    .sort((a, b) => b.price - a.price);

  return <ul>{filtered.map(p => <ProductItem key={p.id} {...p} />)}</ul>;
}

// ✅ useMemo 缓存，只在依赖变化时重新计算
function ProductList({ products, category }) {
  const filtered = useMemo(
    () => products.filter(p => p.category === category).sort((a, b) => b.price - a.price),
    [products, category]  // ← 明确依赖
  );

  return <ul>{filtered.map(p => <ProductItem key={p.id} {...p} />)}</ul>;
}
```

**CR 检查点**：render 函数/组件体内，对大数组的 `filter`/`map`/`sort`/`reduce` 是否有 `useMemo` 包裹？如果数据量可控（<50条）且交互不频繁，P2 可选；数据量大或交互频繁，升为 P1。

---

### 1.3 整包引入可摇树的库

```typescript
// ❌ 整包引入 lodash，bundle 增加 72KB
import _ from 'lodash';
const result = _.debounce(fn, 300);

// ❌ 整包引入 date-fns
import dateFns from 'date-fns';

// ✅ 按需引入，tree-shaking 生效
import debounce from 'lodash/debounce';
import { format } from 'date-fns';
```

---

## 二、鲁棒性（防御性编程）

### 2.1 边界条件缺失

```typescript
// ❌ 未处理空数组、null、undefined 的边界情况
function getTopProduct(products: Product[]) {
  return products.sort((a, b) => b.sales - a.sales)[0].name;
  //                                                  ^^^ 空数组时 [0] 是 undefined！
}

function renderUserName(user: User) {
  return user.profile.nickname.trim();
  //          ^^^^^^^ user 或 profile 为 null 时直接崩溃
}

// ✅ 明确处理边界
function getTopProduct(products: Product[]) {
  if (!products.length) return null;  // 或 return '暂无商品'
  return products.sort((a, b) => b.sales - a.sales)[0].name;
}

function renderUserName(user: User | null) {
  return user?.profile?.nickname?.trim() ?? '匿名用户';
}
```

**CR 检查点**：函数的入参是否可能为空/空数组/undefined？是否有对应的边界处理？特别关注：数组 `[0]` 访问前是否有长度判断、链式属性访问是否有 `?.` 或前置判空。

---

### 2.2 异步请求缺 loading/error 状态

```tsx
// ❌ 没有 loading 和 error 状态，用户无反馈，出错时白屏
function UserPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser);
    // ❌ 没有 catch，没有 loading 控制
  }, []);

  return <div>{user?.name}</div>; // user 为 null 时没有任何提示
}

// ✅ 完整的状态管理
function UserPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUser()
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <div>{user?.name}</div>;
}
```

---

## 三、复用性（DRY 原则）

### 3.1 重复逻辑块

```tsx
// ❌ 两个页面几乎完全相同的逻辑，只有 API 不同
// ActivityPage.tsx
const [list, setList] = useState([]);
const [loading, setLoading] = useState(false);
useEffect(() => {
  setLoading(true);
  fetchActivityList().then(setList).finally(() => setLoading(false));
}, []);

// CouponPage.tsx（完全复制粘贴）
const [list, setList] = useState([]);
const [loading, setLoading] = useState(false);
useEffect(() => {
  setLoading(true);
  fetchCouponList().then(setList).finally(() => setLoading(false));
}, []);

// ✅ 抽象为通用 Hook
function useList<T>(fetcher: () => Promise<T[]>) {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetcher().then(setList).finally(() => setLoading(false));
  }, [fetcher]);
  return { list, loading };
}

// 使用
const { list, loading } = useList(fetchActivityList);
```

**CR 检查点**：diff 中是否有 >10 行的相似代码块出现 **3 次以上**？不要求完全相同，核心逻辑相同、只有少量参数不同，就应当抽象。2次重复可提 P2，3次及以上升为 P1。

---

### 3.2 Props 硬编码（可参数化但未参数化）

```tsx
// ❌ 按钮颜色、文案硬编码，组件无法复用
function SubmitButton() {
  return (
    <button style={{ background: '#1890ff', color: '#fff' }}>
      提交活动
    </button>
  );
}

// ✅ 通过 props 控制，组件可复用
interface ButtonProps {
  label: string;
  color?: string;
  onClick?: () => void;
}
function SubmitButton({ label, color = '#1890ff', onClick }: ButtonProps) {
  return <button style={{ background: color }} onClick={onClick}>{label}</button>;
}
```

---

## 四、设计模式

### 4.1 God Component（上帝组件）

**检测信号**：单个组件文件 >300 行，且包含多个不相关的业务逻辑块。

```tsx
// ❌ 一个组件同时处理：表单验证 + API 请求 + 数据转换 + 权限判断 + 渲染
// ActivityCreatePage.tsx (500行)
function ActivityCreatePage() {
  // 表单状态（50行）
  // 权限校验逻辑（40行）
  // 图片上传处理（60行）
  // API 提交逻辑（80行）
  // 数据转换（30行）
  // JSX渲染（200行）
}

// ✅ 职责拆分
function ActivityCreatePage() {      // 只负责编排，<100行
  const form = useActivityForm();     // 表单逻辑
  const upload = useImageUpload();    // 上传逻辑
  const submit = useActivitySubmit(); // 提交逻辑
  return <ActivityCreateView form={form} upload={upload} submit={submit} />;
}
```

**CR 检查点**：diff 中新增的组件或大幅修改的组件，是否承担了超过 2 个不相关职责（数据获取、数据转换、业务逻辑、UI渲染）？

---

### 4.2 业务逻辑泄漏到 UI 层

```tsx
// ❌ 组件内直接处理复杂业务计算
function OrderCard({ order }) {
  // 这段折扣计算逻辑属于业务层，不应该在 UI 组件里
  const discount = order.memberLevel === 'VIP'
    ? order.amount * 0.8
    : order.couponIds.length > 0
      ? order.amount - order.couponDiscount
      : order.amount;

  const statusText = order.status === 1 ? '待付款'
    : order.status === 2 ? '已付款'
    : order.status === 3 ? '已发货' : '未知状态';

  return <div>{statusText}: ¥{discount}</div>;
}

// ✅ 业务逻辑封装到 hook 或 util
function useOrderDisplay(order: Order) {
  const discount = calculateOrderDiscount(order);   // utils/orderUtils.ts
  const statusText = getOrderStatusText(order.status); // constants/orderStatus.ts
  return { discount, statusText };
}

function OrderCard({ order }) {
  const { discount, statusText } = useOrderDisplay(order);
  return <div>{statusText}: ¥{discount}</div>;
}
```

---

### 4.3 Switch 类型分发（考虑策略模式）

```typescript
// ❌ switch 随业务增长不断膨胀，每次新增类型都要改这里
function renderWidget(type: string, data: any) {
  switch (type) {
    case 'banner': return <BannerWidget data={data} />;
    case 'coupon': return <CouponWidget data={data} />;
    case 'activity': return <ActivityWidget data={data} />;
    case 'product': return <ProductWidget data={data} />;
    // 每次新增类型都要改这里 → 违反开闭原则
  }
}

// ✅ 策略模式：新增类型只需注册，不修改调度逻辑
const widgetRegistry: Record<string, React.ComponentType<any>> = {
  banner: BannerWidget,
  coupon: CouponWidget,
  activity: ActivityWidget,
  product: ProductWidget,
};

function renderWidget(type: string, data: any) {
  const Widget = widgetRegistry[type];
  if (!Widget) return <FallbackWidget />;
  return <Widget data={data} />;
}
```

**CR 检查点**：`switch` 或 `if-else if` 链是否有 4 个以上分支，且明确会持续新增 case？建议抽象为 Map/Registry。这是 P2，不强制，但应指出扩展风险。

---

## 五、架构边界

### 5.1 跨层依赖

**项目约定的调用方向（单向，不可反转）**：

```
pages/views/（UI组件）
    ↓  useStore() / 自定义Hook
share/module/vm/（Mobx Store，承载所有业务逻辑）
    ↓  import requestXxx 函数
share/api/（⚠️ apig自动生成，禁止手动修改，禁止被组件层直接引用）
```

```typescript
// ❌ UI 组件跳过 Store 直接调用 API 层（P1）
// packages/container/pc/src/pages/UserPage.tsx
import { requestGetUserList } from 'share/api/userApi';   // ← 组件直接 import API 层

function UserPage() {
  useEffect(() => {
    requestGetUserList({ page: 1 }).then(setList);  // ❌ 绕过了 Store 层
  }, []);
}

// ✅ 组件通过 useStore() → Store.action → API 的标准链路
// packages/container/pc/src/pages/UserPage.tsx
import { useStore } from '@/hooks/useStore';
import { observer } from 'mobx-react-lite';

const UserPage = observer(() => {
  const { userStore } = useStore();                  // ✅ 通过 Store 访问

  useEffect(() => {
    userStore.fetchUserList({ page: 1 });            // ✅ 调用 Store action
  }, []);

  return <UserList users={userStore.activeUsers} />;
});

// ❌ Store 层（vm/）反向 import UI 组件（循环依赖）
// share/module/vm/userStore.ts
import UserCard from 'packages/container/pc/src/components/UserCard'; // ❌ 禁止
```

**CR 检查点**：
- `packages/container/` 下的组件文件是否直接 `import` 了 `share/api/` 中的函数？
- 组件是否用了 `observer()` 包裹（使用 Mobx 数据的组件必须有）？
- `share/module/vm/` 中的 Store 是否反向引用了 UI 组件？

---

## 六、可维护性

### 6.1 配置与逻辑耦合

```typescript
// ❌ 业务阈值散落在逻辑代码中，修改时需要全局搜索
function checkMemberLevel(points: number) {
  if (points >= 10000) return 'DIAMOND';
  if (points >= 5000) return 'GOLD';
  if (points >= 1000) return 'SILVER';
  return 'NORMAL';
}

// ❌ 请求超时、重试次数等散落各处
fetchData({ timeout: 5000, retries: 3 });
fetchOther({ timeout: 5000, retries: 3 }); // 重复的魔法数字

// ✅ 集中配置，逻辑与配置分离
// constants/memberConfig.ts
export const MEMBER_THRESHOLDS = {
  DIAMOND: 10000,
  GOLD: 5000,
  SILVER: 1000,
} as const;

export const REQUEST_DEFAULTS = {
  TIMEOUT: 5000,
  RETRIES: 3,
} as const;
```

---

## 七、Mobx 设计规则（本项目专项）

> 本项目强制使用 Mobx 6.x，以下问题是 diff 中可检测的 Mobx 设计缺陷。

### 7.1 await 后的状态变更未包裹 runInAction（P0）

```typescript
// ❌ Mobx strict mode 下报错：状态在 action 外被修改
class OrderStore {
  rawOrderList: OrderDTO[] = [];

  async fetchOrders() {
    const res = await requestGetOrderList();
    this.rawOrderList = res.data.list;   // ❌ await 后直接赋值，不在 action 中
  }
}

// ✅ await 后的赋值必须包裹在 runInAction 中
async fetchOrders() {
  const res = await requestGetOrderList();
  runInAction(() => {
    this.rawOrderList = res.data.list;   // ✅
  });
}
```

**快速识别**：Store class 内有 `async` 方法，且方法体中 `await` 之后有 `this.xxx =` 赋值但没有 `runInAction` 包裹。

### 7.2 使用 Mobx 数据的组件缺少 observer 包裹（P1）

```typescript
// ❌ 未包裹 observer，store 数据变化时组件不重渲染，产生数据不同步 bug
function OrderList() {
  const { orderStore } = useStore();
  return <ul>{orderStore.rawOrderList.map(...)}</ul>;  // 数据变了但界面不更新
}

// ✅
const OrderList = observer(() => {
  const { orderStore } = useStore();
  return <ul>{orderStore.rawOrderList.map(...)}</ul>;
});
```

**快速识别**：组件内有 `useStore()` 调用且访问了 store 属性，但组件函数定义处没有 `observer(` 包裹。

### 7.3 Store 外直接修改 observable 属性（P1）

```typescript
// ❌ 在组件或 Hook 中直接修改 store 属性，绕过 Mobx 的 action 机制
function UserCard() {
  const { userStore } = useStore();
  const handleClear = () => {
    userStore.rawUserList = [];    // ❌ 组件层直接赋值，绕过 action
  };
}

// ✅ 通过 Store 的 action 方法修改
class UserStore {
  clearUserList() {
    this.rawUserList = [];         // ✅ 在 Store action 内修改
  }
}

function UserCard() {
  const { userStore } = useStore();
  const handleClear = () => userStore.clearUserList(); // ✅
}
```

---

## 设计质量评估维度（整体评估时使用）

| 维度 | 检查信号 | 说明 |
|------|---------|------|
| 性能 | 有无 N+1、无 useMemo、整包引入 | 影响用户体验的直接因素 |
| 鲁棒性 | 边界处理、loading/error 状态 | 防止白屏/崩溃 |
| 复用性 | 重复代码块、硬编码 | 影响长期维护成本 |
| 职责清晰度 | God Component、业务逻辑在 UI 层 | 影响可读性和可测试性 |
| 架构合规 | 跨层依赖、类型定义位置 | 影响团队协作和扩展 |
| 可配置性 | 魔法数字/字符串、耦合配置 | 影响需求变更成本 |
