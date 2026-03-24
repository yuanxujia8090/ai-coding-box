# Vue 框架编码规范

## 一、原则

统一 Vue 代码的风格，为了回避错误、小纠结和反模式，制定了 Vue 项目的编码风格指南。

### 1.1 基础

- **【强制】** Vue 模版中标签的 attribute，必须始终带引号，并且强制使用双引号。
- **【强制】** Vue 文件的 Javascript 代码，每一行建议使用分号结束。
- **【强制】** 在 Prop 声明时候，其命名应该采用小驼峰命名规则，而在模版和 JSX 中始终应该采用连字符命名法。
- **【建议】** 在模版中只包含简单的表达式，复杂的表达式应该重构为计算属性或方法。
- **【建议】** 复杂的计算属性分割为尽可能多的更简单的属性。
- **【建议】** 避免隐性的父子组件通信，如在模版中使用 `this.$parent` 上的响应式数据，应该优先通过 prop 和事件进行父子组件之间的通信。
- **【建议】** 如果有全局状态管理的场景，避免使用 `this.$root` 和全局事件总线，应该优先采用 Vuex 管理全局状态。

### 1.2 样式

- **【建议】** 每个 Vue 组件的样式，建议设置 scoped、CSS Module 等来规范 Vue 组件中 CSS 样式的作用域。

## 二、Vue 框架规范

### 2.1 Template 模版规范

- **【强制】** 不要省略闭合标签。说明：需要符合 HTML 文档的规范。落地方式：静态代码扫描。

```html
<!-- 反面例子 -->
<ul>
  <li>item

<!-- 正面例子 -->
<ul>
  <li>item</li>
</ul>
```

- **【强制】** 当元素没有子元素时，应使用自闭合标签。落地方式：静态代码扫描。

```html
<!-- 反面例子 -->
<MyComponent></MyComponent>

<!-- 正面例子 -->
<MyComponent />
```

- **【强制】** 不要在循环模版中覆盖已声明的变量。说明：避免变量遮蔽。落地方式：静态代码扫描。

- **【强制】** 避免 v-if 和 v-for 一起作用于一个元素。说明：当 Vue 处理指令时，v-for 比 v-if 具有更高的优先级。落地方式：静态代码扫描。

```html
<!-- 反面例子 -->
<li v-for="user in users" v-if="user.isActive">
  {{ user.name }}
</li>

<!-- 正面例子 -->
<template v-for="user in users">
  <li v-if="user.isActive">
    {{ user.name }}
  </li>
</template>
```

- **【建议】** 禁止在模版中编写不符合 HTML 语法的标签形式。说明：编译器无法正常编译。落地方式：CodeReview。

- **【强制】** template 标签需要有具体的指令，不要出现空的 template。落地方式：静态代码扫描。

- **【建议】** 禁止向 slot 中传递多个参数，需要多个参数时以对象代替。落地方式：CodeReview。

- **【强制】** 模版中禁止使用 this。说明：避免出现箭头函数中 this 的静态绑定。落地方式：静态代码扫描。

- **【强制】** 模版中的标签属性使用连字符命名法的形式编写。落地方式：静态代码扫描。

```html
<!-- 反面例子 -->
<MyComponent myProp="value" />

<!-- 正面例子 -->
<MyComponent my-prop="value" />
```

- **【强制】** 用帕斯卡命名法命名组件。落地方式：CodeReview。

- **【强制】** 模版中组件的名称，采用帕斯卡命名法。落地方式：代码静态检查。

```html
<!-- 反面例子 -->
<my-component />
<myComponent />

<!-- 正面例子 -->
<MyComponent />
```

- **【建议】** 模版中的标签如果只有一行，则在该行闭合；如果有多行，则换行闭合。落地方式：CodeReview。

### 2.2 属性

- **【强制】** Prop 定义应该尽量详细，至少需要指定其类型。落地方式：静态代码扫描。

```javascript
// 反面例子
props: ['status']

// 正面例子
props: {
  status: {
    type: String,
    required: true,
  },
}
```

- **【强制】** 声明 Prop 时，命名应该始终使用小驼峰命名法，而在模版和 JSX 中应该始终使用连字符命名法。落地方式：静态代码扫描。
- **【建议】** 多个属性的元素应该分多行撰写，每个属性一行。落地方式：CodeReview。参考：[Vue 风格指南](https://cn.vuejs.org/style-guide/rules-strongly-recommended.html#multi-attribute-elements)

### 2.3 指令

- **【强制】** 使用指令缩写（用 `:` 表示 `v-bind:`，用 `@` 表示 `v-on:`，用 `#` 表示 `v-slot:`）。落地方式：静态代码扫描。

```html
<!-- 反面例子 -->
<input v-bind:value="value" v-on:input="onInput" />

<!-- 正面例子 -->
<input :value="value" @input="onInput" />
```

- **【强制】** v-for 必须设置 key 值，且 key 值必须唯一，禁止使用 index 作为 key。落地方式：静态代码扫描。

```html
<!-- 反面例子 -->
<li v-for="(item, index) in list" :key="index">

<!-- 正面例子 -->
<li v-for="item in list" :key="item.id">
```

- **【强制】** 禁止使用 v-html。说明：防止 XSS 攻击。落地方式：静态代码扫描。
- **【建议】** v-if / v-else-if / v-else 需要配合使用，v-else-if / v-else 前面必须有 v-if。落地方式：静态代码扫描。
- **【建议】** 当同一组 v-if 逻辑使用在多个元素上时，应该使用 `<template>` 包裹。落地方式：CodeReview。

### 2.4 组件声明

- **【强制】** 组件名应该始终是多个单词的（根组件 App 除外），以避免与现有或未来的 HTML 元素冲突。落地方式：静态代码扫描。

```javascript
// 反面例子
export default {
  name: 'Todo',
};

// 正面例子
export default {
  name: 'TodoItem',
};
```

- **【强制】** 组件的 data 必须是一个函数（Vue 2）。落地方式：静态代码扫描。

```javascript
// 反面例子
data: {
  count: 0,
}

// 正面例子
data() {
  return {
    count: 0,
  };
}
```

- **【建议】** 组件选项的顺序推荐如下：name → components → mixins → props → data → computed → watch → 生命周期钩子 → methods。落地方式：CodeReview。
