# 前端性能优化完全指南

## React性能优化

### 1. 组件重渲染优化

#### 原理
React组件在以下情况会重新渲染：
1. 组件自身的state变化
2. 父组件重渲染（默认会重渲染所有子组件）
3. Context值变化

#### 案例分析

**问题代码：**
```jsx
function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      <ExpensiveList items={items} /> {/* 每次count变化都重渲染 */}
    </div>
  );
}
```

**性能影响：**
- count每次+1，ExpensiveList都重渲染
- 如果ExpensiveList有1000个元素，每次重渲染耗时100ms
- 用户体验：点击按钮会卡顿

**解决方案1：React.memo**
```jsx
const ExpensiveList = React.memo(({ items }) => {
  console.log('ExpensiveList rendered');
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
});

// 现在只有items变化时才重渲染
```

**解决方案2：组件拆分**
```jsx
function App() {
  return (
    <div>
      <CounterSection />      {/* count变化只影响这里 */}
      <ExpensiveList items={items} />  {/* 不再受影响 */}
    </div>
  );
}

function CounterSection() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### 2. 虚拟滚动

#### 何时使用
- 列表项 > 100
- 每项渲染成本高

#### 实现方案

**react-window（推荐）**
```jsx
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index].name}
        </div>
      )}
    </FixedSizeList>
  );
}
```

**性能对比：**
- 普通渲染1000项：首次渲染500ms，内存占用50MB
- 虚拟滚动：首次渲染50ms，内存占用5MB
- **提升：10倍！**

[更多详细内容...]
