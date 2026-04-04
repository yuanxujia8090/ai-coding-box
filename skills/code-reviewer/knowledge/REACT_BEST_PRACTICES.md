# React CR 关键规则

> 只包含 ESLint 检测不到、需要 AI 语义理解的规则。格式规范由 Prettier 保障，不在此重复。

## 📋 本文规则速查索引

| 章节 | 规则 | 级别 | 快速识别特征 |
|------|------|------|------------|
| §一.1 | useEffect 依赖数组不完整 | P1 | deps 数组里缺少函数体内用到的变量 |
| §一.2 | 依赖外部可变变量（非 state/prop）| P1 | deps 数组里有模块级变量或 ref 以外的外部变量 |
| §一.3 | 子组件 callback 未 useCallback | P1 | 传给子组件的函数字面量每次渲染都是新引用 |
| §二 | key 使用数组 index | P0 | `key={index}` 在可排序/删除的列表中 |
| §三.1 | 无状态组件使用 class | P1 | 没有 state/生命周期的组件用 `class extends` |
| §三.2 | 直接展开 props | P1 | `<Component {...props} />` 不加筛选 |
| §三.3 | 生命周期方法用箭头函数 | P1 | `componentDidMount = () =>` 形式 |
| §四 | string ref | P0 | `ref="myRef"` 字符串形式（已废弃） |

---

## 一、Hooks 规则（🔴 P0 级别）

### 1.1 禁止在条件/循环/回调中调用 Hook

```jsx
// ❌ 条件中调用 Hook，破坏调用顺序
function UserProfile({ isLoggedIn }) {
  if (isLoggedIn) {
    const [data, setData] = useState(null); // 违规！
  }
}

// ✅ 始终在顶层调用，用条件控制逻辑
function UserProfile({ isLoggedIn }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);
}
```

### 1.2 useEffect 依赖数组必须完整

```jsx
// ❌ userId 在 effect 中使用但未声明为依赖
useEffect(() => {
  fetchUser(userId);
}, []); // userId 变化时不会重新执行

// ✅ 完整依赖
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// ⚠️ 特殊说明：ref、setState 是稳定引用，可以不加
const ref = useRef();
const [, setState] = useState();
useEffect(() => {
  ref.current = value; // ref 可以不加
  setState(x);         // setState 可以不加
}, [value]);
```

### 1.3 禁止引用外部变量作为 Hook 依赖

```jsx
// ❌ externalConfig 是模块级变量，不是响应式值，加入依赖毫无意义且可能内存泄露
const externalConfig = { timeout: 5000 };
useEffect(() => {
  startTimer(externalConfig.timeout);
}, [externalConfig]); // 危险！

// ✅ 只依赖 props、state 和组件内声明的变量
function Timer({ timeout }) {
  useEffect(() => {
    startTimer(timeout);
  }, [timeout]); // timeout 是 prop，是响应式值
}
```

### 1.4 传递给子组件的函数必须用 useCallback 包裹

```jsx
// ❌ 每次渲染都创建新函数引用，导致 React.memo 子组件失效
function Parent({ userId }) {
  const handleClick = () => onUserClick(userId); // 每次渲染都是新函数
  return <MemoChild onClick={handleClick} />;
}

// ✅ 稳定引用
function Parent({ userId }) {
  const handleClick = useCallback(() => onUserClick(userId), [userId]);
  return <MemoChild onClick={handleClick} />;
}
```

---

## 二、Key 属性规则（🔴 P0 级别）

### 2.1 禁止使用数组索引作为 key

```jsx
// ❌ 数组重排时，有内部状态的元素会错位
{items.map((item, index) => (
  <Input key={index} defaultValue={item.name} />
))}

// ✅ 使用唯一 ID
{items.map((item) => (
  <Input key={item.id} defaultValue={item.name} />
))}

// ✅ 没有唯一 ID 时，使用 uuid 生成
import { v4 as uuid } from 'uuid';
const itemsWithId = items.map(item => ({ ...item, _key: uuid() }));
```

---

## 三、组件设计规则（🟡 P1 级别）

### 3.1 无 state 的组件必须是函数组件

```jsx
// ❌ 没有 state，却用类组件
class Title extends React.Component {
  render() {
    return <h1>{this.props.text}</h1>;
  }
}

// ✅ 函数组件
const Title = ({ text }) => <h1>{text}</h1>;
```

### 3.2 导出组件禁止用箭头函数

```jsx
// ❌ 匿名箭头函数导出，DevTools 中显示为 Anonymous
export default () => <div>Hello</div>;

// ✅ 具名函数导出，调试时组件名清晰
export default function UserCard({ user }) {
  return <div>{user.name}</div>;
}

// ✅ 或具名箭头函数
const UserCard = ({ user }) => <div>{user.name}</div>;
export default UserCard;
```

### 3.3 类组件生命周期方法禁止用箭头函数

```jsx
// ❌ 箭头函数声明生命周期，子类无法正确 override
class UserProfile extends React.Component {
  componentDidMount = () => {
    this.fetchData();
  }
}

// ✅ 普通方法
class UserProfile extends React.Component {
  componentDidMount() {
    this.fetchData();
  }
  // 事件处理可以用箭头函数（避免 bind）
  handleClick = () => this.setState({ clicked: true });
}
```

### 3.4 禁止展开传递 this.props（高阶组件除外）

```jsx
// ❌ 透传所有 props，包含不应传递的内部属性
class Button extends React.Component {
  render() {
    return <button {...this.props}>Click</button>; // 可能把不该传的 prop 传下去
  }
}

// ✅ 显式筛选需要的 props
class Button extends React.Component {
  render() {
    const { onClick, children, disabled } = this.props;
    return <button onClick={onClick} disabled={disabled}>{children}</button>;
  }
}
```

---

## 四、Refs 规则（🔴 P0 级别）

### 4.1 禁止使用字符串 ref

```jsx
// ❌ 字符串 ref 已废弃
class Comp extends React.Component {
  componentDidMount() {
    this.refs.input.focus(); // 危险！
  }
  render() {
    return <input ref="input" />;
  }
}

// ✅ 使用 useRef 或 createRef
function Comp() {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return <input ref={inputRef} />;
}
```

---

## 五、高频 CR 问题速查

| 问题 | 严重程度 | 快速识别 |
|------|---------|---------|
| useEffect 依赖数组不完整 | P1 | deps 数组比 effect 内使用的变量少 |
| 数组索引作 key | P0 | `key={index}` |
| 传子组件的函数没有 useCallback | P1 | `<Child onClick={() => ...} />` |
| 生命周期用箭头函数 | P1 | `componentDidMount = () =>` |
| 导出组件用匿名箭头函数 | P2 | `export default () =>` |
| props 展开传递 | P1 | `{...this.props}` 或 `{...props}` 传给 DOM 元素 |
| 条件/循环内调用 Hook | P0 | if/for 块内有 use 开头的调用 |
