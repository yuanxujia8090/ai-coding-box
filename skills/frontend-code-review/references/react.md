# React 框架编码规范

## 一、基础

- **【强制】** 除非需要在一个非 JSX 文件中初始化 React 应用，否则不要使用 `React.createElement()`。落地方式：CodeReview。
- **【建议】** 不要使用 mixins，建议以高阶组件的形式替代 mixins。落地方式：CodeReview。
- **【建议】** 不要使用 `isMounted()` 或引入类似 isMounted 中间状态来判断 React 组件生命周期状态，应该在合适的生命周期回调函数或 React Hooks 中做对应的事情。落地方式：CodeReview。
- **【建议】** 每个文件建议仅包含一个 React 组件——然而，在一个文件中包含多个没有 state 或纯组件是被容许的。落地方式：静态代码扫描。

## 二、组件创建

- **【建议】** 优先使用函数组件创建组件，其次考虑类组件。落地方式：CodeReview。
- **【强制】** 如果一个组件没有 state，必须使用函数组件创建，不允许使用类组件。落地方式：静态代码扫描。
- **【建议】** export 导出的组件不允许使用箭头函数创建——然而，在组件内部使用箭头函数创建临时组件是被允许的。落地方式：CodeReview。

```jsx
// 反面例子
export const MyComponent = () => { ... };

// 正面例子
export default function MyComponent() { ... }
```

## 三、命名

- **【强制】** 用帕斯卡或大驼峰命名法命名 React 组件文件，即首字母、单词首字符均大写，且首字符为字母 A-Z、不能为数字 0-9。落地方式：静态代码扫描。
- **【强制】** React 组件文件的文件扩展名为 .jsx 或 .tsx。落地方式：静态代码扫描。
- **【强制】** 用帕斯卡或大驼峰命名法命名组件类相关的引用、变量和导入导出，用小驼峰命名法命名组件实例。如果整个目录导出了一个组件类，并以 index.js（或 index.ts、index.jsx、index.tsx）作为入口文件，则组件类名称、目录名称、导入组件类的名称均应保持一致。落地方式：CodeReview/静态代码扫描。

```jsx
// 反面例子
import reservationCard from './ReservationCard';
const ReservationItem = <ReservationCard />;

// 正面例子
import ReservationCard from './ReservationCard';
const reservationItem = <ReservationCard />;
```

- **【强制】** 除高阶组件生成的组件类外，不要使用 displayName 来命名 React 组件类，而是使用引用来命名组件类。落地方式：CodeReview。
- **【强制】** 尽量避免使用 DOM 组件属性名命名其他组件属性，必须使用时应保证属性的作用与 DOM 组件中同名属性的作用一致。落地方式：CodeReview。
- **【建议】** 对于使用高阶组件生成的组件类，应当定义其 displayName，该名称由高阶组件的名称和传入的组件名称组合而成。落地方式：CodeReview。

## 四、对齐

- **【建议】** JSX 中，如果组件的属性适合在一行内写下（不超过项目设置的行最大长度），则将该组件写在一行内。否则以多行编写组件属性（确保每行一个属性），且所在的行增加一级缩进。另外，标签右尖括号或闭合符号单独一行，与标签左尖括号处于同一级缩进。落地方式：静态代码扫描（只限制最大行字符）。

```jsx
// 反面例子
<Foo superLongParam="bar"
     anotherSuperLongParam="baz" />

// 正面例子
<Foo
  superLongParam="bar"
  anotherSuperLongParam="baz"
/>
```

## 五、引号

- **【强制】** JSX 中的属性值使用双引号，其他情况使用单引号。落地方式：静态代码扫描。

```jsx
// 反面例子
<Foo bar='baz' />

// 正面例子
<Foo bar="baz" />
```

## 六、空格

- **【强制】** 在自闭合标签尾部保留一个空格。落地方式：静态代码扫描。

```jsx
// 反面例子
<Foo/>
<Foo                 />

// 正面例子
<Foo />
```

- **【强制】** 不要在 JSX 花括号内添加首尾空格。落地方式：静态代码扫描。

```jsx
// 反面例子
<Foo bar={ baz } />

// 正面例子
<Foo bar={baz} />
```

## 七、属性

- **【强制】** JSX 属性名使用小驼峰命名法。落地方式：静态代码扫描。
- **【强制】** 当属性值为 true 时，省略该属性的值。落地方式：静态代码扫描。

```jsx
// 反面例子
<Foo hidden={true} />

// 正面例子
<Foo hidden />
```

- **【强制】** `<img>` 标签总是添加 alt 属性。如果图片以 presentation 方式显示，alt 可为空字符串或者 `<img>` 要包含 role="presentation"。落地方式：静态代码扫描。
- **【强制】** 不要在 `<img>` 标签的 alt 属性中使用如 "image"、"photo"、"picture" 之类的词汇。落地方式：静态代码扫描。
- **【强制】** 避免使用数组的 index 来作为属性 key 的值，推荐使用唯一 ID。落地方式：静态代码扫描。
- **【强制】** 对于所有非必需的属性，总是手动定义 defaultProps 属性（使用函数组件时使用默认参数）。落地方式：CodeReview。
- **【建议】** 尽可能少地使用展开运算符传递属性（`{...props}`）。落地方式：CodeReview。

## 八、Refs

- **【强制】** 始终使用 useCallback 或 useRef 获取 ref，禁止使用字符串 ref。落地方式：静态代码扫描。

```jsx
// 反面例子
<Foo ref="myRef" />

// 正面例子
const myRef = useRef(null);
<Foo ref={myRef} />
```

## 九、Hooks

- **【强制】** Hooks 必须在函数组件或自定义 Hook 的顶层调用，不能在循环、条件或嵌套函数中调用。落地方式：静态代码扫描。
- **【强制】** 自定义 Hook 必须以 "use" 开头命名。落地方式：静态代码扫描。
- **【强制】** useEffect 的依赖数组必须包含所有响应式值（props、state 及其派生值）。落地方式：静态代码扫描。参考：[React 官方文档](https://react.dev/reference/react/useEffect)
- **【建议】** 避免在 useEffect 中执行不必要的副作用，保持副作用最小化。落地方式：CodeReview。

## 十、括号

- **【强制】** 当 JSX 标签超过一行时，用圆括号包裹。落地方式：静态代码扫描。

```jsx
// 反面例子
return <MyComponent variant="long body" foo="bar">
         <MyChild />
       </MyComponent>;

// 正面例子
return (
  <MyComponent variant="long body" foo="bar">
    <MyChild />
  </MyComponent>
);
```

- **【强制】** 当 JSX 标签只有一行时，不要用圆括号包裹。落地方式：静态代码扫描。

## 十一、函数

- **【强制】** 在 render 方法中，事件处理函数应该在 render 之前定义，不要在 render 中使用匿名函数。落地方式：CodeReview。
- **【建议】** 在 React 模块中，不要给所谓的内部函数（如 render）使用下划线前缀。落地方式：CodeReview。

## 十二、顺序

- **【建议】** 类组件中方法的推荐顺序：
  1. static 方法和属性
  2. constructor
  3. getChildContext
  4. componentWillMount / UNSAFE_componentWillMount
  5. componentDidMount
  6. componentWillReceiveProps / UNSAFE_componentWillReceiveProps
  7. shouldComponentUpdate
  8. componentWillUpdate / UNSAFE_componentWillUpdate
  9. componentDidUpdate
  10. componentWillUnmount
  11. 事件处理函数（如 onClickSubmit、onChangeDescription）
  12. render 中的 getter 方法（如 getSelectReason、getFooterContent）
  13. 可选的 render 方法（如 renderNavigation、renderProfilePicture）
  14. render

落地方式：CodeReview。
